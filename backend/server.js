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
    'https://control-proyectores-silk.vercel.app',
    'https://control-proyectores-unach.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
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

// Conectar a MongoDB e iniciar servidor
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Conectado a MongoDB Atlas!');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });
