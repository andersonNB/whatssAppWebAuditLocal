function formatMeta(meta) {
  if (!meta) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch (error) {
    return " [meta_unserializable]";
  }
}

function log(level, message, meta) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}${formatMeta(meta)}`;
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  console.log(line);
}

module.exports = {
  info(message, meta) {
    log("INFO", message, meta);
  },
  warn(message, meta) {
    log("WARN", message, meta);
  },
  error(message, meta) {
    log("ERROR", message, meta);
  }
};
