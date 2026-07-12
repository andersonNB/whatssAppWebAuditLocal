const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const BACKEND_DIR = path.resolve(ROOT_DIR, "backend");

function asBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true" || value === "1";
}

function asNumber(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const config = {
  app: {
    port: asNumber(process.env.PORT, 43177),
    host: process.env.HOST || "127.0.0.1"
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "moz-extension://*,http://localhost,http://127.0.0.1,https://web.whatsapp.com")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  },
  storage: {
    databasePath: process.env.DB_PATH || path.resolve(BACKEND_DIR, "data", "mensajes.db"),
    exportDir: process.env.EXPORT_DIR || path.resolve(BACKEND_DIR, "exports")
  },
  exports: {
    defaultFormat: process.env.DEFAULT_EXPORT_FORMAT || "xlsx",
    cronEnabled: asBoolean(process.env.EXPORT_CRON_ENABLED, false),
    cronExpression: process.env.EXPORT_CRON_EXPRESSION || "0 * * * *"
  },
  smtp: {
    enabled: asBoolean(process.env.SMTP_ENABLED, false),
    host: process.env.SMTP_HOST || "",
    port: asNumber(process.env.SMTP_PORT, 587),
    secure: asBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
    to: process.env.SMTP_TO || ""
  }
};

module.exports = {
  config,
  ROOT_DIR,
  BACKEND_DIR
};
