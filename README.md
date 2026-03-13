# CampusTalk-NeueDBkonzepte

CampusTalk kombiniert Foren (Reddit-aehnlich) mit Echtzeitkommunikation (Discord-aehnlich).

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

Standard-Port fuer Vite ist 5173.

## Build-Checks

Im Ordner frontend:

```bash
npm run lint
npm run build
```

## Struktur

- backend: Express, MongoDB/Mongoose, Socket.IO
- frontend: React, Vite, Axios, React Router, Socket.IO Client