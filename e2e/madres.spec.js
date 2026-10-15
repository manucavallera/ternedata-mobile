const { test, expect, irA, aceptarConfirmaciones, esperarEscritura } = require('./fixtures');

const rpUnico = () => String(700000 + (Date.now() % 99999));

test('madre: crear, buscar, editar y eliminar', async ({ page, sesion }) => {
  aceptarConfirmaciones(page);
  const rp = rpUnico();

  await irA(page, 'Madres');
  await page.getByText('＋ Nueva').click();
  await page.getByPlaceholder('Ej: 717').fill(rp);
  await page.getByPlaceholder('Ej: Vaca María').fill('Vaca PWA');
  const alta = esperarEscritura(page, '/madres');
  await page.getByText('Guardar madre').click();
  expect([200, 201]).toContain((await alta).status());

  await expect(page.getByText('Vaca PWA')).toBeVisible();

  await page.getByPlaceholder('Buscar por nombre, RP...').fill(rp);
  await page.getByText('Buscar', { exact: true }).click();
  await expect(page.getByText('Vaca PWA')).toBeVisible();

  await page.getByText('Editar', { exact: true }).first().click();
  await page.getByPlaceholder('Nombre', { exact: true }).fill('Vaca PWA editada');
  const edicion = esperarEscritura(page, '/madres');
  await page.getByText('Guardar', { exact: true }).last().click();
  expect(200).toBe((await edicion).status());
  await expect(page.getByText('Vaca PWA editada')).toBeVisible();

  const baja = esperarEscritura(page, '/madres');
  await page.getByText('Eliminar', { exact: true }).first().click();
  expect([200, 204]).toContain((await baja).status());
  await expect(page.getByText('Vaca PWA editada')).toHaveCount(0);
});

test('madre: un RP repetido no se guarda', async ({ page, sesion }) => {
  aceptarConfirmaciones(page);
  const rp = rpUnico();

  const crear = async () => {
    await page.getByText('＋ Nueva').click();
    await page.getByPlaceholder('Ej: 717').fill(rp);
    const respuesta = esperarEscritura(page, '/madres');
    await page.getByText('Guardar madre').click();
    return (await respuesta).status();
  };

  await irA(page, 'Madres');
  expect([200, 201]).toContain(await crear());
  await page.waitForTimeout(500);
  if (await page.getByText('＋ Nueva').count() === 0) await page.getByText('← Volver').click();
  expect(await crear()).toBe(409);
});
