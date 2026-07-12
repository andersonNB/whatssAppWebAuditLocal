const { normalizeSidebarEventPayload } = require("./sidebarEventNormalizer");
const { sidebarPreviewMatchesMessage } = require("../utils/chatKeys");

const SIDEBAR_SUPPRESSION_HOURS = 24;
const RECONCILE_WINDOW_HOURS = 48;

function subtractHours(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function createSidebarEventService(sidebarEventsRepository) {
  return {
    save(payload) {
      const normalized = normalizeSidebarEventPayload(payload);
      const duplicate = sidebarEventsRepository.findRecentDuplicate(
        normalized,
        subtractHours(SIDEBAR_SUPPRESSION_HOURS)
      );

      if (duplicate) {
        return {
          created: false,
          id: Number(duplicate.id),
          eventUid: normalized.eventUid,
          suppressed: true
        };
      }

      const result = sidebarEventsRepository.insert({
        ...normalized,
        rawPayload: JSON.stringify({
          ...normalized,
          rawMeta: normalized.rawMeta
        })
      });

      return {
        created: result.created,
        id: Number(result.id),
        eventUid: normalized.eventUid,
        suppressed: false
      };
    },
    getById(id) {
      return sidebarEventsRepository.findById(id);
    },
    list(query) {
      const filters = {
        limit: Math.max(1, Math.min(Number.parseInt(query.limit, 10) || 100, 1000)),
        offset: Math.max(0, Number.parseInt(query.offset, 10) || 0),
        contact: query.contact || "",
        reconciled: query.reconciled || ""
      };

      return {
        items: sidebarEventsRepository.list(filters),
        total: sidebarEventsRepository.count(filters),
        filters
      };
    },
    reconcileForMessage(messageRecord) {
      if (!messageRecord || messageRecord.direction !== "incoming") {
        return [];
      }

      const candidates = sidebarEventsRepository.findUnreconciledCandidates(
        messageRecord.chat_key,
        subtractHours(RECONCILE_WINDOW_HOURS)
      );

      const matched = candidates.filter((candidate) =>
        sidebarPreviewMatchesMessage(
          candidate.preview_text,
          candidate.preview_type,
          messageRecord.message_text,
          messageRecord.message_type
        )
      );

      matched.forEach((candidate) => {
        sidebarEventsRepository.reconcile(candidate.id, messageRecord.id);
      });

      return matched.map((candidate) => Number(candidate.id));
    }
  };
}

module.exports = {
  createSidebarEventService
};
