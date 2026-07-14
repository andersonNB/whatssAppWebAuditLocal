const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createDatabase } = require("../src/database/client");
const { createMessagesRepository } = require("../src/database/messagesRepository");
const { createSidebarEventsRepository } = require("../src/database/sidebarEventsRepository");
const { createExportService } = require("../src/services/exportService");
const { createMaintenanceService } = require("../src/services/maintenanceService");

function createTempContext(testName) {
  const tempDir = path.resolve(__dirname, "tmp");
  const uniqueName = `${testName}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const exportDir = path.resolve(tempDir, `${uniqueName}-exports`);
  const databasePath = path.resolve(tempDir, `${uniqueName}.db`);

  fs.mkdirSync(tempDir, { recursive: true });
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
  fs.rmSync(`${databasePath}-wal`, { force: true });
  fs.rmSync(exportDir, { force: true, recursive: true });

  const db = createDatabase(databasePath);
  const messagesRepository = createMessagesRepository(db);
  const sidebarEventsRepository = createSidebarEventsRepository(db);
  const exportService = createExportService(messagesRepository, exportDir);
  const logs = [];
  const maintenanceService = createMaintenanceService({
    messagesRepository,
    sidebarEventsRepository,
    exportService,
    config: {
      exports: { defaultFormat: "txt" },
      maintenance: { exportBeforePurge: true }
    },
    logger: {
      info(message, meta) {
        logs.push({ level: "info", message, meta });
      }
    }
  });

  return {
    db,
    logs,
    exportDir,
    databasePath,
    messagesRepository,
    sidebarEventsRepository,
    maintenanceService
  };
}

function cleanupTempContext(context) {
  context.db.close();
  fs.rmSync(context.databasePath, { force: true });
  fs.rmSync(`${context.databasePath}-shm`, { force: true });
  fs.rmSync(`${context.databasePath}-wal`, { force: true });
  fs.rmSync(context.exportDir, { force: true, recursive: true });
}

test("purgeAll exports current messages and clears both tables", async () => {
  const context = createTempContext("maintenance-purge");

  try {
    messagesRepositoryInsert(context.messagesRepository, {
      messageUid: "msg-1",
      chatKey: "contact:alice",
      externalMessageId: null,
      timestamp: "2026-07-13T12:00:00.000Z",
      date: "2026-07-13",
      time: "07:00",
      contactName: "Alice",
      phoneNumber: null,
      groupName: null,
      conversationType: "direct",
      message: "Hola",
      messageType: "text",
      direction: "incoming",
      status: null,
      capturedAt: "2026-07-13T12:00:01.000Z",
      rawPayload: "{}"
    });

    context.sidebarEventsRepository.insert({
      eventUid: "side-1",
      chatKey: "contact:alice",
      contactName: "Alice",
      phoneNumber: null,
      groupName: null,
      previewText: "Hola",
      previewType: "text",
      unreadCount: 1,
      visibleTimeLabel: "7:00 a. m.",
      directionGuess: "incoming",
      capturedAt: "2026-07-13T12:00:01.000Z",
      rawPayload: "{}"
    });

    const result = await context.maintenanceService.purgeAll();
    const exportedFiles = fs.readdirSync(context.exportDir);

    assert.equal(result.messagesDeleted, 1);
    assert.equal(result.sidebarDeleted, 1);
    assert.equal(context.messagesRepository.count({}), 0);
    assert.equal(context.sidebarEventsRepository.count({}), 0);
    assert.equal(exportedFiles.length, 1);
    assert.ok(result.exportedFilePath.endsWith(".txt"));
  } finally {
    cleanupTempContext(context);
  }
});

function messagesRepositoryInsert(repository, payload) {
  repository.insert(payload);
}
