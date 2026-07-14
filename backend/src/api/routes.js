const express = require("express");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMessagesViewHtml(result, query) {
  const filters = {
    contact: query.contact || "",
    direction: query.direction || "",
    type: query.type || "",
    limit: query.limit || "100",
    offset: query.offset || "0"
  };

  const rows = result.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.created_at)}</td>
      <td>${escapeHtml(item.contact_name)}</td>
      <td>${escapeHtml(item.phone_number)}</td>
      <td>${escapeHtml(item.group_name)}</td>
      <td>${escapeHtml(item.direction)}</td>
      <td>${escapeHtml(item.message_type)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td title="${escapeHtml(item.message_text)}">${escapeHtml(item.message_text)}</td>
      <td><a href="/messages/${encodeURIComponent(item.id)}" target="_blank" rel="noreferrer">JSON</a></td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Messages View</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #101315;
        --panel: #171b1e;
        --muted: #8c9aa5;
        --line: #2a343c;
        --accent: #27c46b;
        --text: #eef3f6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: linear-gradient(180deg, #0d1012 0%, #151a1d 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 1440px;
        margin: 0 auto;
        padding: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .title {
        margin: 0;
        font-size: 28px;
      }
      .meta {
        color: var(--muted);
      }
      .actions a {
        color: var(--accent);
        text-decoration: none;
        margin-left: 16px;
      }
      .filters, .table-card {
        background: rgba(23, 27, 30, 0.92);
        border: 1px solid var(--line);
        border-radius: 16px;
      }
      .filters {
        padding: 16px;
        margin-bottom: 20px;
      }
      .filters form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        align-items: end;
      }
      label {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      input, select, button {
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--line);
        background: #0f1316;
        color: var(--text);
      }
      button {
        background: var(--accent);
        color: #08110b;
        font-weight: 700;
        cursor: pointer;
      }
      .table-card {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1100px;
      }
      th, td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th {
        position: sticky;
        top: 0;
        background: #151a1d;
      }
      td:nth-child(9) {
        max-width: 420px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .footer {
        margin-top: 14px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div>
          <h1 class="title">Mensajes Capturados</h1>
          <div class="meta">Total: ${escapeHtml(result.total)} registros</div>
        </div>
        <div class="actions">
          <a href="/messages">Ver JSON</a>
          <a href="/sidebar-events/view">Ver Sidebar</a>
          <a href="/export?format=txt" target="_blank" rel="noreferrer">Export TXT</a>
          <a href="/export?format=csv" target="_blank" rel="noreferrer">Export CSV</a>
        </div>
      </div>

      <div class="filters">
        <form method="GET" action="/messages/view">
          <div>
            <label for="contact">Contacto</label>
            <input id="contact" name="contact" value="${escapeHtml(filters.contact)}" />
          </div>
          <div>
            <label for="direction">Direccion</label>
            <select id="direction" name="direction">
              <option value="" ${filters.direction === "" ? "selected" : ""}>Todas</option>
              <option value="incoming" ${filters.direction === "incoming" ? "selected" : ""}>Entrante</option>
              <option value="outgoing" ${filters.direction === "outgoing" ? "selected" : ""}>Saliente</option>
            </select>
          </div>
          <div>
            <label for="type">Tipo</label>
            <input id="type" name="type" value="${escapeHtml(filters.type)}" />
          </div>
          <div>
            <label for="limit">Limite</label>
            <input id="limit" name="limit" value="${escapeHtml(filters.limit)}" />
          </div>
          <div>
            <label for="offset">Offset</label>
            <input id="offset" name="offset" value="${escapeHtml(filters.offset)}" />
          </div>
          <div>
            <button type="submit">Filtrar</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Registrado</th>
              <th>Contacto</th>
              <th>Telefono</th>
              <th>Grupo</th>
              <th>Direccion</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Mensaje</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="10">No hay mensajes almacenados.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="footer">Ruta util para inspeccion manual de la base de datos local.</div>
    </div>
  </body>
</html>`;
}

function buildSidebarEventsViewHtml(result, query) {
  const filters = {
    contact: query.contact || "",
    reconciled: query.reconciled || "",
    limit: query.limit || "100",
    offset: query.offset || "0"
  };

  const rows = result.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.created_at)}</td>
      <td>${escapeHtml(item.contact_name)}</td>
      <td>${escapeHtml(item.phone_number)}</td>
      <td>${escapeHtml(item.preview_type)}</td>
      <td>${escapeHtml(item.unread_count)}</td>
      <td>${escapeHtml(item.visible_time_label)}</td>
      <td>${escapeHtml(item.direction_guess)}</td>
      <td>${escapeHtml(item.reconciled_message_id)}</td>
      <td title="${escapeHtml(item.preview_text)}">${escapeHtml(item.preview_text)}</td>
      <td><a href="/sidebar-events/${encodeURIComponent(item.id)}" target="_blank" rel="noreferrer">JSON</a></td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sidebar Events View</title>
    <style>
      :root { color-scheme: dark; --bg:#101315; --panel:#171b1e; --muted:#8c9aa5; --line:#2a343c; --accent:#27c46b; --text:#eef3f6; }
      * { box-sizing:border-box; }
      body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:linear-gradient(180deg,#0d1012 0%,#151a1d 100%); color:var(--text); }
      .wrap { max-width:1440px; margin:0 auto; padding:24px; }
      .header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:20px; }
      .title { margin:0; font-size:28px; }
      .meta,.footer { color:var(--muted); }
      .actions a { color:var(--accent); text-decoration:none; margin-left:16px; }
      .filters,.table-card { background:rgba(23,27,30,.92); border:1px solid var(--line); border-radius:16px; }
      .filters { padding:16px; margin-bottom:20px; }
      .filters form { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; align-items:end; }
      label { display:block; font-size:12px; color:var(--muted); margin-bottom:6px; }
      input,select,button { width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--line); background:#0f1316; color:var(--text); }
      button { background:var(--accent); color:#08110b; font-weight:700; cursor:pointer; }
      .table-card { overflow:auto; }
      table { width:100%; border-collapse:collapse; min-width:1100px; }
      th,td { padding:12px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
      th { position:sticky; top:0; background:#151a1d; }
      td:nth-child(10) { max-width:360px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div>
          <h1 class="title">Snapshots de Sidebar</h1>
          <div class="meta">Total: ${escapeHtml(result.total)} registros</div>
        </div>
        <div class="actions">
          <a href="/messages/view">Ver Mensajes</a>
          <a href="/sidebar-events">Ver JSON</a>
        </div>
      </div>
      <div class="filters">
        <form method="GET" action="/sidebar-events/view">
          <div>
            <label for="contact">Contacto</label>
            <input id="contact" name="contact" value="${escapeHtml(filters.contact)}" />
          </div>
          <div>
            <label for="reconciled">Reconciliado</label>
            <select id="reconciled" name="reconciled">
              <option value="" ${filters.reconciled === "" ? "selected" : ""}>Todos</option>
              <option value="true" ${filters.reconciled === "true" ? "selected" : ""}>Si</option>
              <option value="false" ${filters.reconciled === "false" ? "selected" : ""}>No</option>
            </select>
          </div>
          <div>
            <label for="limit">Limite</label>
            <input id="limit" name="limit" value="${escapeHtml(filters.limit)}" />
          </div>
          <div>
            <label for="offset">Offset</label>
            <input id="offset" name="offset" value="${escapeHtml(filters.offset)}" />
          </div>
          <div>
            <button type="submit">Filtrar</button>
          </div>
        </form>
      </div>
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Registrado</th>
              <th>Contacto</th>
              <th>Telefono</th>
              <th>Tipo</th>
              <th>No leidos</th>
              <th>Hora visible</th>
              <th>Direccion</th>
              <th>Msg reconciliado</th>
              <th>Preview</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="11">No hay snapshots almacenados.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="footer">Eventos parciales de chats no abiertos.</div>
    </div>
  </body>
</html>`;
}

function createRouter({ messageService, sidebarEventService, exportService, maintenanceService, config, db }) {
  const router = express.Router();

  router.get("/health", (_request, response) => {
    const row = db.prepare("SELECT 1 as ok").get();
    response.json({
      status: "ok",
      database: row.ok === 1 ? "connected" : "unknown",
      port: config.app.port,
      timestamp: new Date().toISOString()
    });
  });

  router.post("/message", (request, response, next) => {
    try {
      const result = messageService.save(request.body);
      response.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sidebar-event", (request, response, next) => {
    try {
      const result = sidebarEventService.save(request.body);
      response.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/messages", (request, response, next) => {
    try {
      response.json(messageService.list(request.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/messages/view", (request, response, next) => {
    try {
      const result = messageService.list(request.query);
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.send(buildMessagesViewHtml(result, request.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/messages/:id", (request, response) => {
    const item = messageService.getById(request.params.id);
    if (!item) {
      response.status(404).json({
        error: "Message not found."
      });
      return;
    }

    response.json(item);
  });

  router.get("/sidebar-events", (request, response, next) => {
    try {
      response.json(sidebarEventService.list(request.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sidebar-events/view", (request, response, next) => {
    try {
      const result = sidebarEventService.list(request.query);
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.send(buildSidebarEventsViewHtml(result, request.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sidebar-events/:id", (request, response) => {
    const item = sidebarEventService.getById(request.params.id);
    if (!item) {
      response.status(404).json({
        error: "Sidebar event not found."
      });
      return;
    }

    response.json(item);
  });

  router.get("/export", async (request, response, next) => {
    try {
      const format = request.query.format || config.exports.defaultFormat;
      const filePath = await exportService.exportMessages({
        format,
        filters: request.query
      });

      response.json({
        format,
        filePath
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/maintenance/purge", async (request, response, next) => {
    try {
      const exportFirst = request.query.exportFirst === undefined
        ? undefined
        : request.query.exportFirst === "true";

      const result = await maintenanceService.purgeAll({
        exportFirst
      });

      response.json({
        ok: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createRouter
};
