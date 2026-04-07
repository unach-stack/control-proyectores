# Control de Proyectores — UNACH

Sistema web para la gestión y préstamo de proyectores en la Universidad Autónoma de Chiapas (UNACH). Los estudiantes designados como "Encargados" solicitan proyectores vía Google Calendar, y los administradores los aprueban, asignan y gestionan.

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
│   ├── server.js               # Setup + mounting de rutas (~116 líneas)
│   ├── config/adminEmails.js   # Lista CANÓNICA de emails admin
│   ├── middleware/auth.js      # verifyToken + isAdmin
│   ├── middleware/checkEsEncargado.js  # Bloquea /solicitar-proyector si no es encargado
│   ├── models/                 # Mongoose models
│   ├── routes/                 # Un archivo por dominio (ver tabla abajo)
│   ├── services/cloudinaryService.js
│   ├── utils/cleanupFiles.js
│   └── utils/weekUtils.js      # Utilidades ISO week (getISOWeek, getMondayOfWeek, etc.)
├── .env                        # Variables del frontend
├── backend/.env                # Variables del backend
├── SISTEMA_ENCARGADOS.txt      # Especificación funcional + checklist de progreso
└── README.md                   # Documentación pública del proyecto
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

### Encargado ✓ IMPLEMENTADO
```js
usuarioId (ref User), grado, grupo, turno,
semana (String, formato "YYYY-Www" ej: "2026-W13"),
tipo (titular|provisional), estado (postulado|activo|inactivo|sustituido),
aprobadoPor (ref User admin), fechaInicio (Date — lunes), fechaFin (Date — viernes),
noSePresento (bool), sustituidoPor (ref User), timestamps
// Índices: {grado,grupo,turno,semana} y {usuarioId,semana}
```

---

## Rutas del backend

| Archivo | Rutas principales |
|---------|------------------|
| `authRoutes.js` | POST /login, POST /logout, GET /check-session, POST /refresh-token, POST /calendar-event |
| `userRoutes.js` | GET /usuarios, PUT /update-user, GET /user-data, PUT /update-theme, GET /user-theme, GET /last-theme |
| `solicitudRoutes.js` | GET /solicitudes (admin), POST /solicitar-proyector (**protegido por checkEsEncargado**), PUT /solicituds/:id, GET /mis-solicitudes, GET /dashboard-stats, PUT /solicituds/:id/comments-added |
| `documentRoutes.js` | POST /upload-pdf, GET /view-document/:id, GET /documentos/usuario/:id, GET /verificar-documento/:id, GET /api/diagnostico-documentos |
| `notificationRoutes.js` | GET/POST /api/notifications, PUT /api/notifications/:id, PUT /api/notifications/mark-all-read |
| `adminRoutes.js` | GET /api/admin-emails, GET /admin/usuarios, GET /admin/solicitudes, GET /api/reports |
| `comentariosRoutes.js` | GET/POST /api/proyector-comments, PUT /api/proyector-comments/:id |
| `proyectorRoutes.js` | GET/POST/PUT/DELETE /api/proyectores, GET /api/proyectores/:id |
| `qrCodeRoutes.js` | Montado en /qr-codes |
| `encargadoRoutes.js` | Ver tabla de encargados abajo |

### Rutas de Encargados (`encargadoRoutes.js`)

| Método | Ruta | Quién | Descripción |
|--------|------|-------|-------------|
| POST | `/api/encargado/postular` | Usuario | Se postula (solo jue/vie, para la semana siguiente) |
| GET | `/api/encargado/activo` | Usuario | Encargado activo del propio grupo esta semana + estado de postulación propia |
| GET | `/api/encargado/grupos` | Admin | Todos los grupos con estado de encargado para una semana (`?semana=YYYY-Www`) |
| GET | `/api/encargado/semana/:semana` | Admin | Todos los registros crudos de encargados para una semana |
| PUT | `/api/encargado/:id/designar` | Admin | Designa un postulante como encargado titular |
| POST | `/api/encargado/asignar-directo` | Admin | Asigna encargado directo sin postulación (`{usuarioId, semana?}`) |
| POST | `/api/encargado/sustitucion` | Usuario | Solicita ser provisional (encargado titular debe tener noSePresento=true) |
| PUT | `/api/encargado/:id/aprobar-sustitucion` | Admin | Aprueba solicitud de sustitución provisional |
| GET | `/api/encargado/mis-postulaciones` | Usuario | Historial de postulaciones propias |

---

## Routing del frontend (App.js)

```
/signin                → Login Google OAuth
/dashboard             → Dashboard usuario regular
/admin-dashboard       → Dashboard admin
/request-projector     → Solicitar proyector — GATE: solo Encargados activos
                          Si no es encargado: pantalla de acceso restringido con
                          nombre del encargado real + botón postular (jue/vie) +
                          botón ser provisional (lun-mié si titular ausente)
                          Si ES encargado: badge verde "Eres el Encargado esta semana"
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
/admin-encargados      → Panel de encargados semanales (admin) — NUEVO
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
| `RequestProjector.js` | Solicitud con calendario animado, QR, Google Calendar. Gate de encargado al inicio: verifica `/api/encargado/activo`, muestra spinner → acceso restringido o pantalla normal con badge |
| `RequestProjector.css` | Animaciones CSS del calendario: tile-bounce, ripple-burst, glow-pulse, scan-line del QR, shimmer en botones |
| `AdminEncargados.js` | Panel admin de encargados: selector de semana, estadísticas (total/con encargado/con postulantes/sin postulantes), tarjetas por grupo expandibles con botón Designar y Asignar Directo — **NUEVO** |
| `UserRequests.js` | Panel admin: ver, aprobar/rechazar, asignar proyector a solicitudes |
| `AdminProyectores.js` | CRUD completo de proyectores |
| `ReportGenerator.js` | Reportes con Chart.js, filtros por fecha/estado/turno, exporta PDF |
| `QRScanner.js` | Escáner QR con html5-qrcode (solo admin). Bug resuelto: `startScan` eliminado del estado |
| `FaultyProjectors.js` | Lista de proyectores con fallas reportadas por usuarios |
| `UploadDocuments.js` | Subida de PDFs a Cloudinary (máx 1/semana) |
| `NotificationsDropdown.js` | Notificaciones en tiempo real desde BD |
| `ThemeSelector.js` | 5 temas + modo oscuro, persiste en BD |
| `GradeGroupModal.js` | Captura grado/grupo/turno en primer login |
| `Sidebar.js` | Navegación usuario: rediseñada con hamburger→X animado, layoutId en barra activa, orbs decorativos, siempre usa el `sidebarGradient` del tema (sin override dark:) |
| `AdminSidebar.js` | Navegación admin: misma base que Sidebar, dot verde pulsando "Activo", ítem "Encargados" añadido, ícono Settings que rota |
| `AsignarProyectorModal.js` | Modal de asignación de proyector a solicitud |
| `AsignarProyectorDirecto.js` | Asignación directa vía QR escaneado |

---

## Temas disponibles (`src/themes/themeConfig.js`)

Cada tema expone: `gradient`, `hover`, `border`, `text`, `background`,
`deleteGradient`, `deleteHover`, `deleteBorder`, `cancelButton`, `borderColor`, `sidebarGradient`

| Tema | sidebarGradient |
|------|----------------|
| default | from-blue-700 to-blue-900 |
| purple | from-purple-700 to-purple-900 |
| green | from-emerald-700 to-emerald-900 |
| ocean | from-cyan-700 to-blue-900 |
| sunset | from-orange-600 to-pink-800 |

**Importante:** Los sidebars NO usan `dark:from-gray-800 dark:to-gray-900` — el color del tema
siempre se muestra, incluso en dark mode.

---

## Notificaciones Toast (App.js — Toaster)

Configurado en `App.js` con `position="top-center"`, `width: 90vw`, `maxWidth: 380px`.
- **Success**: fondo verde claro `#f0fdf4`, texto `#166534`, borde `#bbf7d0`
- **Error**: fondo rojo claro `#fef2f2`, texto `#991b1b`, borde `#fecaca`
- Duración: 3500ms (success), 4000ms (error)
- Los componentes NO deben sobreescribir estilos inline en `toast.success/error` — heredan del Toaster global

---

## Tareas cron (backend)

- **Cada domingo a las 00:00:** limpia archivos Cloudinary + borra registros de `Document` con más de 7 días
- **Pendientes (Fase 2/4):** cron lunes 00:01 para activar encargados, cron miércoles 12:00 para marcar `noSePresento`, cron domingo 23:59 para cerrar encargadurías

---

## Sistema de Encargados Semanales

Ver especificación completa y checklist de progreso en `SISTEMA_ENCARGADOS.txt`.

### Estado actual: Fase 1 completada

**Flujo completo implementado:**
1. Admin abre `/admin-encargados` → ve todos los grupos con su estado para la semana
2. Admin designa postulante con "Designar" o asigna directo con "Asignar directamente"
3. Usuario designado recibe notificación
4. Ese usuario entra a `/request-projector` → ve badge verde + puede hacer solicitudes
5. Cualquier otro usuario del grupo → pantalla de "Acceso Restringido" con nombre del encargado real
6. Jueves/Viernes: usuario no-encargado puede postularse desde la pantalla de bloqueo
7. Si titular marcado como ausente (noSePresento=true): botón "Solicitar ser Provisional" visible lun-mié
8. Admin aprueba sustitución desde el endpoint PUT /api/encargado/:id/aprobar-sustitucion

**Reglas activas:**
- Solo jue/vie se puede postular (para la semana siguiente)
- No dos semanas consecutivas del mismo grupo
- Solo miembros del mismo grado+grupo+turno pueden postularse o pedir sustitución
- Middleware `checkEsEncargado` bloquea `POST /solicitar-proyector` con 403 descriptivo

**Pendiente (Fase 2):**
- Cron miércoles 12:00 que marca `noSePresento=true` automáticamente
- Alerta visual en panel admin cuando hay sustituciones pendientes
- Validación de perfil modificado hace <7 días

**Pendiente (Fase 3):**
- Sistema de corrección de perfil con aprobación admin (modelo `SolicitudCorreccionPerfil`)

**Pendiente (Fase 4):**
- Crons automáticos de activación/cierre de semana
- Historial de encargados por grupo
- Panel "Mi Encargaduría" en Dashboard del usuario

---

## Compatibilidad Node.js

El backend requiere un parche en `node_modules/buffer-equal-constant-time/index.js` para
funcionar con Node.js v25+. El parche cambia la línea:
```js
var SlowBuffer = require('buffer').SlowBuffer;
// →
var SlowBuffer = require('buffer').SlowBuffer || Buffer;
```
`SlowBuffer` fue eliminado en versiones recientes de Node. Si se hace `npm install` de nuevo,
hay que reaplicar el parche. El proyecto en Render usa Node 18.x donde no es necesario.

---

## Componentes muertos identificados (NO implementados, pendientes de eliminar)

Los siguientes archivos existen pero nunca son importados ni usados:

| Archivo | Por qué está muerto |
|---------|-------------------|
| `HelloWorld.js` | Placeholder de 12 líneas del inicio del proyecto |
| `EventManager.js` | Nunca importado, datos hardcodeados de prueba |
| `Card.js` + `Card.css` | Nunca importado, reemplazable con Tailwind |
| `Navbar.js` | Nunca importado, tiene usuario hardcodeado "Tom Cook" |
| `UserHeader.js` | Nunca importado, duplica la cabecera de App.js, usa `user.rol` en lugar de `isAdmin` |
| `AuthenticationWrapper.js` | Nunca importado, duplica guards de App.js |
| `common/LoadingSpinner.js` | Nunca importado, duplica spinner inline de App.js |
| `WelcomeAlert.js` | Importado en App.js pero `showWelcomeAlert` nunca se pone en `true` |
| `Calendario.js` | Ruta `/calendario` sin link en ningún sidebar, renderiza solo texto |
| `Grupos.js` | Ruta `/grupos` sin link en ningún sidebar, renderiza solo texto |
| `MiniCalendar.js` | Comparte ruta con Calendario.js, CSS con `min-height: 100vh` problemático |

---

## Notas importantes

- **Nunca editar la lista de admins directamente en `middleware/auth.js`** — hacerlo solo en `backend/config/adminEmails.js`
- El campo `eventId` en Solicitud viene de Google Calendar y es requerido al crear solicitudes
- El código de proyector se genera automático: `PRY-{grado}{grupo}-{4chars}`
- `proyectorId` hardcodeado como `650000000000000000000001` en `solicitar-proyector` — es un placeholder, la asignación real la hace el admin después
- Los warnings de source map de `html5-qrcode` están suprimidos con `GENERATE_SOURCEMAP=false` en `.env`
- El backend fue refactorizado de 2607 líneas a ~116 líneas — las rutas están en `backend/routes/`
- Vercel trata los warnings de ESLint como errores (`CI=true`). Todos los `no-unused-vars` y `react-hooks/exhaustive-deps` deben estar resueltos antes de hacer push
- Los sidebars son `fixed` siempre — `App.js` usa `lg:ml-72` en `<main>` para compensar. NO cambiar a `static` o el layout se rompe
- Las semanas ISO se calculan con `backend/utils/weekUtils.js`. El frontend duplica la misma lógica localmente en `AdminEncargados.js` (sin dependencia de npm). Formato: `"YYYY-Www"` ej: `"2026-W13"`
- Para crear notificaciones desde el backend, importar `Notification` de `../models/Notification` y usar `Notification.create({ usuarioId, mensaje, tipo, entidadId, entidadTipo: 'Encargado' })`
