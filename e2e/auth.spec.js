const { test, expect, crearCuenta, entrar } = require('./fixtures');

test('login con credenciales correctas entra a la app', async ({ page, request }) => {
  const cuenta = await crearCuenta(request);
  await entrar(page, cuenta);
  await expect(page.getByText('Terneros', { exact: true }).first()).toBeVisible();
});

test('contraseña incorrecta muestra el error', async ({ page, request }) => {
  const cuenta = await crearCuenta(request);
  await page.goto('/');
  await page.getByPlaceholder('email@gmail.com').fill(cuenta.email);
  await page.getByPlaceholder('Contraseña').fill('Equivocada123');
  await page.getByText('Ingresar', { exact: true }).last().click();
  await expect(page.getByText('Credenciales incorrectas')).toBeVisible();
});

test('la sesión persiste al recargar', async ({ page, request }) => {
  const cuenta = await crearCuenta(request);
  await entrar(page, cuenta);
  await page.reload();
  await expect(page.getByText('Inicio', { exact: true }).first()).toBeVisible();
});
