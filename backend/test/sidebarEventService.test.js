const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createDatabase } = require("../src/database/client");
const { createMessagesRepository } = require("../src/database/messagesRepository");
const { createSidebarEventsRepository } = require("../src/database/sidebarEventsRepository");
const { createMessageService } = require("../src/services/messageService");
const { createSidebarEventService } = require("../src/services/sidebarEventService");

function createTempServices(testName) {
  const tempDir = path.resolve(__dirname, "tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const uniqueName = `${testName}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const databasePath = path.resolve(tempDir, `${uniqueName}.db`);
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
  fs.rmSync(`${databasePath}-wal`, { force: true });

  const db = createDatabase(databasePath);
  const sidebarEventsRepository = createSidebarEventsRepository(db);
  const sidebarEventService = createSidebarEventService(sidebarEventsRepository);
  const messagesRepository = createMessagesRepository(db);
  const messageService = createMessageService(messagesRepository, sidebarEventService);

  return {
    db,
    databasePath,
    sidebarEventsRepository,
    sidebarEventService,
    messageService
  };
}

function cleanupTempDatabase(db, databasePath) {
  db.close();
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-shm`, { force: true });
  fs.rmSync(`${databasePath}-wal`, { force: true });
}

test("suppresses duplicate sidebar snapshots and keeps changed unread count", () => {
  const context = createTempServices("sidebar-dedupe");

  try {
    const baseDate = new Date();
    const duplicateDate = new Date(baseDate.getTime() + 5 * 60 * 1000);
    const changedUnreadDate = new Date(baseDate.getTime() + 6 * 60 * 1000);
    const basePayload = {
      timestamp: baseDate.toISOString(),
      date: baseDate.toISOString().slice(0, 10),
      time: baseDate.toISOString().slice(11, 16),
      contactName: "+57 314 8769607",
      phoneNumber: "+57 314 8769607",
      previewText: "Ya quedo pago 1'750.000",
      previewType: "text",
      unreadCount: 1,
      visibleTimeLabel: "lunes",
      directionGuess: "incoming",
      capturedAt: baseDate.toISOString(),
      rawMeta: {
        source: "sidebar-test"
      }
    };

    const first = context.sidebarEventService.save(basePayload);
    const duplicate = context.sidebarEventService.save({
      ...basePayload,
      timestamp: duplicateDate.toISOString(),
      date: duplicateDate.toISOString().slice(0, 10),
      time: duplicateDate.toISOString().slice(11, 16),
      capturedAt: duplicateDate.toISOString()
    });
    const changedUnread = context.sidebarEventService.save({
      ...basePayload,
      timestamp: changedUnreadDate.toISOString(),
      date: changedUnreadDate.toISOString().slice(0, 10),
      time: changedUnreadDate.toISOString().slice(11, 16),
      unreadCount: 2,
      capturedAt: changedUnreadDate.toISOString()
    });

    const items = context.sidebarEventService.list({
      limit: 10,
      offset: 0,
      contact: "",
      reconciled: ""
    }).items;

    assert.equal(first.created, true);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.suppressed, true);
    assert.equal(changedUnread.created, true);
    assert.equal(items.length, 2);
  } finally {
    cleanupTempDatabase(context.db, context.databasePath);
  }
});

test("reconciles a recent sidebar snapshot when the full incoming message arrives", () => {
  const context = createTempServices("sidebar-reconcile");

  try {
    const sidebar = context.sidebarEventService.save({
      timestamp: "2026-07-11T20:10:00.000Z",
      date: "2026-07-11",
      time: "15:10",
      contactName: "Anderson",
      previewText: "Bueno mamor",
      previewType: "text",
      unreadCount: 1,
      visibleTimeLabel: "4:19 p. m.",
      directionGuess: "incoming",
      capturedAt: "2026-07-11T20:10:01.000Z",
      rawMeta: {
        source: "sidebar-test"
      }
    });

    const full = context.messageService.save({
      timestamp: "2026-07-11T20:11:00.000Z",
      date: "2026-07-11",
      time: "15:11",
      contactName: "Anderson",
      conversationType: "direct",
      message: "Bueno mamor",
      messageType: "text",
      direction: "incoming",
      capturedAt: "2026-07-11T20:11:01.000Z",
      rawMeta: {
        source: "full-message-test"
      }
    });

    const sidebarRow = context.sidebarEventsRepository.findById(sidebar.id);

    assert.equal(sidebar.created, true);
    assert.equal(full.created, true);
    assert.equal(Number(sidebarRow.reconciled_message_id), Number(full.id));
  } finally {
    cleanupTempDatabase(context.db, context.databasePath);
  }
});
