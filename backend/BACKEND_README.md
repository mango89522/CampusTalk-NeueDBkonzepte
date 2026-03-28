# Backend-Dokumentation

## Setup
Die allgemeinen Startschritte stehen im Haupt-README:

- [Projektstart im Root-README](../README.md)

Hier sind nur backend-spezifische Infos dokumentiert.

## Aktuelle Struktur (relevante Ordner)
```
backend/
├── server.js
├── package.json
├── middleware/
│   ├── auth.js
│   └── requireAdmin.js
├── models/
│   ├── Comment.js
│   ├── Forum.js
│   ├── Message.js
│   ├── Post.js
│   ├── PrivateMessage.js
│   ├── Report.js
│   └── User.js
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── comments.js
│   ├── forums.js
│   ├── media.js
│   ├── messages.js
│   ├── posts.js
│   └── users.js
├── sockets/
│   └── index.js
└── utils/
    ├── gridfs.js
    ├── helpers.js
    ├── jwt.js
    └── mediaUpload.js
```

## Umgebungsvariablen
Pflichtvariable:

- `MONGODB_URI`

In `.env example` bereits enthalten:

- `PORT` (Standard: `5001`)
- `MEDIA_IMAGE_MAX_MB` (Standard: `10`)
- `MEDIA_VIDEO_MAX_MB` (Standard: `80`)

Optional:

- `CLIENT_ORIGIN` (kommaseparierte Origins für CORS)

## Medien-Upload (Bilder/Videos)
- Upload: `POST /api/media/upload`
    - Auth erforderlich
    - `multipart/form-data`
    - Feldname: `file`
- Dateiabruf: `GET /api/media/:id`
- Löschen: `DELETE /api/media/:id` (Eigentümer oder Admin)
- Posts unterstützen direkten Upload im selben Request:
    - `POST /api/posts` mit `multipart/form-data`
    - `PATCH /api/posts/:id` mit `multipart/form-data`
    - Dateifelder: `image` und `video`
- Alternativ können in Posts `imageMediaId` und `videoMediaId` gesetzt werden.

## Admin-Endpunkte
- Nutzerliste: `GET /api/admin/users`
- Nutzerrolle ändern: `PATCH /api/admin/users/:id/role`
    - Eigene Rolle kann nicht geändert werden.
- Studierenden-Account löschen: `DELETE /api/admin/users/:id`
    - Nur Rolle `Studierender` ist löschbar.
    - Eigener Account kann nicht gelöscht werden.
- Meldungen abrufen: `GET /api/admin/reports`

## Private-Nachrichten (REST)
- Konversationen: `GET /api/private-messages/conversations`
- Nachrichten mit User: `GET /api/private-messages/:userId`

## Socket.IO Events
Verbindung mit Token (z. B. `http://localhost:5001?token=<JWT>`).

Forum-Chat:

- Client -> Server: `join_forum`
    - Payload: `"<forumId>"`
- Client -> Server: `send_message`
    - Payload:
        ```json
        {
            "forumId": "<forumId>",
            "text": "Hallo zusammen"
        }
        ```
- Server -> Client: `receive_message`

Privat-Chat:

- Client -> Server: `register_private`
    - Payload: keiner
- Client -> Server: `send_private_message`
    - Payload:
        ```json
        {
            "recipientId": "<userId>",
            "text": "Hey, hast du kurz Zeit?"
        }
        ```
- Server -> Client: `receive_private_message`
- Fehlerkanal: `socket_error`