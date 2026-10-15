const { test, expect, crearCuenta, entrar, sql, firmarJwt, PASSWORD, SECURITY_URL } = require('./fixtures');

const unico = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;

test('alta completa: registrarse, verificar el email, crear el campo y entrar', async ({ page }) => {
  const sufijo = unico();
  const email = `alta_${sufijo}@ternedata.test`;

  // Registro por la UI
  await page.goto('/');
  await page.getByText('Registrate').click();
  await page.getByPlaceholder('nombreusuario').fill(`alta${sufijo.slice(-8)}`);
  await page.getByPlaceholder('email@gmail.com').last().fill(email);
  await page.getByPlaceholder('Contraseña', { exact: true }).last().fill(PASSWORD);
  await page.getByPlaceholder('Repetí la contraseña').fill(PASSWORD);
  await page.getByText('Registrarse', { exact: true }).last().click();
  await expect(page.getByText(/Registro exitoso/)).toBeVisible();

  // Sin verificar no entra
  const fila = (await sql('SELECT id, email_verificado FROM users WHERE email = $1', [email])).rows[0];
  expect(fila.email_verificado).toBe(false);
  await page.goto('/');
  await page.getByPlaceholder('email@gmail.com').last().fill(email);
  await page.getByPlaceholder('Contraseña').last().fill(PASSWORD);
  await page.getByText('Ingresar', { exact: true }).last().click();
  await expect(page.getByText(/Verificá tu email/)).toBeVisible();

  // Link del mail
  const token = firmarJwt({ id: fila.id, email, type: 'verify' });
  await page.goto(`/auth/verify-email?token=${token}`);
  await expect.poll(async () => (await sql('SELECT email_verificado FROM users WHERE id = $1', [fila.id])).rows[0].email_verificado)
    .toBe(true);

  // Primer ingreso: pide crear el campo
  await page.goto('/');
  await page.getByPlaceholder('email@gmail.com').last().fill(email);
  await page.getByPlaceholder('Contraseña').last().fill(PASSWORD);
  await page.getByText('Ingresar', { exact: true }).last().click();
  await page.getByText('Creá tu establecimiento').waitFor();
  await page.getByPlaceholder('Ej: La Esperanza').fill('Campo Alta PWA');
  await page.getByText('Crear establecimiento').click();
  await expect(page.getByText('Inicio', { exact: true }).first()).toBeVisible();
});

test('registro: contraseñas distintas no avanzan', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Registrate').click();
  await page.getByPlaceholder('nombreusuario').fill('desparejo');
  await page.getByPlaceholder('email@gmail.com').last().fill(`x_${unico()}@ternedata.test`);
  await page.getByPlaceholder('Contraseña', { exact: true }).last().fill(PASSWORD);
  await page.getByPlaceholder('Repetí la contraseña').fill('OtraClave123');
  await page.getByText('Registrarse', { exact: true }).last().click();
  await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
});

test('recuperar contraseña: pedir el link, usarlo y entrar con la nueva', async ({ page, request }) => {
  const cuenta = await crearCuenta(request, { conEstablecimiento: false });
  const nueva = 'NuevaClave456';

  await page.goto('/');
  await page.getByText('¿Olvidaste tu contraseña?').click();
  await page.getByPlaceholder('email@gmail.com').last().fill(cuenta.email);
  await page.getByText('Enviar link').click();
  // El mail no sale en local (SMTP de prueba), pero el backend deja armado el reset.
  await expect.poll(async () =>
    (await sql('SELECT password_reset_jti FROM users WHERE email = $1', [cuenta.email])).rows[0].password_reset_jti,
  ).not.toBeNull();

  const fila = (await sql('SELECT id, password_reset_jti FROM users WHERE email = $1', [cuenta.email])).rows[0];
  const token = firmarJwt({ id: fila.id, email: cuenta.email, type: 'reset', jti: fila.password_reset_jti });
  await page.goto(`/auth/reset-password?token=${token}`);
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(nueva);
  await page.getByPlaceholder('Repetí la contraseña').fill(nueva);
  await page.getByText('Cambiar contraseña').click();
  await expect(page.getByText(/Contraseña actualizada/)).toBeVisible();

  // La anterior ya no sirve, la nueva sí
  const vieja = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: cuenta.password } });
  expect(vieja.status()).toBe(401);
  const nuevaLogin = await request.post(`${SECURITY_URL}/auth/login`, { data: { email: cuenta.email, password: nueva } });
  expect([200, 201]).toContain(nuevaLogin.status());

  // El link es de un solo uso
  const reuso = await request.post(`${SECURITY_URL}/auth/reset-password`, { data: { token, newPassword: 'OtraMas789' } });
  expect(reuso.status()).toBe(400);
});

test('perfil: muestra los datos y cerrar sesión vuelve al login', async ({ page, sesion }) => {
  page.on('dialog', (d) => d.accept());
  await page.getByRole('tab', { name: /Más/ }).click();
  await page.getByText('Perfil', { exact: true }).click();
  await expect(page.getByText('👤 Mi Perfil')).toBeVisible();
  await expect(page.locator('input').first()).toBeVisible();
  await page.getByText('Cerrar sesión').last().click();
  await expect(page.getByPlaceholder('email@gmail.com')).toBeVisible();

  // Sin sesión: recargar no entra solo
  await page.reload();
  await expect(page.getByPlaceholder('email@gmail.com')).toBeVisible();
});
