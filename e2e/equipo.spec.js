const { test, expect, crearCuenta, entrar, sql, firmarJwt, esperarEscritura, aceptarConfirmaciones,
  PASSWORD, SECURITY_URL, BUSINESS_URL } = require('./fixtures');

const abrirMas = async (page, item) => {
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText(item, { exact: true }).click();
};

test('equipo: invitar genera el link y se puede revocar', async ({ page, sesion }) => {
  aceptarConfirmaciones(page);
  await abrirMas(page, 'Equipo');
  await page.getByText('+ Invitar').click();
  await page.getByPlaceholder('email@ejemplo.com').fill(`inv_${Date.now()}@ternedata.test`);
  const alta = esperarEscritura(page, '/invitaciones/crear');
  await page.getByText('Generar', { exact: true }).click();
  expect([200, 201]).toContain((await alta).status());
  await expect(page.getByText(/Link de invitación/)).toBeVisible();
  await page.getByText('Listo', { exact: true }).click();

  await page.getByText(/^Pendientes/).click();
  const baja = esperarEscritura(page, '/invitaciones/revocar');
  await page.getByText('Revocar invitación').first().click();
  expect([200, 204]).toContain((await baja).status());
});

test('administración: el admin ve su campo y sus usuarios', async ({ page, sesion }) => {
  await abrirMas(page, 'Administración');
  await expect(page.getByText(sesion.establecimiento.nombre).last()).toBeVisible();
});

test('invitado: se registra con el código, entra como operario sin menú de admin', async ({ page, request }) => {
  const admin = await crearCuenta(request);
  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: admin.email, password: PASSWORD } });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const invitacion = await request.post(
    `${BUSINESS_URL}/invitaciones/crear/${admin.establecimiento.id_establecimiento}`,
    { headers, data: { rol: 'operario' } },
  );
  expect([200, 201]).toContain(invitacion.status());
  const { token } = await invitacion.json();

  // El invitado se registra con el código del link
  const email = `invitado_${Date.now()}@ternedata.test`;
  await page.goto('/');
  await page.getByText('Registrate').click();
  await page.getByPlaceholder('nombreusuario').fill(`inv${String(Date.now()).slice(-8)}`);
  await page.getByPlaceholder('email@gmail.com').last().fill(email);
  await page.getByPlaceholder('Contraseña', { exact: true }).last().fill(PASSWORD);
  await page.getByPlaceholder('Repetí la contraseña').fill(PASSWORD);
  await page.getByPlaceholder('Pegá tu código aquí...').fill(token);
  await page.getByText('Registrarse', { exact: true }).last().click();
  await expect(page.getByText(/Registro exitoso/)).toBeVisible();

  const fila = (await sql('SELECT id, rol, email_verificado FROM users WHERE email = $1', [email])).rows[0];
  expect(fila.rol).toBe('operario');
  if (!fila.email_verificado) await sql('UPDATE users SET email_verificado = true WHERE id = $1', [fila.id]);

  await entrar(page, { email, password: PASSWORD });
  await page.getByRole('tab', { name: /Más/ }).click();
  await expect(page.getByText('Equipo', { exact: true })).toBeVisible();
  await expect(page.getByText('Administración', { exact: true })).toHaveCount(0);
});
