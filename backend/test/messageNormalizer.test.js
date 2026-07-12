const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMessagePayload } = require("../src/services/messageNormalizer");

test("normalizes a valid payload", () => {
  const result = normalizeMessagePayload({
    timestamp: "2026-07-11T18:00:00.000Z",
    date: "2026-07-11",
    time: "13:00",
    contactName: "Alice",
    message: "Hola",
    messageType: "text",
    direction: "incoming",
    capturedAt: "2026-07-11T18:00:01.000Z"
  });

  assert.equal(result.contactName, "Alice");
  assert.equal(result.messageType, "text");
  assert.equal(result.direction, "incoming");
  assert.ok(result.messageUid);
});

test("rejects invalid message type", () => {
  assert.throws(() =>
    normalizeMessagePayload({
      timestamp: "2026-07-11T18:00:00.000Z",
      date: "2026-07-11",
      time: "13:00",
      contactName: "Alice",
      message: "Hola",
      messageType: "binary",
      direction: "incoming",
      capturedAt: "2026-07-11T18:00:01.000Z"
    })
  );
});
