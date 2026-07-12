const { normalizeMessagePayload } = require("./messageNormalizer");

function createMessageService(messagesRepository, sidebarEventService) {
  return {
    save(payload) {
      const normalized = normalizeMessagePayload(payload);
      const result = messagesRepository.insert({
        ...normalized,
        rawPayload: JSON.stringify({
          ...normalized,
          rawMeta: normalized.rawMeta
        })
      });

      if (result.created) {
        sidebarEventService.reconcileForMessage({
          id: Number(result.id),
          chat_key: normalized.chatKey,
          direction: normalized.direction,
          message_text: normalized.message,
          message_type: normalized.messageType
        });
      }

      return {
        created: result.created,
        id: Number(result.id),
        messageUid: normalized.messageUid
      };
    },
    getById(id) {
      return messagesRepository.findById(id);
    },
    list(query) {
      const filters = {
        limit: Math.max(1, Math.min(Number.parseInt(query.limit, 10) || 100, 1000)),
        offset: Math.max(0, Number.parseInt(query.offset, 10) || 0),
        contact: query.contact || "",
        direction: query.direction || "",
        type: query.type || "",
        from: query.from || "",
        to: query.to || ""
      };

      return {
        items: messagesRepository.list(filters),
        total: messagesRepository.count(filters),
        filters
      };
    }
  };
}

module.exports = {
  createMessageService
};
