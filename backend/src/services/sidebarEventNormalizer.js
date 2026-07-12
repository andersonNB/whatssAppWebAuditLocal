const { hashMessageParts } = require("../utils/hash");
const { buildChatKey, normalizePreviewText } = require("../utils/chatKeys");
const { MESSAGE_TYPES, DIRECTIONS, trimToNull } = require("./messageNormalizer");

function trimRequired(value, fieldName) {
  const result = trimToNull(value);
  if (!result) {
    throw new Error(`Field "${fieldName}" is required.`);
  }
  return result;
}

function normalizeTimestamp(value, fieldName) {
  const asText = trimRequired(value, fieldName);
  const parsed = new Date(asText);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Field "${fieldName}" must be a valid date or epoch.`);
  }
  return parsed.toISOString();
}

function normalizeMessageType(value) {
  const normalized = trimToNull(value) || "other";
  if (!MESSAGE_TYPES.has(normalized)) {
    throw new Error(`Field "previewType" must be one of: ${Array.from(MESSAGE_TYPES).join(", ")}.`);
  }
  return normalized;
}

function normalizeDirection(value) {
  const normalized = trimToNull(value) || "incoming";
  if (!DIRECTIONS.has(normalized)) {
    throw new Error(`Field "directionGuess" must be one of: ${Array.from(DIRECTIONS).join(", ")}.`);
  }
  return normalized;
}

function normalizeUnreadCount(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error('Field "unreadCount" must be a positive integer.');
  }
  return parsed;
}

function normalizeRawMeta(rawMeta) {
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) {
    throw new Error('Field "rawMeta" must be an object.');
  }
  return rawMeta;
}

function normalizeSidebarEventPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const timestamp = normalizeTimestamp(payload.timestamp, "timestamp");
  const capturedAt = normalizeTimestamp(payload.capturedAt || payload.timestamp, "capturedAt");
  const date = trimRequired(payload.date, "date");
  const time = trimRequired(payload.time, "time");
  const contactName = trimRequired(payload.contactName, "contactName");
  const phoneNumber = trimToNull(payload.phoneNumber);
  const groupName = trimToNull(payload.groupName);
  const previewText = trimRequired(payload.previewText || payload.message, "previewText");
  const previewType = normalizeMessageType(payload.previewType || payload.messageType);
  const unreadCount = normalizeUnreadCount(payload.unreadCount);
  const visibleTimeLabel = trimToNull(payload.visibleTimeLabel || payload.time);
  const directionGuess = normalizeDirection(payload.directionGuess || payload.direction);
  const rawMeta = normalizeRawMeta(payload.rawMeta);
  const chatKey = buildChatKey({
    phoneNumber,
    groupName,
    contactName,
    conversationType: "unknown"
  });

  const eventUid = trimToNull(payload.eventUid) || hashMessageParts([
    chatKey,
    normalizePreviewText(previewText),
    previewType,
    unreadCount,
    visibleTimeLabel
  ]);

  return {
    eventUid,
    chatKey,
    timestamp,
    date,
    time,
    contactName,
    phoneNumber,
    groupName,
    previewText,
    previewType,
    unreadCount,
    visibleTimeLabel,
    directionGuess,
    capturedAt,
    rawMeta
  };
}

module.exports = {
  normalizeSidebarEventPayload
};
