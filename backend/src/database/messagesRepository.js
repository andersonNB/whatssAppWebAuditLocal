function createMessagesRepository(db) {
  const insertStatement = db.prepare(`
    INSERT INTO messages (
      message_uid,
      chat_key,
      external_message_id,
      event_timestamp,
      message_date,
      message_time,
      contact_name,
      phone_number,
      group_name,
      conversation_type,
      message_text,
      message_type,
      direction,
      status,
      captured_at,
      raw_payload
    ) VALUES (
      @messageUid,
      @chatKey,
      @externalMessageId,
      @timestamp,
      @date,
      @time,
      @contactName,
      @phoneNumber,
      @groupName,
      @conversationType,
      @message,
      @messageType,
      @direction,
      @status,
      @capturedAt,
      @rawPayload
    )
  `);

  const findByUidStatement = db.prepare("SELECT * FROM messages WHERE message_uid = ?");
  const findByIdStatement = db.prepare("SELECT * FROM messages WHERE id = ?");

  function buildListQuery(filters = {}) {
    const clauses = [];
    const params = {};

    if (filters.contact) {
      clauses.push("contact_name LIKE @contact");
      params.contact = `%${filters.contact}%`;
    }

    if (filters.direction) {
      clauses.push("direction = @direction");
      params.direction = filters.direction;
    }

    if (filters.type) {
      clauses.push("message_type = @type");
      params.type = filters.type;
    }

    if (filters.from) {
      clauses.push("event_timestamp >= @from");
      params.from = filters.from;
    }

    if (filters.to) {
      clauses.push("event_timestamp <= @to");
      params.to = filters.to;
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const sql = `
      SELECT * FROM messages
      ${whereClause}
      ORDER BY event_timestamp DESC, id DESC
      LIMIT @limit OFFSET @offset
    `;

    params.limit = filters.limit;
    params.offset = filters.offset;
    return { sql, params };
  }

  function buildCountQuery(filters = {}) {
    const clauses = [];
    const params = {};

    if (filters.contact) {
      clauses.push("contact_name LIKE @contact");
      params.contact = `%${filters.contact}%`;
    }

    if (filters.direction) {
      clauses.push("direction = @direction");
      params.direction = filters.direction;
    }

    if (filters.type) {
      clauses.push("message_type = @type");
      params.type = filters.type;
    }

    if (filters.from) {
      clauses.push("event_timestamp >= @from");
      params.from = filters.from;
    }

    if (filters.to) {
      clauses.push("event_timestamp <= @to");
      params.to = filters.to;
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return {
      sql: `SELECT COUNT(*) as total FROM messages ${whereClause}`,
      params
    };
  }

  return {
    insert(messageRecord) {
      try {
        const result = insertStatement.run(messageRecord);
        return {
          created: true,
          id: result.lastInsertRowid
        };
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
          const existing = findByUidStatement.get(messageRecord.messageUid);
          return {
            created: false,
            id: existing.id,
            record: existing
          };
        }

        throw error;
      }
    },
    findById(id) {
      return findByIdStatement.get(id);
    },
    list(filters) {
      const { sql, params } = buildListQuery(filters);
      return db.prepare(sql).all(params);
    },
    count(filters) {
      const { sql, params } = buildCountQuery(filters);
      return db.prepare(sql).get(params).total;
    }
  };
}

module.exports = {
  createMessagesRepository
};
