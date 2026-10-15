const { test, expect, crearCuenta, entrar, sql, sembrarAnimales, irA } = require('./fixtures');

test('dashboard: los indicadores reflejan los animales cargados', async ({ page, request, sesion }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await sembrarAnimales(request, sesion);
  await page.reload();
  await irA(page, 'Inicio');
  await expect(page.getByText('Total terneros')).toBeVisible();
  await expect.poll(async () => (await page.locator('body').innerText())).toMatch(/1\s*\n\s*Total terneros/);
  expect(errores).toEqual([]);
});

test('aislamiento: otra cuenta no ve los animales ajenos', async ({ page, request, sesion }) => {
  const datos = await sembrarAnimales(request, sesion);
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Perfil', { exact: true }).click();
  page.on('dialog', (d) => d.accept());
  await page.getByText('Cerrar sesión').last().click();

  const otra = await crearCuenta(request);
  await entrar(page, otra);
  await irA(page, 'Terneros');
  await expect(page.getByText('Sin terneros')).toBeVisible();
  await expect(page.getByText(String(datos.rpTernero))).toHaveCount(0);
  await irA(page, 'Madres');
  await expect(page.getByText('Sin madres')).toBeVisible();
});

test('sin conexión: la app avisa y se recupera al volver la red', async ({ page, context, sesion }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await irA(page, 'Madres');
  await expect(page.getByText('Sin madres')).toBeVisible();

  await context.setOffline(true);
  await page.getByPlaceholder('Buscar por nombre, RP...').fill('123');
  await page.getByPlaceholder('Buscar por nombre, RP...').press('Enter');
  await expect(page.getByText('Error al cargar madres')).toBeVisible();
  // La pantalla sigue viva: se puede navegar a otra pestaña.
  await irA(page, 'Terneros');
  await irA(page, 'Madres');

  await context.setOffline(false);
  await page.getByPlaceholder('Buscar por nombre, RP...').press('Enter');
  await expect(page.getByText('Sin madres').filter({ visible: true })).toBeVisible();
  expect(errores).toEqual([]);
});

test('super_admin: ve la pestaña global del panel', async ({ page, request }) => {
  const cuenta = await crearCuenta(request);
  await sql("UPDATE users SET rol = 'super_admin' WHERE email = $1", [cuenta.email]);
  await entrar(page, cuenta);
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Administración', { exact: true }).click();
  await page.getByText('🌐 Global').click();
  await expect(page.getByText(/usuarios/i).first()).toBeVisible();
});

test('admin común no ve la pestaña global', async ({ page, sesion }) => {
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Administración', { exact: true }).click();
  await expect(page.getByText('🌐 Global')).toHaveCount(0);
});
