const { test, expect, irA, aceptarConfirmaciones, esperarEscritura, sembrarAnimales } = require('./fixtures');

test('rodeo: crear y asignar un animal', async ({ page, request, sesion }) => {
  aceptarConfirmaciones(page);
  const datos = await sembrarAnimales(request, sesion);
  await page.reload();

  await irA(page, 'Rodeos');
  await page.getByText('+ Nuevo').click();
  await page.getByPlaceholder('Nombre del rodeo').fill('Rodeo PWA');
  const alta = esperarEscritura(page, '/rodeos');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText('Rodeo PWA')).toBeVisible();

  await page.getByText('🐄 Animales').first().click();
  await page.getByText(new RegExp(String(datos.rpTernero))).first().click();
  const asignar = esperarEscritura(page, '/rodeos/');
  await page.getByText('Asignar al rodeo').click();
  expect([200, 201]).toContain((await asignar).status());
});

test('rodeo: asignar sin elegir animales avisa', async ({ page, request, sesion }) => {
  await sembrarAnimales(request, sesion);
  await page.reload();
  await irA(page, 'Rodeos');
  await page.getByText('+ Nuevo').click();
  await page.getByPlaceholder('Nombre del rodeo').fill('Rodeo vacío');
  await page.getByText('Guardar', { exact: true }).last().click();
  await expect(page.getByText('Rodeo vacío')).toBeVisible();
  await page.getByText('🐄 Animales').first().click();
  await page.getByText('Asignar al rodeo').click();
  await expect(page.getByText('Seleccioná al menos un animal')).toBeVisible();
});
