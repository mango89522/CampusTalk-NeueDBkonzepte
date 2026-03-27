# CampusTalk-NeueDBkonzepte

CampusTalk kombiniert Foren (Reddit-ähnlich) mit Echtzeitkommunikation (Discord-ähnlich).

## Projektstart in Testumgebung

### 1. Backend starten

1. In backend wechseln und Pakete installieren:

```bash
cd backend
npm install
```

2. Eine .env Datei auf Basis von .env example erstellen.

3. Pflichtwerte in .env setzen:

- MONGODB_URI
- JWT_SECRET
- CLIENT_ORIGIN (z. B. http://localhost:5173)

4. Backend starten:

```bash
npm run dev
```

Standard-Port ist 5001.

### 2. Frontend starten

1. In frontend wechseln und Pakete installieren:

```bash
cd frontend
npm install
```

2. Frontend starten:

```bash
npm run dev
```

Standard-Port für Vite ist 5173.

## Build-Checks

Im Ordner frontend:

```bash
npm run lint
npm run build
```

## Struktur

- backend: Express, MongoDB/Mongoose, Socket.IO
- frontend: React, Vite, Axios, React Router, Socket.IO Client

## Aktueller Funktionsstand

- Posts unterstützen Medien per URL oder Datei-Upload (Bild/Video) mit serverseitigen Größenlimits.
- Hochgeladene Medien werden über `/api/media/:id` bereitgestellt.
- Admin-Dashboard unterstützt Nutzerverwaltung inkl. Rollenwechsel und Löschen von Studierenden.