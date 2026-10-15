const { test, expect, irA, aceptarConfirmaciones, esperarEscritura, sembrarAnimales, esperarCierreDeModal } = require('./fixtures');

test('diarrea: registrar episodio, editar y eliminar', async ({ page, request, sesion }) => {
  aceptarConfirmaciones(page);
  await sembrarAnimales(request, sesion);
  await page.reload();

  await irA(page, 'Más');
  await page.getByText(/Diarrea/).first().click();
  await page.getByText('+ Nuevo').click();
  await page.getByText('Seleccionar ternero...').click();
  await page.getByText(/^#\d+ — /).first().click();
  await esperarCierreDeModal(page);
  await page.getByText('Moderada', { exact: true }).last().click();
  await page.getByPlaceholder('Síntomas, tratamientos aplicados, estado general...').fill('Episodio PWA');
  const alta = esperarEscritura(page, '/diarrea');
  await page.getByText('Registrar episodio').click();
  expect([200, 201]).toContain((await alta).status());

  await expect(page.getByText('Moderada').first()).toBeVisible();

  await page.getByText('Editar', { exact: true }).first().click();
  await page.getByPlaceholder('Observaciones').fill('Episodio editado');
  const edicion = esperarEscritura(page, '/diarrea');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect(200).toBe((await edicion).status());

  const baja = esperarEscritura(page, '/diarrea');
  await page.getByText('Eliminar', { exact: true }).first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText('Sin episodios de diarrea')).toBeVisible();
});

test('diarrea: sin ternero ni severidad no se registra', async ({ page, sesion }) => {
  await irA(page, 'Más');
  await page.getByText(/Diarrea/).first().click();
  await page.getByText('+ Nuevo').click();
  await page.getByText('Registrar episodio').click();
  await expect(page.getByText('Seleccioná un ternero')).toBeVisible();
});
