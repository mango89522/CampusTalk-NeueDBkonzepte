# CampusTalk-NeueDBkonzepte

CampusTalk kombiniert Foren (Reddit-ähnlich) mit Echtzeitkommunikation.

## Projektstart 

### 1. Backend starten

1. In backend wechseln und Pakete installieren:

```bash
cd backend
npm install
```

2. Eine .env Datei auf Basis von .env example erstellen.

3. Pflichtwerte in .env setzen:

- MONGODB_URI (Anmeldedaten befinden sich in der Doku)

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

## Struktur-ReadMe

- [backend](backend/BACKEND_README.md): Express, MongoDB/Mongoose, Socket.IO
- [frontend](frontend/FRONTEND_README.md): React, Vite, Axios, React Router, Socket.IO Client