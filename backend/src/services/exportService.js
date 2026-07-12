const fs = require("fs");
const ExcelJS = require("exceljs");
const { ensureDir, buildExportFilename, resolveFilePath } = require("../utils/fs");

const EXPORT_COLUMNS = [
  { header: "ID", key: "id" },
  { header: "Message UID", key: "message_uid" },
  { header: "External Message ID", key: "external_message_id" },
  { header: "Timestamp", key: "event_timestamp" },
  { header: "Fecha", key: "message_date" },
  { header: "Hora", key: "message_time" },
  { header: "Contacto", key: "contact_name" },
  { header: "Telefono", key: "phone_number" },
  { header: "Grupo", key: "group_name" },
  { header: "Tipo Conversacion", key: "conversation_type" },
  { header: "Mensaje", key: "message_text" },
  { header: "Tipo Mensaje", key: "message_type" },
  { header: "Direccion", key: "direction" },
  { header: "Estado", key: "status" },
  { header: "Capturado", key: "captured_at" },
  { header: "Registrado", key: "created_at" }
];

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).replace(/"/g, "\"\"");
  return `"${text}"`;
}

function createExportService(messagesRepository, exportDir) {
  ensureDir(exportDir);

  async function exportXlsx(items) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Messages");
    worksheet.columns = EXPORT_COLUMNS;
    items.forEach((item) => worksheet.addRow(item));
    const filePath = resolveFilePath(exportDir, buildExportFilename("xlsx"));
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async function exportCsv(items) {
    const filePath = resolveFilePath(exportDir, buildExportFilename("csv"));
    const rows = [
      EXPORT_COLUMNS.map((column) => escapeCsvValue(column.header)).join(","),
      ...items.map((item) =>
        EXPORT_COLUMNS.map((column) => escapeCsvValue(item[column.key])).join(",")
      )
    ];
    await fs.promises.writeFile(filePath, rows.join("\n"), "utf8");
    return filePath;
  }

  async function exportTxt(items) {
    const filePath = resolveFilePath(exportDir, buildExportFilename("txt"));
    const lines = items.flatMap((item) => [
      `ID: ${item.id}`,
      `UID: ${item.message_uid}`,
      `Timestamp: ${item.event_timestamp}`,
      `Contacto: ${item.contact_name}`,
      `Telefono: ${item.phone_number || ""}`,
      `Grupo: ${item.group_name || ""}`,
      `Tipo conversacion: ${item.conversation_type}`,
      `Tipo mensaje: ${item.message_type}`,
      `Direccion: ${item.direction}`,
      `Estado: ${item.status || ""}`,
      `Mensaje: ${item.message_text}`,
      `Capturado: ${item.captured_at}`,
      `Registrado: ${item.created_at}`,
      ""
    ]);
    await fs.promises.writeFile(filePath, lines.join("\n"), "utf8");
    return filePath;
  }

  return {
    async exportMessages({ format, filters }) {
      const items = messagesRepository.list({
        limit: Math.max(1, Math.min(Number.parseInt(filters.limit, 10) || 1000, 50000)),
        offset: Math.max(0, Number.parseInt(filters.offset, 10) || 0),
        contact: filters.contact || "",
        direction: filters.direction || "",
        type: filters.type || "",
        from: filters.from || "",
        to: filters.to || ""
      });

      if (format === "xlsx") {
        return exportXlsx(items);
      }

      if (format === "csv") {
        return exportCsv(items);
      }

      if (format === "txt") {
        return exportTxt(items);
      }

      throw new Error("Unsupported export format.");
    }
  };
}

module.exports = {
  createExportService
};
