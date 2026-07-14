function createSidebarEventsRepository(db) {
  const insertStatement = db.prepare(`
    INSERT INTO sidebar_events (
      event_uid,
      chat_key,
      contact_name,
      phone_number,
      group_name,
      preview_text,
      preview_type,
      unread_count,
      visible_time_label,
      direction_guess,
      captured_at,
      raw_payload
    ) VALUES (
      @eventUid,
      @chatKey,
      @contactName,
      @phoneNumber,
      @groupName,
      @previewText,
      @previewType,
      @unreadCount,
      @visibleTimeLabel,
      @directionGuess,
      @capturedAt,
      @rawPayload
    )
  `);
  const findByUidStatement = db.prepare("SELECT * FROM sidebar_events WHERE event_uid = ?");
  const findByIdStatement = db.prepare("SELECT * FROM sidebar_events WHERE id = ?");
  const recentDuplicateStatement = db.prepare(`
    SELECT * FROM sidebar_events
    WHERE chat_key = @chatKey
      AND preview_text = @previewText
      AND preview_type = @previewType
      AND unread_count = @unreadCount
      AND COALESCE(visible_time_label, '') = COALESCE(@visibleTimeLabel, '')
      AND datetime(captured_at) >= datetime(@windowStart)
    ORDER BY captured_at DESC
    LIMIT 1
  `);
  const findUnreconciledCandidatesStatement = db.prepare(`
    SELECT * FROM sidebar_events
    WHERE reconciled_message_id IS NULL
      AND chat_key = @chatKey
      AND direction_guess = 'incoming'
      AND datetime(captured_at) >= datetime(@windowStart)
    ORDER BY captured_at DESC
  `);
  const reconcileStatement = db.prepare("UPDATE sidebar_events SET reconciled_message_id = @messageId WHERE id = @id");
  const clearAllStatement = db.prepare("DELETE FROM sidebar_events");

  function buildListQuery(filters = {}) {
    const clauses = [];
    const params = {};

    if (filters.contact) {
      clauses.push("contact_name LIKE @contact");
      params.contact = `%${filters.contact}%`;
    }

    if (filters.reconciled === "true") {
      clauses.push("reconciled_message_id IS NOT NULL");
    } else if (filters.reconciled === "false") {
      clauses.push("reconciled_message_id IS NULL");
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return {
      sql: `
        SELECT * FROM sidebar_events
        ${whereClause}
        ORDER BY captured_at DESC, id DESC
        LIMIT @limit OFFSET @offset
      `,
      params: {
        ...params,
        limit: filters.limit,
        offset: filters.offset
      }
    };
  }

  function buildCountQuery(filters = {}) {
    const clauses = [];
    const params = {};

    if (filters.contact) {
      clauses.push("contact_name LIKE @contact");
      params.contact = `%${filters.contact}%`;
    }

    if (filters.reconciled === "true") {
      clauses.push("reconciled_message_id IS NOT NULL");
    } else if (filters.reconciled === "false") {
      clauses.push("reconciled_message_id IS NULL");
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return {
      sql: `SELECT COUNT(*) as total FROM sidebar_events ${whereClause}`,
      params
    };
  }

  return {
    insert(record) {
      try {
        const result = insertStatement.run(record);
        return { created: true, id: result.lastInsertRowid };
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
          const existing = findByUidStatement.get(record.eventUid);
          return { created: false, id: existing.id, record: existing };
        }
        throw error;
      }
    },
    findRecentDuplicate(record, windowStart) {
      return recentDuplicateStatement.get({
        chatKey: record.chatKey,
        previewText: record.previewText,
        previewType: record.previewType,
        unreadCount: record.unreadCount,
        visibleTimeLabel: record.visibleTimeLabel,
        windowStart
      });
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
    },
    findUnreconciledCandidates(chatKey, windowStart) {
      return findUnreconciledCandidatesStatement.all({ chatKey, windowStart });
    },
    reconcile(id, messageId) {
      reconcileStatement.run({ id, messageId });
    },
    clearAll() {
      const result = clearAllStatement.run();
      return result.changes;
    }
  };
}

module.exports = {
  createSidebarEventsRepository
};
