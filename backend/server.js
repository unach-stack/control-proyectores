require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Document = require('./models/Document');
const { cleanupOldFiles } = require('./services/cloudinaryService');

// Validar variables de entorno críticas
if (!process.env.CLIENT_ID || !process.env.JWT_SECRET) {
  console.error('Error: Variables de entorno no configuradas correctamente');
  console.error('CLIENT_ID:', process.env.CLIENT_ID ? 'Presente' : 'Falta');
  console.error('JWT_SECRET:', process.env.JWT_SECRET ? 'Presente' : 'Falta');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL?.trim(),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://10.34.222.254:3000',
    'http://control-proyectores.duckdns.org',
    'https://control-proyectores.duckdns.org'
  ],
  credentials: true,
}));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://accounts.google.com https://*.google.com; " +
    "frame-src 'self' https://accounts.google.com https://*.google.com; " +
    "script-src 'self' https://accounts.google.com https://*.googleusercontent.com 'unsafe-inline' 'unsafe-eval';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;");
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de control de proyectores' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/userRoutes'));
app.use('/', require('./routes/solicitudRoutes'));
app.use('/', require('./routes/documentRoutes'));
app.use('/', require('./routes/notificationRoutes'));
app.use('/', require('./routes/adminRoutes'));
app.use('/', require('./routes/comentariosRoutes'));
app.use('/api/proyectores', require('./routes/proyectorRoutes'));
app.use('/qr-codes', require('./routes/qrCodeRoutes'));
app.use('/', require('./routes/encargadoRoutes'));
app.use('/', require('./routes/perfilCorrectionRoutes'));

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Limpieza semanal (cada domingo a las 00:00)
cron.schedule('0 0 * * 0', async () => {
  console.log('Ejecutando limpieza programada de archivos...');
  try {
    await cleanupOldFiles();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await Document.deleteMany({ createdAt: { $lt: oneWeekAgo } });
    console.log(`Limpieza completada. ${result.deletedCount} registros eliminados.`);
  } catch (err) {
    console.error('Error en limpieza programada:', err);
  }
});

// Cron miércoles 12:00 — marcar noSePresento a encargados sin solicitudes
cron.schedule('0 12 * * 3', async () => {
  try {
    const { getISOWeek, getMondayOfWeek } = require('./utils/weekUtils');
    const Encargado = require('./models/Encargado');
    const Solicitud = require('./models/Solicitud');
    const Notification = require('./models/Notification');

    const semana = getISOWeek(new Date());
    const lunes = getMondayOfWeek(semana);
    const encargados = await Encargado.find({ semana, tipo: 'titular', estado: 'activo', noSePresento: false });

    for (const enc of encargados) {
      const count = await Solicitud.countDocuments({ usuarioId: enc.usuarioId, createdAt: { $gte: lunes } });
      if (count === 0) {
        await Encargado.findByIdAndUpdate(enc._id, { noSePresento: true });
        await Notification.create({
          usuarioId: enc.usuarioId,
          mensaje: 'No has registrado solicitudes de proyector esta semana. Tu grupo puede solicitar un encargado provisional.',
          tipo: 'warning',
          entidadId: enc._id,
          entidadTipo: 'Encargado'
        });
      }
    }
    console.log('Cron miércoles: verificación noSePresento completada.');
  } catch (err) {
    console.error('Error en cron miércoles:', err);
  }
});

// Cron lunes 00:01 — activar encargados designados para la semana nueva
cron.schedule('1 0 * * 1', async () => {
  try {
    const Encargado = require('./models/Encargado');
    const { getISOWeek } = require('./utils/weekUtils');
    const semana = getISOWeek(new Date());
    const result = await Encargado.updateMany(
      { semana, estado: 'postulado' },
      { $set: { estado: 'activo' } }
    );
    console.log(`Cron lunes: ${result.modifiedCount} encargados activados para semana ${semana}.`);
  } catch (err) {
    console.error('Error en cron lunes:', err);
  }
});

// Cron domingo 23:59 — cerrar encargadurías de la semana
cron.schedule('59 23 * * 0', async () => {
  try {
    const Encargado = require('./models/Encargado');
    const { getISOWeek } = require('./utils/weekUtils');
    const semana = getISOWeek(new Date());
    const result = await Encargado.updateMany(
      { semana, estado: 'activo' },
      { $set: { estado: 'inactivo' } }
    );
    console.log(`Cron domingo: ${result.modifiedCount} encargadurías cerradas para semana ${semana}.`);
  } catch (err) {
    console.error('Error en cron domingo:', err);
  }
});

// Cron jueves 08:00 — recordatorio de postulación para la semana siguiente
cron.schedule('0 8 * * 4', async () => {
  try {
    const User = require('./models/User');
    const Notification = require('./models/Notification');
    const { getNextISOWeek, getISOWeek } = require('./utils/weekUtils');
    const Encargado = require('./models/Encargado');

    const semanaProxima = getNextISOWeek(getISOWeek(new Date()));

    // Obtener todos los usuarios con perfil completo que no son admins
    const usuarios = await User.find({
      grado: { $ne: null },
      grupo: { $ne: null },
      turno: { $ne: null },
      isAdmin: false
    }).select('_id');

    // Filtrar los que ya tienen encargado designado para la próxima semana (no necesitan postularse)
    const encargadosProxSemana = await Encargado.find({ semana: semanaProxima }).select('usuarioId grado grupo turno');
    const gruposConEncargado = new Set(encargadosProxSemana.map(e => `${e.grado}-${e.grupo}-${e.turno}`));

    const usuariosConPerfil = await User.find({
      grado: { $ne: null },
      grupo: { $ne: null },
      turno: { $ne: null },
      isAdmin: false
    }).select('_id grado grupo turno');

    const notificaciones = usuariosConPerfil
      .filter(u => !gruposConEncargado.has(`${u.grado}-${u.grupo}-${u.turno}`))
      .map(u => ({
        usuarioId: u._id,
        mensaje: '¡Recuerda postularte como Encargado para la próxima semana! Las postulaciones están abiertas hoy y mañana (jueves y viernes).',
        tipo: 'info',
        entidadTipo: 'Encargado'
      }));

    if (notificaciones.length > 0) {
      await Notification.insertMany(notificaciones);
    }
    console.log(`Cron jueves: ${notificaciones.length} recordatorios de postulación enviados.`);
  } catch (err) {
    console.error('Error en cron jueves:', err);
  }
});

// Conectar a MongoDB e iniciar servidor
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Conectado a MongoDB local!');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });
