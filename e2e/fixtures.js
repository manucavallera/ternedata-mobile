const base = require('@playwright/test');
const { Client } = require('pg');

const BUSINESS_URL = process.env.BUSINESS_URL || 'http://localhost:3010';
const SECURITY_URL = process.env.SECURITY_URL || 'http://localhost:3011';
const DB_URL = process.env.TEST_DB_URL || 'postgres://postgres:postgres@localhost:5434/ganaderia_test';
const PASSWORD = 'Test1234pwa';

const sql = async (consulta, params) => {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await client.query(consulta, params);
  } finally {
    await client.end();
  }
};

// Crea un usuario nuevo, lo verifica por SQL y le da un establecimiento. Devuelve credenciales e ids.
const crearCuenta = async (request, { conEstablecimiento = true } = {}) => {
  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `pwa_${sufijo}@ternedata.test`;
  const registro = await request.post(`${SECURITY_URL}/auth/register`, {
    data: { name: `PWA Test ${sufijo}`, email, password: PASSWORD },
  });
  base.expect([200, 201], 'registro').toContain(registro.status());
  await sql('UPDATE users SET email_verificado = true WHERE email = $1', [email]);

  const cuenta = { email, password: PASSWORD, nombre: `PWA Test ${sufijo}` };
  if (!conEstablecimiento) return cuenta;

  const login = await request.post(`${SECURITY_URL}/auth/login`, { data: { email, password: PASSWORD } });
  base.expect([200, 201], 'login').toContain(login.status());
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const alta = await request.post(`${BUSINESS_URL}/establecimientos`, {
    headers,
    data: { nombre: `Campo PWA ${sufijo}`, ubicacion: 'TEST', responsable: 'TEST' },
  });
  base.expect([200, 201], 'establecimiento').toContain(alta.status());
  return { ...cuenta, establecimiento: await alta.json() };
};

// Entra por la pantalla de login de la PWA.
const entrar = async (page, { email, password }) => {
  await page.goto('/');
  await page.getByPlaceholder('email@gmail.com').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);
  await page.getByText('Ingresar', { exact: true }).last().click();
  await page.getByText('Inicio', { exact: true }).first().waitFor();
};

const test = base.test.extend({
  // Cuenta nueva con establecimiento, ya dentro de la app.
  sesion: async ({ page, request }, use) => {
    const cuenta = await crearCuenta(request);
    await entrar(page, cuenta);
    await use(cuenta);
  },
});

module.exports = {
  test, expect: base.expect, crearCuenta, entrar, sql, BUSINESS_URL, SECURITY_URL, PASSWORD,
};

// Va a una pestaña de la barra inferior.
const irA = async (page, etiqueta) => {
  await page.getByRole('tab', { name: new RegExp(etiqueta) }).click();
};

// Acepta los window.confirm de la PWA (confirmar.js) y deja constancia del texto.
const aceptarConfirmaciones = (page) => {
  const textos = [];
  page.on('dialog', async (dialog) => {
    textos.push(dialog.message());
    await dialog.accept();
  });
  return textos;
};

// Espera la próxima escritura de la app contra el backend local.
const esperarEscritura = (page, fragmento) => page.waitForResponse((r) =>
  r.url().includes(fragmento) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.request().method()));

module.exports.irA = irA;
module.exports.aceptarConfirmaciones = aceptarConfirmaciones;
module.exports.esperarEscritura = esperarEscritura;

// Alta por API de datos previos (madre y ternero) en el establecimiento de la cuenta.
const sembrarAnimales = async (request, cuenta) => {
  const login = await request.post(`${SECURITY_URL}/auth/login`, {
    data: { email: cuenta.email, password: cuenta.password },
  });
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const params = { id_establecimiento: cuenta.establecimiento.id_establecimiento };
  const sufijo = Date.now() % 99999;
  const alta = async (path, data) => {
    const r = await request.post(BUSINESS_URL + path, { headers, params, data });
    base.expect([200, 201], `alta en ${path}`).toContain(r.status());
    return r.json();
  };
  const madre = await alta('/madres/crear-madre', {
    nombre: 'Madre Sembrada', rp_madre: 810000 + sufijo, estado: 'Seca', fecha_nacimiento: '2021-03-10',
  });
  const ternero = await alta('/terneros/crear-ternero', {
    rp_ternero: 820000 + sufijo, sexo: 'Macho', estado: 'Vivo', peso_nacer: 35,
    fecha_nacimiento: '2026-09-01', id_madre: madre.id_madre, semen: 'TEST', observaciones: 'TEST',
  });
  return { madre, ternero, rpMadre: 810000 + sufijo, rpTernero: 820000 + sufijo, headers, params };
};

module.exports.sembrarAnimales = sembrarAnimales;

// El Modal de react-native-web termina su animación de cierre después del clic: lo que se
// escribe antes se pierde. Una persona nunca es tan rápida; el test espera lo mismo que ella.
module.exports.esperarCierreDeModal = (page) => page.waitForTimeout(800);

// Los mails de verificación y de reset llevan un JWT firmado por security: se arma igual para no
// depender de la casilla.
const fs = require('fs');
const crypto = require('crypto');
const leerSecreto = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const env = fs.readFileSync(__dirname + '/../../ms-nestjs-security/.env', 'utf8');
  return env.match(/^JWT_SECRET=(.*)$/m)[1].trim();
};
module.exports.firmarJwt = (payload) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, iat: ahora, exp: ahora + 3600 })}`;
  return `${cuerpo}.${crypto.createHmac('sha256', leerSecreto()).update(cuerpo).digest('base64url')}`;
};
