function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value) {
  const normalized = String(value || "").replace(/[^\d+]/g, "").trim();
  return normalized || null;
}

function normalizePreviewText(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function buildChatKey({ phoneNumber, groupName, contactName, conversationType }) {
  const normalizedPhone = normalizePhone(phoneNumber);
  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  const normalizedGroup = normalizeWhitespace(groupName);
  if (normalizedGroup) {
    return `group:${normalizedGroup.toLowerCase()}`;
  }

  const normalizedContact = normalizeWhitespace(contactName);
  if (normalizedContact) {
    return `contact:${normalizedContact.toLowerCase()}`;
  }

  return `contact:desconocido`;
}

function sidebarPreviewMatchesMessage(previewText, previewType, messageText, messageType) {
  if (previewType && previewType !== "text" && previewType === messageType) {
    return true;
  }

  const normalizedPreview = normalizePreviewText(previewText);
  const normalizedMessage = normalizePreviewText(messageText);
  if (!normalizedPreview || !normalizedMessage) {
    return false;
  }

  if (normalizedPreview === normalizedMessage) {
    return true;
  }

  return normalizedMessage.includes(normalizedPreview) || normalizedPreview.includes(normalizedMessage);
}

module.exports = {
  buildChatKey,
  normalizePhone,
  normalizePreviewText,
  normalizeWhitespace,
  sidebarPreviewMatchesMessage
};
