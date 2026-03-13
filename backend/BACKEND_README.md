# Setup

## 1. Schritt
Im integrierten Terminal /backend `npm i` ausführen

## 2. Schritt
Env Example kopieren und neue .env machen, URL aus Web kopieren und User + Passwort durch Benutzerdaten ersetzen

## 3. Schritt 
integriertes Terminal für /backend und `node server.js` ausführen

## 4. Struktur
```
backend/
├── server.js                   
├── utils/
│   ├── helpers.js              
│   └── jwt.js                  
├── middleware/
│   ├── auth.js                 
│   └── requireAdmin.js          
├── routes/
│   ├── auth.js                 
│   ├── forums.js                
│   ├── posts.js               
│   ├── comments.js           
│   ├── users.js                 
│   ├── messages.js             
│   ├── admin.js                
│   └── media.js                
└── sockets/
    └── index.js                
```

## 5. Medien-Upload (Bilder/Videos)
- Endpoint für Upload: `POST /api/media/upload` (Auth erforderlich, `multipart/form-data`, Feldname: `file`)
- Upload-Limits über `.env`:
    - `MEDIA_IMAGE_MAX_MB` (Standard: 10)
    - `MEDIA_VIDEO_MAX_MB` (Standard: 80)
- Dateiabruf: `GET /api/media/:id`
- Optionales Löschen: `DELETE /api/media/:id` (Eigentümer oder Admin)
- In Posts können zusätzlich zu `imageUrl`/`videoUrl` jetzt `imageMediaId`/`videoMediaId` gesetzt werden.
    Die URL wird dann serverseitig als `/api/media/:id` erzeugt.
- Posts unterstützen jetzt auch direkten Upload im selben Request:
    - `POST /api/posts` mit `multipart/form-data`
    - `PATCH /api/posts/:id` mit `multipart/form-data`
    - Feldnamen für Dateien: `image` und `video`

## 6. Chat starten
1. In Postman "+" und "Socket.IO" auswählen
2. In die URL "http://localhost:5001?token=" + jwt-Token und Connect klicken
3. Forum beitreten: 
    - Bei "Event name, defaults..." eingeben "join_forum"
    - als Message die ID des Forums in ""
4. Nachricht schreiben
    - Bei "Event name, defaults..." eingeben: "send_message"
    - als Message bsp. : 
    ```
        {
            "forumId": "69b13e3231cee15adb3be178",
            "senderId": "69b13bee4dc5a38b2148f6f0",
            "text": "Hallo zusammen! Ist das der Live-Chat?"
        }
    ```
5. Privater Chat
    - Bei "Event name, defaults..." eingeben: "register_private"
    - als Message bsp. : 
    ```
        {
            "senderId": "69b13bee4dc5a38b2148f6f0",
            "recipientId": "EINE_ANDERE_USER_ID", 
            "text": "Hey, hast du die Zusammenfassung für Mathe?"
        }
    ```