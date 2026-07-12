const crypto = require("crypto");

function hashMessageParts(parts) {
  const payload = parts
    .map((part) => (part === null || part === undefined ? "" : String(part)))
    .join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

module.exports = {
  hashMessageParts
};
