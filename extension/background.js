(function backgroundBootstrap() {
  const BASE_BACKEND_URL = "http://127.0.0.1:43177";
  const DEBUG_PREFIX = "[WhatsApp Web Audit Local][Background]";

  function debug(message, meta) {
    if (meta !== undefined) {
      console.info(DEBUG_PREFIX, message, meta);
      return;
    }

    console.info(DEBUG_PREFIX, message);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "STORE_MESSAGE" || !message.payload) {
      return undefined;
    }

    const endpoint = message.captureKind === "sidebar_preview"
      ? `${BASE_BACKEND_URL}/sidebar-event`
      : `${BASE_BACKEND_URL}/message`;

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.payload)
    })
      .then(async (response) => {
        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Backend responded with ${response.status}: ${responseText}`);
        }

        const data = await response.json();
        debug("Message forwarded to backend.", {
          messageUid: message.payload.messageUid,
          created: data.created,
          captureKind: message.captureKind || "full_message"
        });
        return data;
      })
      .catch((error) => {
        debug("Failed to forward message.", {
          messageUid: message.payload.messageUid,
          error: error.message
        });
        throw error;
      });
  });
})();
