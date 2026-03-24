# Control de Proyectores — UNACH

Sistema web para la gestión y préstamo de proyectores en la Universidad Autónoma de Chiapas (UNACH). Los docentes solicitan proyectores vía Google Calendar, y los administradores los aprueban, asignan y gestionan.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, React Router 6, TailwindCSS 3, MUI 6 |
| Backend | Node.js, Express 4, Mongoose 8 |
| Base de datos | MongoDB Atlas |
| Auth | Google OAuth 2.0 + JWT (access 15min, refresh 24h) |
| Archivos | Cloudinary (PDFs, máx 2MB, expiran en 7 días) |
| Animaciones | Framer Motion |
| Gráficos | Chart.js + react-chartjs-2 |
| QR | html5-qrcode (escaneo) + qrcode.react (generación) |
| PDF export | jsPDF + html2canvas |
| Notificaciones | react-hot-toast, SweetAlert2, N8N webhook (SMS/WhatsApp) |

## Despliegue

- **Frontend:** Vercel → `https://control-proyectores-unach.vercel.app`
- **Backend:** Render → `https://control-proyectores-x0w2.onrender.com`
- **Dev frontend:** `npm start` (puerto 3001)
- **Dev backend:** `node server.js` (puerto 5000)

---

## Estructura del proyecto

```
control-proyectores/
├── src/                        # React app
│   ├── components/             # Componentes UI
│   ├── contexts/               # ThemeContext, TimeZoneContext
│   ├── hooks/                  # useAuth, useInactivityTimer
│   ├── services/               # authService, api.js (axios)
│   ├── themes/themeConfig.js   # 5 temas: default, purple, green, ocean, sunset
│   ├── config/config.js        # REACT_APP_BACKEND_URL centralizado
│   └── App.js                  # Routing principal
├── backend/
│   ├── server.js               # Setup + mounting de rutas (~114 líneas)
│   ├── config/adminEmails.js   # Lista CANÓNICA de emails admin
│   ├── middleware/auth.js      # verifyToken + isAdmin
│   ├── models/                 # Mongoose models
│   ├── routes/                 # Un archivo por dominio
│   ├── services/cloudinaryService.js
│   └── utils/cleanupFiles.js
├── .env                        # Variables del frontend
└── backend/.env                # Variables del backend
```

---

## Variables de entorno

### Frontend (`.env`)
```
REACT_APP_GOOGLE_CLIENT_ID=...
REACT_APP_BACKEND_URL=https://control-proyectores-x0w2.onrender.com
REACT_APP_FRONTEND_URL=https://control-proyectores-unach.vercel.app
GENERATE_SOURCEMAP=false
```

### Backend (`backend/.env`)
```
MONGODB_URI=mongodb+srv://...
CLIENT_ID=...              # Google OAuth
JWT_SECRET=...
PORT=5000
FRONTEND_URL=https://control-proyectores-unach.vercel.app
CLOUDINARY_CLOUD_NAME=degqmpdig
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
N8N_WEBHOOK_URL=...        # Opcional: activa notificaciones SMS/WhatsApp
```

---

## Modelos de MongoDB

### User
```js
nombre, email (unique), grado, grupo, turno, picture, isAdmin (bool),
theme (default|purple|green|ocean|sunset), darkMode (bool), timestamps
```

### Solicitud
```js
usuarioId (ref User), proyectorId (ref Proyector), motivo,
fechaInicio, fechaFin, estado (pendiente|aprobado|rechazado|finalizado),
hasComments, commentsAdded, timestamps
```

### Proyector
```js
codigo (unique, formato: PRY-[grado][grupo]-[random4]),
grado (Number), grupo (String upper), turno (Matutino|Vespertino),
estado (disponible|en uso|devuelto), asignadoA (ref User),
índice único compuesto: {grado, grupo, turno}
```

### Document
```js
fileName, filePath, fileUrl (Cloudinary), usuarioId, email, nombre,
grado, grupo, turno, estado (pendiente|aprobado|rechazado),
expirationDate (+7 días), timestamps
```

### Notification
```js
usuarioId, mensaje, tipo (info|warning|success|error|comment_request),
leida (bool), entidadId, entidadTipo, createdAt
```

### ProyectorComment
```js
solicitudId, proyectorId, userId,
issues ([hdmi|power|image|sound|overheat|remote|focus|other]),
comments (maxlength 500), status (pending|resolved), timestamp
```

---

## Rutas del backend

| Archivo | Rutas principales |
|---------|------------------|
| `authRoutes.js` | POST /login, POST /logout, GET /check-session, POST /refresh-token, POST /calendar-event |
| `userRoutes.js` | GET /usuarios, PUT /update-user, GET /user-data, PUT /update-theme, GET /user-theme, GET /last-theme |
| `solicitudRoutes.js` | GET /solicitudes (admin), POST /solicitar-proyector, PUT /solicituds/:id, GET /mis-solicitudes, GET /dashboard-stats, PUT /solicituds/:id/comments-added |
| `documentRoutes.js` | POST /upload-pdf, GET /view-document/:id, GET /documentos/usuario/:id, GET /verificar-documento/:id, GET /api/diagnostico-documentos |
| `notificationRoutes.js` | GET/POST /api/notifications, PUT /api/notifications/:id, PUT /api/notifications/mark-all-read |
| `adminRoutes.js` | GET /api/admin-emails, GET /admin/usuarios, GET /admin/solicitudes, GET /api/reports |
| `comentariosRoutes.js` | GET/POST /api/proyector-comments, PUT /api/proyector-comments/:id |
| `proyectorRoutes.js` | GET/POST/PUT/DELETE /api/proyectores, GET /api/proyectores/:id |
| `qrCodeRoutes.js` | Montado en /qr-codes |

---

## Routing del frontend (App.js)

```
/signin                → Login Google OAuth
/dashboard             → Dashboard usuario regular
/admin-dashboard       → Dashboard admin
/request-projector     → Solicitar proyector (con calendario)
/mis-solicitudes       → Mis solicitudes
/user-requests         → Gestión de solicitudes (admin)
/admin-proyectores     → CRUD proyectores (admin)
/faulty-projectors     → Proyectores con fallas (admin)
/asignar-directo       → Asignación directa (admin)
/devolver-proyector    → Devolver proyector
/upload-documents      → Subir PDF (1 por semana)
/view-documents        → Ver documentos
/qr-history            → Historial QR
/reports               → Reportes con gráficos (admin)
/personalizacion       → Selector de tema
/user-profile          → Perfil
```

---

## Autenticación

- Solo acceden usuarios `@unach.mx` + emails en `config/adminEmails.js`
- Al primer login se abre `GradeGroupModal` para capturar grado/grupo/turno
- Token JWT expira en **15 min**, con aviso a los 2 min
- Refresh token: **24h**. Si falla → logout automático
- Inactividad: **10 min** → logout automático
- Tokens en `sessionStorage` (no localStorage)
- Para agregar un admin: editar solo `backend/config/adminEmails.js`

---

## Componentes clave del frontend

| Componente | Descripción |
|-----------|-------------|
| `RequestProjector.js` | Formulario de solicitud con calendario, genera QR, integra Google Calendar |
| `UserRequests.js` | Panel admin: ver, aprobar/rechazar, asignar proyector a solicitudes |
| `AdminProyectores.js` | CRUD completo de proyectores |
| `ReportGenerator.js` | Reportes con Chart.js, filtros por fecha/estado/turno, exporta PDF |
| `QRScanner.js` | Escáner QR con html5-qrcode (solo admin) |
| `FaultyProjectors.js` | Lista de proyectores con fallas reportadas por usuarios |
| `UploadDocuments.js` | Subida de PDFs a Cloudinary (máx 1/semana) |
| `NotificationsDropdown.js` | Notificaciones en tiempo real desde BD |
| `ThemeSelector.js` | 5 temas + modo oscuro, persiste en BD |
| `GradeGroupModal.js` | Captura grado/grupo/turno en primer login |
| `Sidebar.js` / `AdminSidebar.js` | Navegación lateral según rol |

---

## Tareas cron (backend)

- **Cada domingo a las 00:00:** limpia archivos Cloudinary + borra registros de `Document` con más de 7 días

---

## Notas importantes

- **Nunca editar la lista de admins directamente en `middleware/auth.js`** — hacerlo solo en `backend/config/adminEmails.js`
- El campo `eventId` en Solicitud viene de Google Calendar y es requerido al crear solicitudes
- El código de proyector se genera automático: `PRY-{grado}{grupo}-{4chars}`
- `proyectorId` hardcodeado como `650000000000000000000001` en `solicitar-proyector` — es un placeholder, la asignación real se hace después por el admin
- Los warnings de source map de `html5-qrcode` están suprimidos con `GENERATE_SOURCEMAP=false` en `.env`
