const { test, expect, irA, aceptarConfirmaciones, esperarEscritura, sembrarAnimales, esperarCierreDeModal } = require('./fixtures');

test('evento: registrar con ternero y madre, editar y eliminar', async ({ page, request, sesion }) => {
  aceptarConfirmaciones(page);
  const datos = await sembrarAnimales(request, sesion);
  await page.reload();

  await irA(page, 'Eventos');
  await page.getByText('＋ Nuevo').click();
  await page.getByPlaceholder('Ej: Vacunación contra fiebre aftosa').fill('Vacunación PWA');

  await page.getByText('Seleccionar terneros...').click();
  await page.getByText(new RegExp(`RP ${datos.rpTernero}`)).first().click();
  await page.getByText('Listo', { exact: true }).click();
  await esperarCierreDeModal(page);
  await page.getByText('Seleccionar madres...').click();
  await page.getByText(new RegExp(`RP ${datos.rpMadre}`)).first().click();
  await page.getByText('Listo', { exact: true }).click();
  await esperarCierreDeModal(page);

  const alta = esperarEscritura(page, '/eventos');
  await page.getByText('Registrar evento').click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText('Vacunación PWA')).toBeVisible();

  await page.getByText('Editar', { exact: true }).first().click();
  await page.getByPlaceholder('Descripción del evento').fill('Vacunación PWA editada');
  const edicion = esperarEscritura(page, '/eventos');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect(200).toBe((await edicion).status());
  await expect(page.getByText('Vacunación PWA editada')).toBeVisible();

  const baja = esperarEscritura(page, '/eventos');
  await page.getByText('Eliminar', { exact: true }).first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText('Vacunación PWA editada')).toHaveCount(0);
});

test('evento: sin animales no se registra', async ({ page, sesion }) => {
  await irA(page, 'Eventos');
  await page.getByText('＋ Nuevo').click();
  await page.getByPlaceholder('Ej: Vacunación contra fiebre aftosa').fill('Sin animales');
  await page.getByText('Registrar evento').click();
  await expect(page.getByText('Seleccioná al menos un ternero o una madre')).toBeVisible();
});
