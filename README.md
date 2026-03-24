<h1 align="center">
  <br>
  Control de Proyectores — UNACH
  <br>
</h1>

<p align="center">
  Sistema web para la gestión y préstamo de proyectores en la<br>
  <strong>Universidad Autónoma de Chiapas (UNACH)</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Google-OAuth2-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-black?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## Descripción

Plataforma institucional que permite a **docentes** solicitar proyectores mediante Google Calendar y a **administradores** aprobar, asignar y gestionar el inventario en tiempo real. Incluye escaneo QR, notificaciones, reportes estadísticos y subida de documentos PDF.

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Google OAuth 2.0 + JWT (access 15min / refresh 24h), solo correos `@unach.mx` |
| **Solicitudes** | Formulario con Google Calendar integrado, genera código QR por solicitud |
| **Panel Admin** | Aprobar/rechazar solicitudes, asignar proyectores, gestión de inventario CRUD |
| **Escaneo QR** | Lector QR con cámara para asignación y devolución directa |
| **Documentos** | Subida de PDFs a Cloudinary (máx. 1 por semana, expiran en 7 días) |
| **Reportes** | Gráficos con Chart.js, filtros por fecha/estado/turno, exportación a PDF |
| **Notificaciones** | Tiempo real desde BD + SMS/WhatsApp vía N8N webhook |
| **Temas** | 5 temas de color + modo oscuro, persistidos por usuario en BD |
| **Inactividad** | Logout automático a los 10 minutos de inactividad |

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|-----------|-----|
| React 18 + React Router 6 | SPA y enrutamiento |
| TailwindCSS 3 + MUI 6 | Estilos y componentes UI |
| Framer Motion | Animaciones |
| Chart.js + react-chartjs-2 | Gráficos en reportes |
| html5-qrcode + qrcode.react | Escaneo y generación de QR |
| jsPDF + html2canvas | Exportación a PDF |
| SweetAlert2 + react-hot-toast | Notificaciones y alertas |

### Backend
| Tecnología | Uso |
|-----------|-----|
| Node.js + Express 4 | API REST |
| Mongoose 8 + MongoDB Atlas | ODM y base de datos |
| JWT + Google OAuth 2.0 | Autenticación |
| Cloudinary | Almacenamiento de PDFs |
| node-cron | Tarea de limpieza semanal |
| N8N Webhook | Notificaciones SMS/WhatsApp (opcional) |

---

## Estructura del proyecto

```
control-proyectores/
├── src/                          # React app
│   ├── components/               # Componentes UI
│   ├── contexts/                 # ThemeContext, TimeZoneContext
│   ├── hooks/                    # useAuth, useInactivityTimer
│   ├── services/                 # authService, api.js (axios)
│   ├── themes/themeConfig.js     # 5 temas: default, purple, green, ocean, sunset
│   ├── config/config.js          # REACT_APP_BACKEND_URL centralizado
│   └── App.js                    # Routing principal
│
├── backend/
│   ├── server.js                 # Setup + mounting de rutas
│   ├── config/adminEmails.js     # Lista canónica de emails admin
│   ├── middleware/auth.js        # verifyToken + isAdmin
│   ├── models/                   # Mongoose models
│   ├── routes/                   # Un archivo por dominio
│   ├── services/cloudinaryService.js
│   └── utils/cleanupFiles.js
│
├── .env                          # Variables del frontend
├── backend/.env                  # Variables del backend
└── CLAUDE.md                     # Contexto completo del proyecto
```

---

## Instalación y configuración

### Requisitos previos

- Node.js >= 18
- Cuenta de MongoDB Atlas
- Proyecto de Google Cloud con OAuth 2.0 habilitado
- Cuenta de Cloudinary

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd control-proyectores
```

### 2. Configurar variables de entorno

**Frontend** — crear `.env` en la raíz:

```env
REACT_APP_GOOGLE_CLIENT_ID=tu_google_client_id
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_FRONTEND_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
```

**Backend** — crear `backend/.env`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/db
CLIENT_ID=tu_google_client_id
JWT_SECRET=tu_jwt_secret_muy_seguro
PORT=5000
FRONTEND_URL=http://localhost:3001
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
N8N_WEBHOOK_URL=         # Opcional: activa notificaciones SMS/WhatsApp
```

### 3. Instalar dependencias

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### 4. Ejecutar en desarrollo

```bash
# Terminal 1 — Frontend (puerto 3001)
npm start

# Terminal 2 — Backend (puerto 5000)
cd backend && node server.js
```

---

## Rutas del frontend

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/signin` | Público | Login con Google OAuth |
| `/dashboard` | Usuario | Panel principal del docente |
| `/request-projector` | Usuario | Solicitar proyector con calendario |
| `/mis-solicitudes` | Usuario | Ver estado de solicitudes propias |
| `/upload-documents` | Usuario | Subir PDF (1 por semana) |
| `/admin-dashboard` | Admin | Panel de administración |
| `/user-requests` | Admin | Gestión de solicitudes |
| `/admin-proyectores` | Admin | CRUD de proyectores |
| `/faulty-projectors` | Admin | Proyectores con fallas reportadas |
| `/reports` | Admin | Reportes y estadísticas |
| `/asignar-directo` | Admin | Asignación directa vía QR |
| `/devolver-proyector` | Admin | Devolución de proyector vía QR |

---

## API — Endpoints principales

| Grupo | Método | Ruta | Descripción |
|-------|--------|------|-------------|
| Auth | POST | `/login` | Login con Google credential |
| Auth | POST | `/logout` | Cerrar sesión |
| Auth | GET | `/check-session` | Verificar sesión activa |
| Auth | POST | `/refresh-token` | Renovar JWT |
| Usuarios | GET | `/usuarios` | Listar usuarios (admin) |
| Usuarios | PUT | `/update-user` | Actualizar perfil |
| Solicitudes | POST | `/solicitar-proyector` | Crear solicitud |
| Solicitudes | GET | `/mis-solicitudes` | Solicitudes del usuario |
| Solicitudes | PUT | `/solicituds/:id` | Aprobar/rechazar (admin) |
| Proyectores | GET | `/api/proyectores` | Inventario completo |
| Proyectores | POST | `/api/proyectores` | Crear proyector (admin) |
| Proyectores | PUT | `/api/proyectores/:id` | Actualizar proyector |
| Proyectores | DELETE | `/api/proyectores/:id` | Eliminar proyector |
| Documentos | POST | `/upload-pdf` | Subir PDF a Cloudinary |
| Notificaciones | GET | `/api/notifications` | Notificaciones del usuario |
| Reportes | GET | `/api/reports` | Datos para estadísticas |

---

## Modelos de datos

```
User         → nombre, email, grado, grupo, turno, isAdmin, theme, darkMode
Solicitud    → usuarioId, proyectorId, motivo, fechaInicio, fechaFin, estado
Proyector    → codigo (PRY-{grado}{grupo}-{4chars}), grado, grupo, turno, estado
Document     → fileName, fileUrl, usuarioId, expirationDate (+7 días)
Notification → usuarioId, mensaje, tipo, leida, entidadId
ProyectorComment → solicitudId, issues[], comments, status
```

---

## Despliegue

| Servicio | Plataforma | URL |
|---------|-----------|-----|
| Frontend | Vercel | `https://control-proyectores-unach.vercel.app` |
| Backend | Render | `https://control-proyectores-x0w2.onrender.com` |

El despliegue es automático desde la rama `master` en ambas plataformas.

---

## Notas importantes

- **Admins**: para agregar un administrador, editar únicamente `backend/config/adminEmails.js`
- **Acceso restringido**: solo correos `@unach.mx` más los emails en `adminEmails.js`
- **Primer login**: se abre un modal para capturar grado, grupo y turno del docente
- **Cron job**: cada domingo a las 00:00 se eliminan archivos de Cloudinary y registros de `Document` con más de 7 días
- **Tokens**: almacenados en `sessionStorage` (no `localStorage`) por seguridad

---

## Contribución

1. Crear una rama desde `master`: `git checkout -b feat/mi-feature`
2. Hacer cambios y commit: `git commit -m "feat: descripción"`
3. Push y abrir PR hacia `master`

---

<p align="center">
  Desarrollado para la <strong>Universidad Autónoma de Chiapas</strong>
</p>
