const { test, expect, irA, esperarEscritura, BUSINESS_URL, SECURITY_URL } = require('./fixtures');

// La pila de pantallas deja montadas (ocultas) las anteriores: se busca solo lo visible.
const ver = (locator) => locator.filter({ visible: true });

const haceDias = (n) => new Date(Date.now() - 3 * 3600e3 - n * 86400e3).toISOString().slice(0, 10);

// Vaca En Tambo que parió hace 60 días: está "OK" (apta para inseminar).
const sembrarVaca = async (request, cuenta) => {
  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: cuenta.password } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const params = { id_establecimiento: cuenta.establecimiento.id_establecimiento };
  const rp = 830000 + (Date.now() % 99999);
  const alta = await request.post(`${BUSINESS_URL}/madres/crear-madre`, {
    headers, params, data: { nombre: 'Lechera', rp_madre: rp, estado: 'En Tambo', fecha_nacimiento: '2021-03-10' },
  });
  expect([200, 201]).toContain(alta.status());
  const madre = await alta.json();
  const parto = await request.post(`${BUSINESS_URL}/tambo/eventos`, {
    headers, params, data: { id_madre: madre.id_madre, tipo: 'parto', fecha: haceDias(60) },
  });
  expect([200, 201]).toContain(parto.status());
  return { rp, madre, headers, params };
};

const abrirTambo = async (page) => {
  await irA(page, 'Más');
  await page.getByText('Rodeo lechero', { exact: true }).click();
  await expect(ver(page.getByText('🐄 Rodeo lechero'))).toBeVisible();
};

test('tambo: inseminar desde pendientes y tactar desde la vaca', async ({ page, request, sesion }) => {
  const { rp } = await sembrarVaca(request, sesion);
  await page.reload();
  await abrirTambo(page);

  // Vaca "OK": aparece en "OK para inseminar" y se carga la inseminación desde ahí.
  await expect(ver(page.getByText('OK', { exact: true }))).toBeVisible();
  await ver(page.getByText('OK para inseminar', { exact: true })).click();
  await expect(ver(page.getByText(new RegExp(`RP ${rp} · parió hace 60 días`)))).toBeVisible();
  await ver(page.getByText('Cargar evento para estas vacas')).click();
  await expect(ver(page.getByPlaceholder('Ej: 325, 328, 331'))).toHaveValue(String(rp));
  await ver(page.getByPlaceholder('Pajuela usada')).fill('Faraón');
  const insem = esperarEscritura(page, '/tambo/eventos');
  await ver(page.getByText('Guardar', { exact: true })).click();
  const resp = await insem;
  expect([200, 201]).toContain(resp.status());
  expect(resp.request().postDataJSON()).toMatchObject({ tipo: 'inseminacion', toro: 'Faraón' });
  await expect(ver(page.getByText('Inseminada', { exact: true }))).toBeVisible();

  // Tacto vacío desde la tarjeta de la vaca.
  await ver(page.getByText(new RegExp(`^RP ${rp}`))).click();
  await ver(page.getByText('Tacto / ecografía')).click();
  await ver(page.getByText('Vacía', { exact: true })).click();
  const tacto = esperarEscritura(page, '/tambo/eventos');
  await ver(page.getByText('Guardar', { exact: true })).click();
  expect([200, 201]).toContain((await tacto).status());
  // Vacía y pasada la espera: vuelve a estar OK para inseminar.
  await expect(ver(page.getByText('OK', { exact: true }))).toBeVisible();
  await expect(ver(page.getByText('Inseminada', { exact: true }))).toHaveCount(0);
});

test('tambo: caravana que no está en el rodeo no se guarda', async ({ page, request, sesion }) => {
  await sembrarVaca(request, sesion);
  await page.reload();
  await abrirTambo(page);
  await ver(page.getByText('+ Cargar evento')).click();
  await ver(page.getByPlaceholder('Ej: 325, 328, 331')).fill('999999');
  await ver(page.getByText('Guardar', { exact: true })).click();
  await expect(ver(page.getByText('No están en el rodeo: 999999'))).toBeVisible();
});

test('tambo: control lechero del día', async ({ page, request, sesion }) => {
  const { rp } = await sembrarVaca(request, sesion);
  await page.reload();
  await abrirTambo(page);
  await ver(page.getByText('🥛 Control lechero')).click();
  await ver(page.getByLabel(`Mañana RP ${rp}`)).fill('14,5');
  await ver(page.getByLabel(`Tarde RP ${rp}`)).fill('12');
  await expect(ver(page.getByText(/1 vacas · 26,5 L/))).toBeVisible();
  const guardado = esperarEscritura(page, '/tambo/controles');
  await ver(page.getByText('Guardar control')).click();
  expect([200, 201]).toContain((await guardado).status());
  await expect(ver(page.getByText(/Control guardado: 1 vacas/))).toBeVisible();

  // Más de 80 litros en un ordeñe no se manda.
  await ver(page.getByLabel(`Tarde RP ${rp}`)).fill('95');
  await ver(page.getByText('Guardar control')).click();
  await expect(ver(page.getByText(/Más de 80 litros/))).toBeVisible();
});

test('litros: guarda las vacas en tratamiento', async ({ page, sesion }) => {
  await irA(page, 'Más');
  await page.getByText('Litros de leche', { exact: true }).click();
  await page.getByPlaceholder('Ej: 1835').fill('1500');
  await page.getByPlaceholder('Ej: 58').fill('40');
  await page.getByPlaceholder('Leche que se descarta').fill('3');
  const alta = esperarEscritura(page, '/litros');
  await page.getByText('Registrar', { exact: true }).click();
  const resp = await alta;
  expect([200, 201]).toContain(resp.status());
  expect(resp.request().postDataJSON()).toMatchObject({ vacas_en_tratamiento: 3 });
});
