(function bootstrap() {
  const MESSAGE_SELECTOR = ".message-in, .message-out, [data-pre-plain-text]";
  const SIDEBAR_ITEM_SELECTOR = '[role="listitem"], [data-testid="cell-frame-container"]';
  const DEBUG_PREFIX = "[WhatsApp Web Audit Local]";
  const RECENT_CACHE_LIMIT = 1000;
  const RETRY_LIMIT = 3;
  const sentMessageIds = new Map();
  const retryQueue = [];
  const observedNodes = new WeakSet();
  const observedSidebarKeys = new Map();
  let activeObserver = null;
  let sidebarObserver = null;
  let activeConversationKey = "";

  function debug(message, meta) {
    if (meta !== undefined) {
      console.info(DEBUG_PREFIX, message, meta);
      return;
    }

    console.info(DEBUG_PREFIX, message);
  }

  function trimToNull(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    return text ? text : null;
  }

  function cleanupRecentCache() {
    if (sentMessageIds.size <= RECENT_CACHE_LIMIT) {
      return;
    }

    const keys = Array.from(sentMessageIds.keys());
    const overflow = sentMessageIds.size - RECENT_CACHE_LIMIT;
    for (let index = 0; index < overflow; index += 1) {
      sentMessageIds.delete(keys[index]);
    }
  }

  function cleanupSidebarCache() {
    if (observedSidebarKeys.size <= RECENT_CACHE_LIMIT) {
      return;
    }

    const keys = Array.from(observedSidebarKeys.keys());
    const overflow = observedSidebarKeys.size - RECENT_CACHE_LIMIT;
    for (let index = 0; index < overflow; index += 1) {
      observedSidebarKeys.delete(keys[index]);
    }
  }

  async function postMessage(payload, captureKind) {
    debug("Sending message to backend.", {
      messageUid: payload.messageUid,
      direction: payload.direction,
      preview: payload.message.slice(0, 80),
      captureKind
    });

    const response = await browser.runtime.sendMessage({
      type: "STORE_MESSAGE",
      payload,
      captureKind
    });

    if (!response || typeof response !== "object") {
      throw new Error("Background script returned an invalid response.");
    }

    debug("Message stored successfully.", {
      messageUid: payload.messageUid
    });
  }

  function enqueueRetry(payload, captureKind, attempt) {
    if (attempt >= RETRY_LIMIT) {
      return;
    }

    retryQueue.push({
      payload,
      captureKind,
      attempt: attempt + 1,
      runAt: Date.now() + Math.min(15000, 1000 * (attempt + 1))
    });
  }

  async function flushRetryQueue() {
    if (retryQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const dueItems = retryQueue.filter((item) => item.runAt <= now);
    const pendingItems = retryQueue.filter((item) => item.runAt > now);
    retryQueue.length = 0;
    pendingItems.forEach((item) => retryQueue.push(item));

    for (const item of dueItems) {
      try {
        await postMessage(item.payload, item.captureKind || "full_message");
      } catch (_error) {
        enqueueRetry(item.payload, item.captureKind || "full_message", item.attempt);
      }
    }
  }

  function scheduleRetryLoop() {
    window.setInterval(() => {
      flushRetryQueue().catch(() => {});
    }, 2000);
  }

  function matchesMessageNode(node) {
    return node instanceof HTMLElement && node.matches(MESSAGE_SELECTOR);
  }

  function inferDirection(messageNode) {
    if (messageNode.classList.contains("message-out") || messageNode.closest(".message-out")) {
      return "outgoing";
    }

    if (messageNode.classList.contains("message-in") || messageNode.closest(".message-in")) {
      return "incoming";
    }

    return "incoming";
  }

  function resolveMessageNode(node) {
    if (!(node instanceof Node)) {
      return null;
    }

    if (node instanceof HTMLElement && matchesMessageNode(node)) {
      return node;
    }

    if (node instanceof HTMLElement) {
      return node.closest(MESSAGE_SELECTOR);
    }

    if (node.parentElement) {
      return node.parentElement.closest(MESSAGE_SELECTOR);
    }

    return null;
  }

  function inferMessageType(messageNode) {
    if (messageNode.querySelector("img")) {
      return "image";
    }

    if (messageNode.querySelector("video")) {
      return "video";
    }

    if (messageNode.querySelector("[data-icon='audio-play'], audio")) {
      return "audio";
    }

    if (messageNode.querySelector("[data-icon='document'], a[download]")) {
      return "document";
    }

    if (messageNode.querySelector("canvas")) {
      return "sticker";
    }

    if (messageNode.querySelector("[data-icon='location'], a[href*='maps']")) {
      return "location";
    }

    if (messageNode.querySelector("[data-icon='contact'], [title*='contacto']")) {
      return "contact";
    }

    const text = extractMessageText(messageNode);
    return text ? "text" : "other";
  }

  function inferSidebarMessageType(preview) {
    const normalizedPreview = (preview || "").toLowerCase();

    if (!normalizedPreview) {
      return "other";
    }

    if (normalizedPreview.includes("video")) {
      return "video";
    }

    if (normalizedPreview.includes("imagen") || normalizedPreview.includes("photo") || normalizedPreview.includes("foto")) {
      return "image";
    }

    if (normalizedPreview.includes("audio") || normalizedPreview.includes("voz")) {
      return "audio";
    }

    if (normalizedPreview.includes("documento") || normalizedPreview.includes("archivo")) {
      return "document";
    }

    if (normalizedPreview.includes("sticker")) {
      return "sticker";
    }

    if (normalizedPreview.includes("ubicaci")) {
      return "location";
    }

    if (normalizedPreview.includes("contact")) {
      return "contact";
    }

    return "text";
  }

  function extractMessageText(messageNode) {
    const textCandidates = [
      messageNode.querySelector("[data-pre-plain-text] span.selectable-text"),
      messageNode.querySelector("span.selectable-text"),
      messageNode.querySelector("[dir='ltr']"),
      messageNode.querySelector("[dir='auto']")
    ];

    for (const candidate of textCandidates) {
      const text = trimToNull(candidate && candidate.textContent);
      if (text) {
        return text;
      }
    }

    const fallback = trimToNull(messageNode.textContent);
    return fallback || "[media]";
  }

  function parsePrePlainText(value) {
    const result = {
      contactName: null,
      time: null
    };

    if (!value) {
      return result;
    }

    const match = value.match(/\[(.+?)\]\s(.+?):$/);
    if (!match) {
      return result;
    }

    result.time = trimToNull(match[1]);
    result.contactName = trimToNull(match[2]);
    return result;
  }

  function extractChatContext() {
    const headerTitle =
      document.querySelector("header [title]") ||
      document.querySelector("header span[dir='auto']") ||
      document.querySelector("header span");

    const subtitle =
      document.querySelector("header div[title]") ||
      document.querySelector("header [aria-label]");

    const headerText = trimToNull(headerTitle && (headerTitle.getAttribute("title") || headerTitle.textContent));
    const subtitleText = trimToNull(subtitle && (subtitle.getAttribute("title") || subtitle.textContent));
    const conversationType = subtitleText && subtitleText.includes(",") ? "group" : "direct";

    return {
      contactName: headerText || "Desconocido",
      groupName: conversationType === "group" ? headerText : null,
      phoneNumber: headerText && /^\+?\d[\d\s-]+$/.test(headerText) ? headerText : null,
      conversationType
    };
  }

  function extractSidebarTextCandidates(sidebarItem) {
    return Array.from(sidebarItem.querySelectorAll("span, div"))
      .map((node) => trimToNull(node.getAttribute("title")) || trimToNull(node.textContent))
      .filter(Boolean);
  }

  function isLikelyTimeText(value) {
    return /^(\d{1,2}:\d{2})(\s?[ap]\.\s?m\.)?$/i.test(value) || /^ayer$/i.test(value);
  }

  function isLikelyUnreadText(value) {
    return /^\d+$/.test(value);
  }

  function resolveSidebarName(sidebarItem, candidates) {
    const titledNode =
      sidebarItem.querySelector("[title]") ||
      sidebarItem.querySelector("img[alt]");

    const titledValue =
      trimToNull(titledNode && titledNode.getAttribute("title")) ||
      trimToNull(titledNode && titledNode.getAttribute("alt"));

    if (titledValue) {
      return titledValue;
    }

    return candidates.find((value) => !isLikelyTimeText(value) && !isLikelyUnreadText(value)) || null;
  }

  function resolveSidebarPreview(candidates, contactName) {
    return candidates.find((value) =>
      value !== contactName &&
      !isLikelyTimeText(value) &&
      !isLikelyUnreadText(value)
    ) || null;
  }

  function resolveSidebarTime(sidebarItem, candidates) {
    const explicitTime = trimToNull(sidebarItem.querySelector("time") && sidebarItem.querySelector("time").dateTime);
    if (explicitTime) {
      return explicitTime;
    }

    return candidates.find((value) => isLikelyTimeText(value)) || null;
  }

  function resolveSidebarUnreadCount(candidates) {
    const unreadCandidate = candidates.find((value) => isLikelyUnreadText(value));
    return unreadCandidate ? Number.parseInt(unreadCandidate, 10) : 0;
  }

  function getSidebarContainer() {
    return (
      document.querySelector("#pane-side") ||
      document.querySelector("[aria-label*='chat']") ||
      document.querySelector("[role='grid']") ||
      null
    );
  }

  function collectSidebarItems(node) {
    if (!(node instanceof HTMLElement)) {
      return [];
    }

    const directNode = node.matches(SIDEBAR_ITEM_SELECTOR) ? [node] : [];
    const descendants = Array.from(node.querySelectorAll(SIDEBAR_ITEM_SELECTOR));
    return directNode.concat(descendants);
  }

  async function buildSidebarPayload(sidebarItem) {
    const candidates = extractSidebarTextCandidates(sidebarItem);
    const contactName = resolveSidebarName(sidebarItem, candidates);
    const preview = resolveSidebarPreview(candidates, contactName);
    const previewTime = resolveSidebarTime(sidebarItem, candidates);
    const unreadCount = resolveSidebarUnreadCount(candidates);

    if (!contactName || unreadCount < 1) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const date = timestamp.slice(0, 10);
    const time = trimToNull(previewTime) || new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    const message = preview || "[sidebar-preview]";
    const messageType = inferSidebarMessageType(preview);
    const messageUid = await sha256([
      "sidebar",
      contactName,
      preview || "",
      time,
      String(unreadCount)
    ].join("|"));

    return {
      eventUid: messageUid,
      externalMessageId: null,
      messageUid,
      timestamp,
      date,
      time,
      contactName,
      phoneNumber: /^\+?\d[\d\s-]+$/.test(contactName) ? contactName : null,
      groupName: null,
      message,
      previewText: message,
      messageType,
      previewType: messageType,
      direction: "incoming",
      directionGuess: "incoming",
      unreadCount,
      visibleTimeLabel: previewTime || time,
      status: "sidebar-unopened",
      capturedAt: timestamp,
      rawMeta: {
        source: "sidebar",
        unreadCount,
        preview,
        sidebarTexts: candidates
      }
    };
  }

  async function sha256(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  async function buildPayload(messageNode) {
    const context = extractChatContext();
    const direction = inferDirection(messageNode);
    const prePlain = parsePrePlainText(messageNode.getAttribute("data-pre-plain-text"));
    const message = extractMessageText(messageNode);
    const messageType = inferMessageType(messageNode);
    const timestamp = trimToNull(messageNode.querySelector("time") && messageNode.querySelector("time").dateTime) || new Date().toISOString();
    const time = prePlain.time || new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const externalMessageId =
      trimToNull(messageNode.getAttribute("data-id")) ||
      trimToNull(messageNode.id) ||
      trimToNull(messageNode.getAttribute("data-message-id"));
    const contactName = direction === "incoming"
      ? (prePlain.contactName || context.contactName)
      : context.contactName;
    const rawMeta = {
      className: messageNode.className,
      dataset: { ...messageNode.dataset },
      ariaLabel: trimToNull(messageNode.getAttribute("aria-label"))
    };

    const messageUid = await sha256([
      activeConversationKey,
      externalMessageId || "",
      timestamp,
      direction,
      messageType,
      message
    ].join("|"));

    return {
      externalMessageId,
      messageUid,
      timestamp,
      date,
      time,
      contactName,
      phoneNumber: context.phoneNumber,
      groupName: context.groupName,
      conversationType: context.conversationType,
      message,
      messageType,
      direction,
      status: trimToNull(messageNode.getAttribute("data-icon")),
      capturedAt: new Date().toISOString(),
      rawMeta
    };
  }

  async function processMessageNode(messageNode) {
    if (!(messageNode instanceof HTMLElement)) {
      return;
    }

    if (!matchesMessageNode(messageNode)) {
      return;
    }

    if (observedNodes.has(messageNode)) {
      return;
    }

    observedNodes.add(messageNode);

    try {
      const payload = await buildPayload(messageNode);
      if (sentMessageIds.has(payload.messageUid)) {
        return;
      }

      await postMessage(payload, "full_message");
      sentMessageIds.set(payload.messageUid, Date.now());
      cleanupRecentCache();
    } catch (error) {
      debug("Failed to send message. Queueing retry.", {
        className: messageNode.className,
        error: error && error.message ? error.message : String(error)
      });
      try {
        const retryPayload = await buildPayload(messageNode);
        enqueueRetry(retryPayload, "full_message", 0);
      } catch (__error) {
      }
    }
  }

  async function processSidebarItem(sidebarItem) {
    if (!(sidebarItem instanceof HTMLElement)) {
      return;
    }

    try {
      const payload = await buildSidebarPayload(sidebarItem);
      if (!payload) {
        return;
      }

      const sidebarKey = `${payload.contactName}|${payload.previewText}|${payload.unreadCount}|${payload.visibleTimeLabel}`;
      if (observedSidebarKeys.has(sidebarKey) || sentMessageIds.has(payload.messageUid)) {
        return;
      }

      observedSidebarKeys.set(sidebarKey, Date.now());
      cleanupSidebarCache();
      await postMessage(payload, "sidebar_preview");
      sentMessageIds.set(payload.messageUid, Date.now());
      cleanupRecentCache();
    } catch (error) {
      debug("Failed to send sidebar preview.", {
        className: sidebarItem.className,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  function collectMessageNodes(node) {
    if (!(node instanceof HTMLElement)) {
      return [];
    }

    const directNode = matchesMessageNode(node) ? [node] : [];
    const descendants = Array.from(node.querySelectorAll(MESSAGE_SELECTOR));
    return directNode.concat(descendants);
  }

  function handleMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        const candidate = resolveMessageNode(mutation.target);
        if (candidate) {
          processMessageNode(candidate).catch(() => {});
        }
        return;
      }

      if (mutation.type === "attributes") {
        const candidate = resolveMessageNode(mutation.target);
        if (candidate) {
          processMessageNode(candidate).catch(() => {});
        }
      }

      mutation.addedNodes.forEach((node) => {
        const closestMessageNode = resolveMessageNode(node);
        if (closestMessageNode) {
          processMessageNode(closestMessageNode).catch(() => {});
        }

        collectMessageNodes(node).forEach((messageNode) => {
          processMessageNode(messageNode).catch(() => {});
        });
      });
    });
  }

  function handleSidebarMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData" || mutation.type === "attributes") {
        const candidate = mutation.target instanceof HTMLElement
          ? mutation.target.closest(SIDEBAR_ITEM_SELECTOR)
          : mutation.target.parentElement && mutation.target.parentElement.closest(SIDEBAR_ITEM_SELECTOR);

        if (candidate) {
          processSidebarItem(candidate).catch(() => {});
        }
      }

      mutation.addedNodes.forEach((node) => {
        collectSidebarItems(node).forEach((sidebarItem) => {
          processSidebarItem(sidebarItem).catch(() => {});
        });
      });
    });
  }

  function getMessagesContainer() {
    return document.body || document.documentElement || null;
  }

  function scanExistingMessages(limit) {
    const nodes = Array.from(document.querySelectorAll(MESSAGE_SELECTOR)).slice(-limit);
    debug("Scanning existing message candidates.", {
      found: nodes.length
    });

    nodes.forEach((node) => {
      processMessageNode(node).catch(() => {});
    });
  }

  function scanSidebarItems(limit) {
    const container = getSidebarContainer();
    if (!container) {
      debug("Sidebar container not found yet.");
      return false;
    }

    const items = Array.from(container.querySelectorAll(SIDEBAR_ITEM_SELECTOR)).slice(0, limit);
    debug("Scanning sidebar items.", {
      found: items.length
    });

    items.forEach((item) => {
      processSidebarItem(item).catch(() => {});
    });

    return true;
  }

  function updateConversationKey() {
    const context = extractChatContext();
    activeConversationKey = [
      context.contactName,
      context.groupName,
      context.phoneNumber,
      context.conversationType
    ].join("|");
  }

  function observeActiveChat() {
    const container = getMessagesContainer();
    if (!container) {
      debug("Messages container not found yet.");
      return false;
    }

    updateConversationKey();

    if (activeObserver) {
      activeObserver.disconnect();
    }

    activeObserver = new MutationObserver(handleMutations);
    activeObserver.observe(container, {
      attributes: true,
      attributeFilter: ["class", "data-id", "data-message-id", "data-pre-plain-text"],
      characterData: true,
      childList: true,
      subtree: true
    });
    debug("Active chat observer installed.", {
      conversationKey: activeConversationKey,
      containerTag: container.tagName,
      containerId: container.id || null
    });
    scanExistingMessages(50);
    return true;
  }

  function observeSidebar() {
    const container = getSidebarContainer();
    if (!container) {
      return false;
    }

    if (sidebarObserver) {
      sidebarObserver.disconnect();
    }

    sidebarObserver = new MutationObserver(handleSidebarMutations);
    sidebarObserver.observe(container, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });

    debug("Sidebar observer installed.");
    scanSidebarItems(100);
    return true;
  }

  function installNavigationObserver() {
    const root = document.body;
    const observer = new MutationObserver(() => {
      updateConversationKey();
      observeActiveChat();
      observeSidebar();
    });

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  function waitForReady() {
    const maxAttempts = 60;
    let attempt = 0;
    debug("Content script loaded. Waiting for WhatsApp UI.");
    const timer = window.setInterval(() => {
      attempt += 1;
      const activeChatReady = observeActiveChat();
      const sidebarReady = observeSidebar();
      if (activeChatReady || sidebarReady) {
        installNavigationObserver();
        scheduleRetryLoop();
        window.clearInterval(timer);
        debug("WhatsApp observer ready.");
        return;
      }

      if (attempt % 5 === 0) {
        debug("Still waiting for message container.", {
          attempt,
          readyState: document.readyState,
          hasBody: Boolean(document.body),
          hasMain: Boolean(document.querySelector("#main")),
          hasAnyMessageNode: Boolean(document.querySelector(MESSAGE_SELECTOR)),
          hasSidebar: Boolean(getSidebarContainer())
        });
      }

      if (attempt >= maxAttempts) {
        window.clearInterval(timer);
        debug("WhatsApp observer setup timed out.");
      }
    }, 1000);
  }

  waitForReady();
})();
