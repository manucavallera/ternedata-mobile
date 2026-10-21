const { test, expect, crearCuenta, entrar, esperarEscritura, aceptarConfirmaciones, sql, PASSWORD, SECURITY_URL, BUSINESS_URL } = require('./fixtures');

// Cuenta nueva dueña de una forrajería (que arranca con el catálogo base).
const crearForrajeria = async (request) => {
  const cuenta = await crearCuenta(request, { conEstablecimiento: false });
  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: PASSWORD } });
  const alta = await request.post(`${BUSINESS_URL}/establecimientos`, {
    headers: { Authorization: `Bearer ${(await login.json()).token}` },
    data: { nombre: `Forrajeria PWA ${Date.now()}`, ubicacion: 'TEST', responsable: 'TEST', tipo_organizacion: 'forrajeria' },
  });
  expect([200, 201]).toContain(alta.status());
  return { ...cuenta, idEstablecimiento: (await alta.json()).id_establecimiento };
};

const abrirForrajeria = async (page) => {
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Forrajería', { exact: true }).click();
};

test('forrajería: cargar un producto y validar los datos obligatorios', async ({ page, request }) => {
  const cuenta = await crearCuenta(request, { conEstablecimiento: false });
  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: PASSWORD } });
  const alta = await request.post(`${BUSINESS_URL}/establecimientos`, {
    headers: { Authorization: `Bearer ${(await login.json()).token}` },
    data: { nombre: `Forrajeria PWA ${Date.now()}`, ubicacion: 'TEST', responsable: 'TEST', tipo_organizacion: 'forrajeria' },
  });
  expect([200, 201]).toContain(alta.status());

  await entrar(page, cuenta);
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Forrajería', { exact: true }).click();

  await page.getByText('+ Agregar producto').click();

  // Sin nombre no guarda
  await page.getByText('Guardar producto').click();
  await expect(page.getByText('Ingresá el nombre del producto')).toBeVisible();

  await page.getByPlaceholder('Nombre del producto').fill('Balanceado PWA');
  await page.getByPlaceholder('Precio').fill('1500');
  const guardado = esperarEscritura(page, '/forrajeria');
  await page.getByText('Guardar producto').click();
  expect([200, 201]).toContain((await guardado).status());
  await expect(page.getByText('Balanceado PWA')).toBeVisible();
});

test('forrajería: el dueño edita el precio, da de baja y reactiva un producto', async ({ page, request }) => {
  aceptarConfirmaciones(page);
  const cuenta = await crearForrajeria(request);
  await entrar(page, cuenta);
  await abrirForrajeria(page);

  // Viene con el catálogo base, sin precios.
  const producto = page.getByText('Fardo de alfalfa', { exact: true });
  await expect(producto).toBeVisible();
  const tarjeta = page.locator('div').filter({ has: producto }).filter({ hasText: 'Dar de baja' }).last();
  await expect(tarjeta.getByText('sin precio')).toBeVisible();

  await tarjeta.getByText('Editar', { exact: true }).click();
  await tarjeta.getByPlaceholder('Precio').fill('25000');
  const edicion = esperarEscritura(page, '/forrajeria/productos');
  await tarjeta.getByText('Guardar', { exact: true }).click();
  expect((await edicion).status()).toBe(200);
  await expect(page.getByText('Producto actualizado')).toBeVisible();
  await expect(page.getByText(/\$ 25\.000,00/)).toBeVisible();

  const baja = esperarEscritura(page, '/forrajeria/productos');
  await page.locator('div').filter({ has: page.getByText('Fardo de alfalfa', { exact: true }) }).filter({ hasText: 'Dar de baja' }).last()
    .getByText('Dar de baja', { exact: true }).click();
  expect((await baja).status()).toBe(200);
  await expect(page.getByText('Fardo de alfalfa', { exact: true })).toHaveCount(0);

  await page.getByText(/Mostrar dados de baja \(1\)/).click();
  const reactivar = esperarEscritura(page, '/forrajeria/productos');
  await page.getByText('Reactivar', { exact: true }).click();
  expect((await reactivar).status()).toBe(200);
  await expect(page.getByText('Fardo de alfalfa reactivado')).toBeVisible();
});

test('forrajería: un empleado ve el stock pero no edita precios ni saca mercadería', async ({ page, request }) => {
  const duenio = await crearForrajeria(request);
  const empleado = await crearCuenta(request, { conEstablecimiento: false });
  const { rows } = await sql("UPDATE users SET rol = 'operario', id_establecimiento = $2 WHERE email = $1 RETURNING id", [empleado.email, duenio.idEstablecimiento]);
  await sql('INSERT INTO user_establecimientos ("userId", "establecimientoId", rol) VALUES ($1, $2, $3)', [rows[0].id, duenio.idEstablecimiento, 'operario']);

  await entrar(page, empleado);
  await abrirForrajeria(page);
  await expect(page.getByText('Fardo de alfalfa', { exact: true })).toBeVisible();
  await expect(page.getByText('+ Agregar producto')).toHaveCount(0);
  await expect(page.getByText('Cargar catálogo base')).toHaveCount(0);
  await expect(page.getByText('Editar', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Salida', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Entrada', { exact: true }).first()).toBeVisible();
});

