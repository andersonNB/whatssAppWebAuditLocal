const Database = require("better-sqlite3");
const { ensureDir } = require("../utils/fs");
const { CREATE_MESSAGES_TABLE_SQL, CREATE_SIDEBAR_EVENTS_TABLE_SQL, CREATE_INDEXES_SQL } = require("./schema");

function createDatabase(databasePath) {
  ensureDir(require("path").dirname(databasePath));

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(CREATE_MESSAGES_TABLE_SQL);
  db.exec(CREATE_SIDEBAR_EVENTS_TABLE_SQL);
  CREATE_INDEXES_SQL.forEach((statement) => db.exec(statement));
  return db;
}

module.exports = {
  createDatabase
};
