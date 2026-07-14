const express = require("express");
const { config } = require("./config");
const logger = require("./utils/logger");
const { createDatabase } = require("./database/client");
const { createMessagesRepository } = require("./database/messagesRepository");
const { createSidebarEventsRepository } = require("./database/sidebarEventsRepository");
const { createMessageService } = require("./services/messageService");
const { createSidebarEventService } = require("./services/sidebarEventService");
const { createExportService } = require("./services/exportService");
const { createMailService } = require("./services/mailService");
const { createMaintenanceService } = require("./services/maintenanceService");
const { createSchedulerService } = require("./services/schedulerService");
const { createRouter } = require("./api/routes");

function originIsAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.endsWith("*")) {
      return origin.startsWith(allowedOrigin.slice(0, -1));
    }

    return origin === allowedOrigin;
  });
}

function buildApp() {
  const db = createDatabase(config.storage.databasePath);
  const messagesRepository = createMessagesRepository(db);
  const sidebarEventsRepository = createSidebarEventsRepository(db);
  const sidebarEventService = createSidebarEventService(sidebarEventsRepository);
  const messageService = createMessageService(messagesRepository, sidebarEventService);
  const exportService = createExportService(messagesRepository, config.storage.exportDir);
  const mailService = createMailService(config.smtp, logger);
  const maintenanceService = createMaintenanceService({
    messagesRepository,
    sidebarEventsRepository,
    exportService,
    config,
    logger
  });
  const schedulerService = createSchedulerService({
    config,
    exportService,
    maintenanceService,
    mailService,
    logger
  });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use((request, response, next) => {
    const origin = request.headers.origin;

    if (originIsAllowed(origin, config.cors.allowedOrigins)) {
      response.setHeader("Access-Control-Allow-Origin", origin || "*");
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  });

  app.use(createRouter({
    messageService,
    sidebarEventService,
    exportService,
    maintenanceService,
    config,
    db
  }));

  app.use((error, _request, response, _next) => {
    const statusCode = error.message.includes("required") || error.message.includes("must be")
      ? 400
      : 500;

    logger.error("Request failed.", {
      message: error.message
    });

    response.status(statusCode).json({
      error: error.message
    });
  });

  return {
    app,
    schedulerService,
    db
  };
}

module.exports = {
  buildApp
};
