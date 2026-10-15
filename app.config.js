// Permite apuntar el build a backends locales (tests e2e) sin tocar app.json.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    ...(process.env.TD_ENTORNO && {
      ENTORNO: process.env.TD_ENTORNO,
      MS_BUSINESS_API_URL_DESARROLLO: process.env.TD_BUSINESS_URL,
      MS_SECURITY_API_URL_DESARROLLO: process.env.TD_SECURITY_URL,
    }),
  },
});
