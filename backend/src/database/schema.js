const CREATE_MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_uid TEXT NOT NULL UNIQUE,
  chat_key TEXT NOT NULL,
  external_message_id TEXT,
  event_timestamp TEXT NOT NULL,
  message_date TEXT NOT NULL,
  message_time TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone_number TEXT,
  group_name TEXT,
  conversation_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_payload TEXT
);
`;

const CREATE_SIDEBAR_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sidebar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_uid TEXT NOT NULL UNIQUE,
  chat_key TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone_number TEXT,
  group_name TEXT,
  preview_text TEXT NOT NULL,
  preview_type TEXT NOT NULL,
  unread_count INTEGER NOT NULL,
  visible_time_label TEXT,
  direction_guess TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reconciled_message_id INTEGER,
  raw_payload TEXT,
  FOREIGN KEY (reconciled_message_id) REFERENCES messages(id)
);
`;

const CREATE_INDEXES_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_messages_chat_key ON messages(chat_key);",
  "CREATE INDEX IF NOT EXISTS idx_messages_event_timestamp ON messages(event_timestamp);",
  "CREATE INDEX IF NOT EXISTS idx_messages_contact_name ON messages(contact_name);",
  "CREATE INDEX IF NOT EXISTS idx_messages_phone_number ON messages(phone_number);",
  "CREATE INDEX IF NOT EXISTS idx_messages_group_name ON messages(group_name);",
  "CREATE INDEX IF NOT EXISTS idx_sidebar_events_chat_key ON sidebar_events(chat_key);",
  "CREATE INDEX IF NOT EXISTS idx_sidebar_events_captured_at ON sidebar_events(captured_at);",
  "CREATE INDEX IF NOT EXISTS idx_sidebar_events_reconciled_message_id ON sidebar_events(reconciled_message_id);"
];

module.exports = {
  CREATE_MESSAGES_TABLE_SQL,
  CREATE_SIDEBAR_EVENTS_TABLE_SQL,
  CREATE_INDEXES_SQL
};
