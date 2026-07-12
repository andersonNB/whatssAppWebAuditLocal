const { hashMessageParts } = require("../utils/hash");
const { buildChatKey } = require("../utils/chatKeys");

const MESSAGE_TYPES = new Set([
  "text",
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "contact",
  "location",
  "other"
]);

const DIRECTIONS = new Set(["incoming", "outgoing"]);
const CONVERSATION_TYPES = new Set(["direct", "group", "unknown"]);

function trimToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const result = String(value).trim();
  return result.length > 0 ? result : null;
}

function trimRequired(value, fieldName) {
  const result = trimToNull(value);
  if (!result) {
    throw new Error(`Field "${fieldName}" is required.`);
  }
  return result;
}

function normalizeTimestamp(value) {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const asText = trimRequired(value, "timestamp");
  const parsed = new Date(asText);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Field "timestamp" must be a valid date or epoch.');
  }

  return parsed.toISOString();
}

function normalizeEnum(value, fieldName, allowed, defaultValue) {
  const normalized = trimToNull(value) || defaultValue;
  if (!allowed.has(normalized)) {
    throw new Error(`Field "${fieldName}" must be one of: ${Array.from(allowed).join(", ")}.`);
  }
  return normalized;
}

function normalizeRawMeta(rawMeta) {
  if (rawMeta === undefined) {
    return null;
  }

  if (typeof rawMeta !== "object" || rawMeta === null || Array.isArray(rawMeta)) {
    throw new Error('Field "rawMeta" must be an object.');
  }

  return rawMeta;
}

function normalizeMessagePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const timestamp = normalizeTimestamp(payload.timestamp);
  const date = trimRequired(payload.date, "date");
  const time = trimRequired(payload.time, "time");
  const contactName = trimRequired(payload.contactName, "contactName");
  const phoneNumber = trimToNull(payload.phoneNumber);
  const groupName = trimToNull(payload.groupName);
  const conversationType = normalizeEnum(payload.conversationType, "conversationType", CONVERSATION_TYPES, "unknown");
  const message = trimRequired(payload.message, "message");
  const messageType = normalizeEnum(payload.messageType, "messageType", MESSAGE_TYPES, "text");
  const direction = normalizeEnum(payload.direction, "direction", DIRECTIONS, null);
  const status = trimToNull(payload.status);
  const capturedAt = normalizeTimestamp(payload.capturedAt);
  const externalMessageId = trimToNull(payload.externalMessageId);
  const rawMeta = normalizeRawMeta(payload.rawMeta);
  const chatKey = buildChatKey({
    phoneNumber,
    groupName,
    contactName,
    conversationType
  });

  const messageUid = trimToNull(payload.messageUid) || hashMessageParts([
    externalMessageId,
    chatKey,
    messageType,
    direction,
    timestamp,
    message
  ]);

  return {
    chatKey,
    externalMessageId,
    messageUid,
    timestamp,
    date,
    time,
    contactName,
    phoneNumber,
    groupName,
    conversationType,
    message,
    messageType,
    direction,
    status,
    capturedAt,
    rawMeta
  };
}

module.exports = {
  normalizeMessagePayload,
  MESSAGE_TYPES,
  DIRECTIONS,
  CONVERSATION_TYPES,
  trimToNull
};
