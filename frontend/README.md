# CampusTalk Frontend

React + Vite Frontend fuer CampusTalk.

## Voraussetzungen

- Node.js 20+
- Laufendes Backend auf Port 5001 (Standard)

## Installation

1. Im Ordner frontend Abhaengigkeiten installieren:

```bash
npm install
```

2. Optional: API-URL konfigurieren ueber Umgebungsvariable:

```bash
VITE_API_BASE_URL=http://localhost:5001/api
```

Wenn keine Variable gesetzt wird, verwendet das Frontend automatisch http://localhost:5001/api.

## Start

Entwicklung:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Umgesetzte Funktionen

- Gast:
	- Oeffentliche Foren und Posts lesen
	- Suche und Filter ueber Suchtext und Tags
	- Registrierung und Login
- Studierender:
	- Forum erstellen
	- Post erstellen (Text, Bild-URL, Video-URL)
	- Kommentare und verschachtelte Antworten
	- Upvote/Downvote
	- Forum-Livechat mit Socket.IO
	- Private Nachrichten mit Socket.IO
	- Profilansicht mit eigenen Posts
- Administrator:
	- Nutzerverwaltung
	- Rollenwechsel Studierender <-> Administrator

## Hinweise

- Fuer private Nachrichten gibt es im aktuellen Backend keinen oeffentlichen Endpoint fuer eine komplette User-Liste. Deshalb nutzt das Frontend bekannte Kontakte (z. B. aus Posts/Interaktionen), um Konversationen zu starten.
- Die NoSQL-Staerken werden im Frontend sichtbar durch flexible Tags, gemischte Inhaltsformate (Text/Bild/Video) und hohe Schreibfrequenz in Chat/Kommentaren.
