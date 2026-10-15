const { test, expect, irA, aceptarConfirmaciones, esperarEscritura, sembrarAnimales } = require('./fixtures');

test('ternero: crear desde el formulario y verlo en el listado', async ({ page, sesion }) => {
  const rp = String(830000 + (Date.now() % 99999));
  await irA(page, 'Terneros');
  await page.getByText('+ Nuevo').click();
  await page.getByPlaceholder('Código RP del ternero').fill(rp);
  await page.getByPlaceholder('YYYY-MM-DD').first().fill('2026-09-10');
  await page.getByPlaceholder('Ej: 38.5').fill('36');
  const alta = esperarEscritura(page, '/terneros');
  await page.getByText('Crear ternero').click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText(rp).first()).toBeVisible();
});

test('ternero: peso, historial, edición y baja', async ({ page, request, sesion }) => {
  aceptarConfirmaciones(page);
  const datos = await sembrarAnimales(request, sesion);
  await page.reload();
  await irA(page, 'Terneros');
  await expect(page.getByText(String(datos.rpTernero)).first()).toBeVisible();

  // Peso diario
  await page.getByText('⚖️ Peso').first().click();
  await page.getByPlaceholder('Ej: 45.5').fill('41.5');
  const peso = esperarEscritura(page, '/terneros');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect([200, 201]).toContain((await peso).status());

  // Historial
  await page.getByText('📊 Historial').first().click();
  await expect(page.getByText('Nacimiento')).toBeVisible();
  await page.getByText('✕').click();

  // Edición
  await page.getByText('✏️ Editar').first().click();
  await page.getByPlaceholder('Observaciones').fill('Editado por PWA');
  const edicion = esperarEscritura(page, '/terneros');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect(200).toBe((await edicion).status());

  // Baja
  const baja = esperarEscritura(page, '/terneros');
  await page.getByText('🗑️ Eliminar').first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText(String(datos.rpTernero))).toHaveCount(0);
});
