# WhatsApp Web Audit Local

Sistema local compuesto por:

- `extension/`: extension de Firefox que observa `https://web.whatsapp.com/`.
- `backend/`: API local Node.js que recibe, valida, almacena y exporta mensajes.

## Requisitos

- Node.js 20+
- Firefox con una sesion ya iniciada en WhatsApp Web

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm start
```

Backend por defecto:

- `http://127.0.0.1:43177`
- Base de datos: `backend/data/mensajes.db`
- Exportaciones: `backend/exports/`

## Endpoints

- `POST /message`
- `POST /sidebar-event`
- `GET /messages`
- `GET /messages/:id`
- `GET /messages/view`
- `GET /sidebar-events`
- `GET /sidebar-events/:id`
- `GET /sidebar-events/view`
- `GET /export?format=xlsx|csv|txt`
- `GET /health`

## Extension Firefox

1. Abrir `about:debugging#/runtime/this-firefox`
2. Elegir `Load Temporary Add-on`
3. Seleccionar `extension/manifest.json`
4. Con una sesion activa en `https://web.whatsapp.com/`, la extension empieza a observar mensajes nuevos

## Puerto recomendado

- Puerto fijo recomendado: `43177`
- Arranque explicito si quieres fijarlo por variable:

```bash
$env:PORT=43177
npm start
```

## Notas

- La extension separa dos capturas: `full_message` para chats abiertos y `sidebar_preview` para chats no abiertos.
- Los snapshots de sidebar se guardan en `sidebar_events` y usan deduplicacion persistente para no repetirse por recarga o re-render.
- Cuando luego se abre el chat y entra el mensaje completo, el backend intenta reconciliar ese snapshot con `messages`.
- La extension no abre otra sesion ni almacena historial.
- Los adjuntos se registran solo como metadatos.
- Si WhatsApp Web cambia su DOM, puede ser necesario ajustar los selectores de `extension/content.js`.
