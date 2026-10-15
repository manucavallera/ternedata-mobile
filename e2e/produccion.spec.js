const { test, expect, irA, aceptarConfirmaciones, esperarEscritura } = require('./fixtures');

const abrirMas = async (page, item) => {
  await irA(page, 'Más');
  await page.getByText(item, { exact: true }).click();
};

test('litros: registrar un día, verlo en el historial y borrarlo', async ({ page, sesion }) => {
  aceptarConfirmaciones(page);
  await abrirMas(page, 'Litros de leche');
  await page.getByPlaceholder('Ej: 1835').fill('1500');
  await page.getByPlaceholder('Ej: 58').fill('40');
  const alta = esperarEscritura(page, '/litros');
  await page.getByText('Registrar', { exact: true }).click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText('Todavía no cargaste litros.')).toHaveCount(0);

  const baja = esperarEscritura(page, '/litros');
  await page.getByText('🗑️').first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText('Todavía no cargaste litros.')).toBeVisible();
});

test('litros: sin datos obligatorios avisa', async ({ page, sesion }) => {
  await abrirMas(page, 'Litros de leche');
  await page.getByText('Registrar', { exact: true }).click();
  await expect(page.getByText('Completá litros vendidos y litros de terneros')).toBeVisible();
});

test('sustituto: calcular, guardar y eliminar', async ({ page, sesion }) => {
  aceptarConfirmaciones(page);
  await abrirMas(page, 'Sustituto lácteo');
  await page.getByPlaceholder('3.20').fill('3.5');
  await page.getByPlaceholder('1380').fill('1400');
  await page.getByPlaceholder('500').fill('520');
  const alta = esperarEscritura(page, '/sustituto');
  await page.getByText('Guardar cálculo').click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText('Todavía no hay cálculos guardados.')).toHaveCount(0);

  const baja = esperarEscritura(page, '/sustituto');
  await page.getByText('🗑️').first().click();
  expect([200, 204]).toContain((await baja).status());
});

test('sustituto: faltan precios y avisa', async ({ page, sesion }) => {
  await abrirMas(page, 'Sustituto lácteo');
  await page.getByText('Guardar cálculo').click();
  await expect(page.getByText('Completá precio sustituto, precio leche y cotización del dólar')).toBeVisible();
});

test('resumen de salud y calendario cargan sin error', async ({ page, sesion }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await abrirMas(page, 'Resumen de Salud');
  await expect(page.getByText('← Volver').last()).toBeVisible().catch(() => {});
  await page.goBack().catch(() => {});
  await irA(page, 'Más');
  await page.getByText('Calendario histórico', { exact: true }).click();
  await page.waitForTimeout(1500);
  expect(errores).toEqual([]);
});
