# CampusTalk Frontend

React + Vite Frontend für CampusTalk.

## Voraussetzungen

- Node.js 20+
- Laufendes Backend (Standard: http://localhost:5001)

## Installation

1. In den Frontend-Ordner wechseln und Abhängigkeiten installieren:

```bash
cd frontend
npm install
```

2. Optional eine `.env` im Ordner `frontend` anlegen:

```bash
VITE_API_BASE_URL=http://localhost:5001/api
VITE_MEDIA_IMAGE_MAX_MB=10
VITE_MEDIA_VIDEO_MAX_MB=80
```

Hinweise zu den Variablen:

- `VITE_API_BASE_URL`: Basis-URL für REST-Aufrufe. Fallback ohne Variable: `http://localhost:5001/api`
- `VITE_MEDIA_IMAGE_MAX_MB`: Maximale Bildgröße (Client-Validierung), Standard: `10`
- `VITE_MEDIA_VIDEO_MAX_MB`: Maximale Videogröße (Client-Validierung), Standard: `80`

## Skripte

Entwicklung:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Build lokal testen:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## Umgesetzte Funktionen

### Gast

- Öffentliche Foren und Posts lesen
- Suche über Suchtext und Tags
- Registrierung und Login

### Studierender

- Forum erstellen
- Post erstellen und bearbeiten
- Gemischte Post-Inhalte: Text, Bild/Video per URL oder Datei-Upload
- Kommentare und verschachtelte Antworten
- Upvote/Downvote
- Post- und Kommentar-Meldungen (Reporting)
- Forum abonnieren/abbestellen
- Eigene abonnierte Foren und zugehörige neue Posts auf der Startseite
- Forum-Livechat mit Socket.IO
- Private Nachrichten mit Socket.IO
- Konversationsübersicht mit Suchfunktion nach Usern
- Unread-Badge für private Nachrichten in der Navigation
- Profilansicht mit eigenen Posts und Foren-Abos

### Administrator

- Nutzerverwaltung
- Rollenwechsel Studierender <-> Administrator (eigene Rolle nicht änderbar)
- Studierende löschen (eigener Account nicht löschbar)
- Gemeldete Inhalte einsehen (Posts und Kommentare)
- Forenverwaltung inkl. Bearbeiten/Löschen
- Post-Moderation innerhalb von Foren

## Realtime und Nachrichten

- Forum-Chat nutzt Socket.IO Events wie `join_forum`, `send_message`, `receive_message`.
- Private Nachrichten nutzen `register_private`, `send_private_message`, `receive_private_message`.
- Konversationen werden über `GET /api/private-messages/conversations` geladen.
- Beim Öffnen einer Konversation werden Nachrichten mit dem gewählten User über `GET /api/private-messages/:userId` geladen.
- Ungelesene Nachrichten werden im Frontend periodisch aktualisiert und als Badge angezeigt.

## Hinweise

- Beim Erstellen/Bearbeiten von Posts pro Medium nur eine Quelle senden:
  - Bild: `image` oder `imageUrl`
  - Video: `video` oder `videoUrl`
- Für den Direktstart einer privaten Unterhaltung wird aus der Post-Detailseite auf `/messages?userId=<id>&username=<name>` verlinkt.
