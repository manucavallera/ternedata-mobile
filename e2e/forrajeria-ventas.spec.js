const { test, expect, crearCuenta, entrar, esperarEscritura, aceptarConfirmaciones, sql, PASSWORD, SECURITY_URL, BUSINESS_URL } = require('./fixtures');

// Forrajería nueva (con catálogo base) y "Fardo de alfalfa" con precio y stock, cargados por API.
const prepararForrajeria = async (request) => {
  const cuenta = await crearCuenta(request, { conEstablecimiento: false });
  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: PASSWORD } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const alta = await request.post(`${BUSINESS_URL}/establecimientos`, {
    headers,
    data: { nombre: `Forrajeria Ventas ${Date.now()}`, ubicacion: 'TEST', responsable: 'TEST', tipo_organizacion: 'forrajeria' },
  });
  expect([200, 201]).toContain(alta.status());
  const idEstablecimiento = (await alta.json()).id_establecimiento;
  const params = { id_establecimiento: idEstablecimiento };

  const productos = await (await request.get(`${BUSINESS_URL}/forrajeria/productos`, { headers, params })).json();
  const fardo = productos.find((p) => p.nombre === 'Fardo de alfalfa');
  expect((await request.patch(`${BUSINESS_URL}/forrajeria/productos/${fardo.id_producto}`, { headers, params, data: { precio: 1000 } })).status()).toBe(200);
  const entrada = await request.post(`${BUSINESS_URL}/forrajeria/inventario/productos/${fardo.id_producto}/movimientos`, {
    headers, params, data: { tipo: 'entrada', cantidad: 50 },
  });
  expect([200, 201]).toContain(entrada.status());
  return { ...cuenta, idEstablecimiento, headers, params };
};

// La pila de pantallas deja montadas (ocultas) las anteriores: se busca solo lo visible.
const ver = (locator) => locator.filter({ visible: true });

const abrir = async (page, seccion) => {
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Forrajería', { exact: true }).click();
  await page.getByText(seccion, { exact: true }).click();
};

test('forrajería: el dueño carga un cliente, le vende a cuenta corriente y registra el pago', async ({ page, request }) => {
  aceptarConfirmaciones(page);
  const cuenta = await prepararForrajeria(request);
  await entrar(page, cuenta);

  // Alta de cliente desde la app
  await abrir(page, 'Clientes');
  await ver(page.getByText('+ Nuevo cliente')).click();
  await ver(page.getByText('Guardar cliente')).click();
  await expect(ver(page.getByText('Ingresá el nombre del cliente'))).toBeVisible();
  await ver(page.getByPlaceholder('Nombre', { exact: true })).fill('Juan Tambero');
  await ver(page.getByPlaceholder('Zona de reparto')).fill('Crespo');
  const altaCliente = esperarEscritura(page, '/forrajeria/contactos');
  await ver(page.getByText('Guardar cliente')).click();
  expect([200, 201]).toContain((await altaCliente).status());
  await expect(ver(page.getByText('Juan Tambero', { exact: true }))).toBeVisible();

  // Pedido nuevo desde la ficha del cliente
  await ver(page.getByText('Juan Tambero', { exact: true })).click();
  await ver(page.getByText('Nuevo pedido →')).click();
  await expect(ver(page.getByText('Juan Tambero', { exact: true }))).toBeVisible();
  await ver(page.getByPlaceholder('Buscar producto')).fill('fardo de alf');
  await ver(page.getByPlaceholder('fardo')).first().fill('3');
  await ver(page.getByText('Cuenta corriente', { exact: true })).click();
  await expect(ver(page.getByText('$3.000'))).toBeVisible();
  const altaPedido = esperarEscritura(page, '/forrajeria/pedidos');
  await ver(page.getByText('Crear pedido')).click();
  expect([200, 201]).toContain((await altaPedido).status());

  // Vuelve a la ficha: pedido pendiente, todavía no debe nada
  await expect(ver(page.getByText(/Pedido #\d+/))).toBeVisible();
  await expect(ver(page.getByText('Al día'))).toBeVisible();

  // Avanza el pedido hasta entregarlo
  await ver(page.getByText('← Volver')).click();
  await ver(page.getByText('← Volver')).click();
  await ver(page.getByText('Pedidos', { exact: true })).click();
  for (const accion of ['Confirmar', 'Preparar', 'Marcar listo', 'Entregar']) {
    const cambio = esperarEscritura(page, '/estado');
    await ver(page.getByText(accion, { exact: true })).click();
    expect((await cambio).status()).toBe(200);
  }
  await expect(ver(page.getByText('No hay pedidos pendientes de entregar.'))).toBeVisible();

  // Queda la deuda en la cuenta corriente
  await ver(page.getByText('← Volver')).click();
  await ver(page.getByText('Clientes', { exact: true })).click();
  await ver(page.getByText('Deudores', { exact: true })).click();
  await expect(ver(page.getByText('Juan Tambero', { exact: true }))).toBeVisible();
  await ver(page.getByText('Juan Tambero', { exact: true })).click();
  await expect(ver(page.getByText('Debe', { exact: true }))).toBeVisible();

  await ver(page.getByPlaceholder('Monto')).fill('3000');
  const cobro = esperarEscritura(page, '/pagos');
  await ver(page.getByText('Registrar pago')).click();
  expect([200, 201]).toContain((await cobro).status());
  await expect(ver(page.getByText('Al día'))).toBeVisible();
});

test('forrajería: un empleado toma pedidos pero no cancela ni cobra', async ({ page, request }) => {
  const duenio = await prepararForrajeria(request);
  const cliente = await request.post(`${BUSINESS_URL}/forrajeria/contactos`, {
    headers: duenio.headers, params: duenio.params, data: { tipo: 'cliente', nombre: 'Cliente Empleado' },
  });
  expect([200, 201]).toContain(cliente.status());

  const empleado = await crearCuenta(request, { conEstablecimiento: false });
  const { rows } = await sql("UPDATE users SET rol = 'operario', id_establecimiento = $2 WHERE email = $1 RETURNING id", [empleado.email, duenio.idEstablecimiento]);
  await sql('INSERT INTO user_establecimientos ("userId", "establecimientoId", rol) VALUES ($1, $2, $3)', [rows[0].id, duenio.idEstablecimiento, 'operario']);

  await entrar(page, empleado);
  await abrir(page, 'Pedidos');
  await ver(page.getByText('+ Nuevo pedido')).click();
  await ver(page.getByText('Cliente Empleado', { exact: true })).click();
  await ver(page.getByPlaceholder('Buscar producto')).fill('fardo de alf');
  await ver(page.getByPlaceholder('fardo')).first().fill('2');
  const altaPedido = esperarEscritura(page, '/forrajeria/pedidos');
  await ver(page.getByText('Crear pedido')).click();
  expect([200, 201]).toContain((await altaPedido).status());

  await expect(ver(page.getByText('Confirmar', { exact: true }))).toBeVisible();
  await expect(ver(page.getByText('Cancelar pedido'))).toHaveCount(0);

  await ver(page.getByText('Cliente Empleado', { exact: true })).first().click();
  await expect(ver(page.getByText('Cuenta corriente', { exact: true }))).toBeVisible();
  await expect(ver(page.getByText('Registrar pago'))).toHaveCount(0);
  await expect(ver(page.getByText('Editar', { exact: true }))).toHaveCount(0);
});
