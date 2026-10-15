const { test, expect, irA, aceptarConfirmaciones, esperarEscritura, sembrarAnimales, esperarCierreDeModal } = require('./fixtures');

test('tratamiento: registrar, editar y eliminar', async ({ page, request, sesion }) => {
  aceptarConfirmaciones(page);
  await sembrarAnimales(request, sesion);
  await page.reload();

  await irA(page, 'Tratam');
  await page.getByText('＋ Nuevo').click();
  await page.getByText('Seleccionar ternero...').click();
  await page.getByText(/^#\d+ — /).first().click();
  await esperarCierreDeModal(page);
  await page.getByPlaceholder('Ej: Ivermectina, Oxitetraciclina').fill('Ivermectina PWA');
  const alta = esperarEscritura(page, '/tratamientos');
  await page.getByText('Registrar tratamiento').click();
  expect([200, 201]).toContain((await alta).status());

  await expect(page.getByText('Ivermectina PWA')).toBeVisible();

  await page.getByText('Editar', { exact: true }).first().click();
  await page.getByPlaceholder('Nombre del tratamiento').fill('Oxitetraciclina PWA');
  const edicion = esperarEscritura(page, '/tratamientos');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect(200).toBe((await edicion).status());
  await expect(page.getByText('Oxitetraciclina PWA')).toBeVisible();

  const baja = esperarEscritura(page, '/tratamientos');
  await page.getByText('Eliminar', { exact: true }).first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText('Oxitetraciclina PWA')).toHaveCount(0);
});

test('tratamiento: sin ternero no se registra', async ({ page, sesion }) => {
  await irA(page, 'Tratam');
  await page.getByText('＋ Nuevo').click();
  await page.getByPlaceholder('Ej: Ivermectina, Oxitetraciclina').fill('Sin ternero');
  await page.getByText('Registrar tratamiento').click();
  await expect(page.getByText('Seleccioná un ternero')).toBeVisible();
});
