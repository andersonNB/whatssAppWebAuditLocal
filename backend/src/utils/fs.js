const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildExportFilename(format) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `messages-${stamp}.${format}`;
}

function resolveFilePath(dirPath, filename) {
  return path.resolve(dirPath, filename);
}

module.exports = {
  ensureDir,
  buildExportFilename,
  resolveFilePath
};
