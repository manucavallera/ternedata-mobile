const { test, expect, crearCuenta, entrar, esperarEscritura, PASSWORD, SECURITY_URL, BUSINESS_URL } = require('./fixtures');

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
