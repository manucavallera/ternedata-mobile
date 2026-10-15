# Tests e2e de la PWA

Playwright contra la PWA exportada (`expo export --platform web`) y backends **locales**. Nunca contra producción.

## Qué hace falta

- PostgreSQL con el esquema de TerneData y las migraciones corridas (base `ganaderia_test`).
- `ms-nestjs-bussines` y `ms-nestjs-security` compilados y levantados apuntando a esa base
  (por defecto la PWA usa `http://localhost:3010` y `http://localhost:3011`).

## Correr

```bash
npm run build:e2e   # exporta la PWA a dist/ con los backends locales
npm run test:e2e    # levanta e2e/serve.js en :8081 y corre todos los specs
```

Variables (todas opcionales): `PWA_URL`, `BUSINESS_URL`, `SECURITY_URL`, `TEST_DB_URL`
(por defecto `postgres://postgres:postgres@localhost:5434/ganaderia_test`) y `JWT_SECRET`
(si no está, se lee de `../ms-nestjs-security/.env`).

## Cómo están armados

- Cada test crea su propia cuenta (`crearCuenta`) y la verifica por SQL: no comparten datos.
- Los links de los mails (verificar email, resetear contraseña) se firman con el `JWT_SECRET`, igual que
  los arma security, para no depender de una casilla real.
- `sembrarAnimales` da de alta una madre y un ternero por API cuando el flujo parte de animales existentes.
- Después de elegir algo en un modal hay que esperar su cierre (`esperarCierreDeModal`): el Modal de
  react-native-web termina la animación después del clic y lo que se escribe antes se pierde.

## Lo que no cubre

Mails reales, WhatsApp, y el comportamiento nativo de Android (botón atrás, red intermitente, sesión al
cerrar la app). Eso se prueba en un teléfono con el APK.
