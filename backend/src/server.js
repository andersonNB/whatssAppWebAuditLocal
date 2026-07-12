const { buildApp } = require("./app");
const { config } = require("./config");
const logger = require("./utils/logger");

const { app, schedulerService, db } = buildApp();

const server = app.listen(config.app.port, config.app.host, () => {
  logger.info("Backend started.", {
    host: config.app.host,
    port: config.app.port,
    databasePath: config.storage.databasePath
  });
  schedulerService.start();
});

function shutdown(signal) {
  logger.info("Shutdown requested.", { signal });
  schedulerService.stop();
  server.close(() => {
    db.close();
    logger.info("Backend stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
