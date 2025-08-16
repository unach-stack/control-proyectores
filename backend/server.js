require('dotenv').config();
// console.log('Variables de entorno:', {
//   MONGODB_URI: process.env.MONGODB_URI ? 'Presente' : 'Falta',
//   CLIENT_ID: process.env.CLIENT_ID ? 'Presente' : 'Falta',
//   JWT_SECRET: process.env.JWT_SECRET ? 'Presente' : 'Falta'
// });

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Solicitud = require('./models/Solicitud');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');
const Proyector = require('./models/Proyector');
const multer = require('multer');
const path = require('path');
const Document = require('./models/Document');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const FileType = require('file-type');
const proyectorRoutes = require('./routes/proyectorRoutes');
const Notification = require('./models/Notification');
const cleanupFiles = require('./utils/cleanupFiles');
const cron = require('node-cron');
const { uploadPdf, cleanupOldFiles, verificarUrlCloudinary } = require('./services/cloudinaryService');
const qrCodeRoutes = require('./routes/qrCodeRoutes');

// Lista de correos administrativos - MOVER ESTA DEFINICIÓN AL NIVEL SUPERIOR
const ADMIN_EMAILS = [
  'proyectoresunach@gmail.com',
  'fanny.cordova@unach.mx',
  'nidia.guzman@unach.mx',
  'deysi.gamboa@unach.mx',
  'diocelyne.arrevillaga@unach.mx',
  'karol.carrazco@unach.mx',
  'karen.portillo@unach.mx',
  'pedro.escobar@unach.mx',
  'brianes666@gmail.com',
  'brianfloresxxd@gmail.com',
  'nuevo.correo@unach.mx'
];

if (!process.env.CLIENT_ID || !process.env.JWT_SECRET) {
  console.error('Error: Variables de entorno no configuradas correctamente');
  console.error('CLIENT_ID:', process.env.CLIENT_ID ? 'Presente' : 'Falta');
  console.error('JWT_SECRET:', process.env.JWT_SECRET ? 'Presente' : 'Falta');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const oauth2Client = new OAuth2Client(CLIENT_ID);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
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
  console.log('Petición recibida:', {
    método: req.method,
    ruta: req.path,
    parámetros: req.params,
    cuerpo: req.body
  });
  next();
});

app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;");
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de control de proyectores' });
});

app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await User.find();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
});

const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Lista de correos administrativos
    const ADMIN_EMAILS = [
      'proyectoresunach@gmail.com',
      'fanny.cordova@unach.mx',
      'nidia.guzman@unach.mx',
      'deysi.gamboa@unach.mx',
      'diocelyne.arrevillaga@unach.mx',
      'karol.carrazco@unach.mx',
      'karen.portillo@unach.mx',
      'pedro.escobar@unach.mx',
      'brianes666@gmail.com',
      'brianfloresxxd@gmail.com',
      'nuevo.correo@unach.mx'
    ];
    
    // Asegurarse de que isAdmin esté correctamente establecido
    if (!decoded.isAdmin && ADMIN_EMAILS.includes(decoded.email)) {
      decoded.isAdmin = true;
    }
    
    req.user = decoded;
    console.log("Usuario verificado:", {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin
    });
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

app.get('/check-session', verifyToken, async (req, res) => {
  try {
    // Buscar el usuario en la base de datos para obtener los datos más actualizados
    const usuario = await User.findById(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Imprimir los datos del usuario para depuración
    console.log('Datos del usuario enviados:', usuario);
    
    // Devolver todos los datos del usuario
    res.json({ 
      user: usuario,
      message: 'Sesión válida' 
    });
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    res.status(500).json({ message: 'Error al verificar la sesión' });
  }
});

app.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Acceso concedido', user: req.user });
});

app.post('/login', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ message: 'Token no proporcionado' });
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    // console.log('Google payload:', payload);

    if (!payload) {
      return res.status(401).json({ message: 'Payload de Google inválido' });
    }

    const { email, name, picture } = payload;

    // Lista de correos administrativos
    const ADMIN_EMAILS = [
      'proyectoresunach@gmail.com',
      'fanny.cordova@unach.mx',
      'nidia.guzman@unach.mx',
      'deysi.gamboa@unach.mx',
      'diocelyne.arrevillaga@unach.mx',
      'karol.carrazco@unach.mx',
      'karen.portillo@unach.mx',
      'pedro.escobar@unach.mx',
      'brianes666@gmail.com',
      'brianfloresxxd@gmail.com',
      'nuevo.correo@unach.mx'
    ];

    if (!email.endsWith('@unach.mx') && !ADMIN_EMAILS.includes(email)) {
      return res.status(401).json({ 
        message: 'Solo se permiten correos institucionales (@unach.mx) o administradores autorizados' 
      });
    }

    let pvez = null;
    let usuario = await User.findOne({ email });
    if (!usuario) {
      usuario = new User({
        nombre: name,
        email: email,
        picture: picture,
        isAdmin: ADMIN_EMAILS.includes(email)
      });
      await usuario.save();
      pvez = true
    }else{
      if(usuario.grado === null && usuario.grupo === null && usuario.turno === null){
        pvez = true
      }
    }


    const jwtToken = jwt.sign(
      { 
        id: usuario._id,
        email: usuario.email,
        isAdmin: ADMIN_EMAILS.includes(email)
      }, 
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: usuario._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Usuario autenticado:', {
      email: usuario.email,
      isAdmin: email === 'proyectoresunach@gmail.com'
    });

    res.status(200).json({ 
      message: 'Login exitoso',
      user: usuario,
      token: jwtToken,
      refreshToken,
      pvez
    });

  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ 
      message: 'Autenticación fallida',
      error: error.message 
    });
  }
});

app.post('/calendar-event', verifyToken, async (req, res) => {
  const user = req.user;
  const googleToken = user.googleToken;

  try {
    const calendarApiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    
    const event = {
      summary: 'Solicitud de proyector',
      start: {
        dateTime: '2024-10-02T09:00:00-07:00',
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: '2024-10-02T10:00:00-07:00',
        timeZone: 'America/Mexico_City',
      },
    };

    const response = await axios.post(calendarApiUrl, event, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
      }
    });

    res.status(200).json({ message: 'Evento creado en Google Calendar', event: response.data });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear evento en Google Calendar', error });
  }
});

app.put('/update-user', verifyToken, async (req, res) => {
  try {
    const { grado, grupo, turno } = req.body;
    const userId = req.user.id;

    // Validar los datos recibidos
    if (!grado || !grupo || !turno) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Actualizar el usuario
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        grado, 
        grupo, 
        turno 
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({ 
      message: 'Usuario actualizado correctamente',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      message: 'Error al actualizar el usuario',
      error: error.message 
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.get('/solicitudes', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      console.error(`Acceso denegado para ${req.user.email}. No es administrador.`);
      return res.status(403).json({ 
        message: 'Acceso denegado. Se requieren permisos de administrador.',
        userInfo: {
          email: req.user.email,
          isAdmin: req.user.isAdmin
        }
      });
    }
    
    console.log(`Solicitud de solicitudes por admin: ${req.user.email}`);
    
    // Obtener todas las solicitudes con información de usuario
    const solicitudes = await Solicitud.find()
      .populate('usuarioId')
      .populate('proyectorId')
      .sort({ fechaInicio: -1 });
    
    console.log(`Solicitudes encontradas: ${solicitudes.length}`);
    
    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ 
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  }
});

app.post('/solicitar-proyector', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, motivo, eventId, grado, grupo, turno } = req.body;
    const usuarioId = req.user.id;
    
    // Log para debugging
    // console.log('Datos recibidos:', {
    //   fechaInicio,
    //   fechaFin,
    //   motivo,
    //   eventId,
    //   grado,
    //   grupo,
    //   turno,
    //   usuarioId
    // });

    // Validaciones mejoradas
    if (!fechaInicio || !fechaFin || !motivo || !eventId) {
      return res.status(400).json({ 
        message: 'Los campos fechaInicio, fechaFin, motivo y eventId son requeridos',
        camposRecibidos: {
          fechaInicio: !!fechaInicio,
          fechaFin: !!fechaFin,
          motivo: !!motivo,
          eventId: !!eventId
        }
      });
    }

    // Convertir fechas a objetos Date
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    const proyectorId = new mongoose.Types.ObjectId('650000000000000000000001');

    const nuevaSolicitud = new Solicitud({
      usuarioId: new mongoose.Types.ObjectId(usuarioId),
      proyectorId,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      motivo,
      eventId,
      grado: grado || null,
      grupo: grupo || null,
      turno: turno || null,
      estado: 'pendiente'
    });

    // Log antes de guardar
    console.log('Nueva solicitud a guardar:', nuevaSolicitud);

    const solicitudGuardada = await nuevaSolicitud.save();
    const solicitudConUsuario = await solicitudGuardada.populate('usuarioId');

    res.status(201).json({ 
      message: 'Solicitud creada exitosamente',
      solicitud: solicitudConUsuario
    });

  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({ 
      message: 'Error al procesar la solicitud',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/refresh-token', async (req, res) => {
  const refreshToken = req.headers['authorization']?.split(' ')[1];
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const newToken = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        isAdmin: user.email === 'proyectoresunach@gmail.com'
      }, 
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Error al renovar token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Middleware para verificar si es admin
const isAdmin = async (req, res, next) => {
  const userEmail = req.user.email;
  const ADMIN_EMAILS = [
    'proyectoresunach@gmail.com',
    'fanny.cordova@unach.mx',
    'nidia.guzman@unach.mx',
    'deysi.gamboa@unach.mx',
    'diocelyne.arrevillaga@unach.mx',
    'karol.carrazco@unach.mx',
    'karen.portillo@unach.mx',
    'pedro.escobar@unach.mx',
    'brianes666@gmail.com',
    'brianfloresxxd@gmail.com'
  ];
  
  if (!ADMIN_EMAILS.includes(userEmail)) {
    console.log('Acceso denegado para:', userEmail);
    return res.status(403).json({ 
      message: 'Acceso denegado: Se requieren privilegios de administrador' 
    });
  }
  
  console.log('Acceso de administrador concedido para:', userEmail);
  next();
};

// Rutas protegidas para admin
app.get('/admin/usuarios', verifyToken, isAdmin, async (req, res) => {
  try {
    const usuarios = await User.find();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
});

app.get('/admin/solicitudes', verifyToken, isAdmin, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find().populate('usuarioId', 'nombre email');
    res.status(200).json(solicitudes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las solicitudes', error });
  }
});

app.put('/solicituds/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, proyectorId } = req.body;

    // Validar que el estado sea uno de los permitidos
    const estadosPermitidos = ['pendiente', 'aprobado', 'rechazado'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado no válido. Debe ser: pendiente, aprobado o rechazado' 
      });
    }

    //console.log('Actualizando solicitud:', { id, estado });

    const solicitudActualizada = await Solicitud.findByIdAndUpdate(
      id,
      { estado, proyectorId },
      { new: true }
    );

    if (!solicitudActualizada) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json({ 
      message: 'Estado actualizado correctamente',
      solicitud: solicitudActualizada 
    });

  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ message: 'Error al actualizar solicitud' });
  }
});

const uri = process.env.MONGODB_URI; // Asegurate de que esto esté configurado

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// Ruta para obtener datos de reportes (solo administradores)
app.get('/api/reports', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, estado, turno } = req.query;
    
    console.log('Parámetros recibidos para reporte:', { startDate, endDate, estado, turno });
    
    // 1. Construir el filtro base para las fechas y el estado
    let matchFilter = {
      fechaInicio: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    
    if (estado && estado !== 'todos') {
      matchFilter.estado = estado;
    }
    
    console.log('Filtro base:', matchFilter);
    
    // 2. Obtener todas las solicitudes que coincidan con los filtros
    const solicitudes = await Solicitud.find(matchFilter)
      .populate('usuarioId', 'nombre email grado grupo turno')
      .populate('proyectorId', 'codigo estado');
    
    console.log('Solicitudes encontradas (antes de filtrar por turno):', solicitudes.length);
    
    // 3. Filtrar por turno si es necesario
    let solicitudesFiltradas = solicitudes;
    if (turno && turno !== 'todos') {
      console.log('Filtrando por turno:', turno);
      solicitudesFiltradas = solicitudes.filter(s => {
        const userTurno = s.usuarioId ? s.usuarioId.turno : null;
        console.log(`Solicitud ${s._id}: turno usuario = ${userTurno}, buscando = ${turno}`);
        return userTurno && userTurno.toLowerCase() === turno.toLowerCase();
      });
      console.log('Solicitudes después de filtrar por turno:', solicitudesFiltradas.length);
    }
    
    // 4. Contar solicitudes por estado
    const solicitudesPorEstado = {
      pendiente: solicitudesFiltradas.filter(s => s.estado === 'pendiente').length,
      aprobado: solicitudesFiltradas.filter(s => s.estado === 'aprobado').length,
      rechazado: solicitudesFiltradas.filter(s => s.estado === 'rechazado').length
    };
    
    // 5. Contar solicitudes por turno
    const solicitudesPorTurno = {
      matutino: solicitudesFiltradas.filter(s => s.usuarioId && s.usuarioId.turno && s.usuarioId.turno.toLowerCase() === 'matutino').length,
      vespertino: solicitudesFiltradas.filter(s => s.usuarioId && s.usuarioId.turno && s.usuarioId.turno.toLowerCase() === 'vespertino').length
    };
    
    console.log('Solicitudes por turno:', solicitudesPorTurno);
    
    // 6. Obtener estado de proyectores
    const proyectores = await Proyector.find({});
    const proyectoresPorEstado = {
      disponible: proyectores.filter(p => p.estado === 'disponible').length,
      enUso: proyectores.filter(p => p.estado === 'en uso').length,
      mantenimiento: proyectores.filter(p => p.estado === 'mantenimiento').length
    };
    
    // 7. Agrupar solicitudes por día
    const solicitudesPorDia = [];
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    
    // Crear un mapa para contar solicitudes por día
    const solicitudesPorFecha = {};
    
    // Inicializar el mapa con todas las fechas en el rango
    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const fechaStr = d.toISOString().split('T')[0];
      solicitudesPorFecha[fechaStr] = 0;
    }
    
    // Contar solicitudes por fecha
    solicitudesFiltradas.forEach(solicitud => {
      const fecha = new Date(solicitud.fechaInicio).toISOString().split('T')[0];
      if (solicitudesPorFecha[fecha] !== undefined) {
        solicitudesPorFecha[fecha]++;
      }
    });
    
    // Convertir el mapa a un array para la respuesta
    for (const [fecha, cantidad] of Object.entries(solicitudesPorFecha)) {
      solicitudesPorDia.push({ fecha, cantidad });
    }
    
    // 8. Obtener las últimas 10 solicitudes
    const ultimasSolicitudes = solicitudesFiltradas
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
      .slice(0, 10)
      .map(s => ({
        id: s._id,
        usuario: s.usuarioId ? s.usuarioId.nombre : 'Usuario no encontrado',
        fecha: new Date(s.fechaInicio).toISOString().split('T')[0],
        estado: s.estado,
        turno: s.usuarioId ? s.usuarioId.turno : 'Turno no definido'
      }));
    
    const responseData = {
      totalSolicitudes: solicitudesFiltradas.length,
      solicitudesPorEstado,
      solicitudesPorTurno,
      proyectoresPorEstado,
      solicitudesPorDia,
      ultimasSolicitudes
    };
    
    console.log('Respuesta final:', responseData);
    
    // Construir y enviar la respuesta
    res.json(responseData);
    
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ message: 'Error al generar reporte' });
  }
});

app.get('/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    // Agregar más logs para debugging
    //console.log('Token recibido:', req.headers.authorization);
    //console.log('Usuario autenticado:', {
    //  id: req.user.id,
    //  email: req.user.email
    //});

    const solicitudes = await Solicitud.find({ 
      usuarioId: req.user.id 
    });
    
    // Log para ver la consulta
    //console.log('Consulta MongoDB:', {
    //  usuarioId: req.user.id,
    //  encontradas: solicitudes.length
    //});

    // Si no hay solicitudes, enviar array vacío pero con mensaje
    if (!solicitudes || solicitudes.length === 0) {
      console.log('No se encontraron solicitudes para el usuario');
      return res.json([]);
    }

    const solicitudesFormateadas = await Solicitud.find({ 
      usuarioId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .select('_id motivo fechaInicio fechaFin estado')
    .lean();

    res.json(solicitudesFormateadas);
  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({ 
      message: 'Error al obtener solicitudes',
      error: error.message 
    });
  }
});

// Ruta para obtener estadísticas del dashboard
app.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todas las solicitudes del usuario
    const solicitudesUsuario = await Solicitud.find({ usuarioId: userId });
    
    // Calcular estadísticas
    const stats = {
      solicitudesActivas: solicitudesUsuario.filter(s => s.estado === 'aprobado').length,
      misSolicitudes: solicitudesUsuario.length,
      // Otras estadísticas que quieras incluir
      proyectoresDisponibles: await Proyector.countDocuments({ estado: 'disponible' }),
      solicitudesPendientes: solicitudesUsuario.filter(s => s.estado === 'pendiente').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error.message 
    });
  }
});

app.get('/api/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({ 
      usuarioId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .populate('proyectorId', 'nombre codigo')
    .select('materia profesor salon fechaInicio fechaFin estado motivo comentarios')
    .lean();

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});

// Endpoint para subir PDFs
app.post('/upload-pdf', verifyToken, async (req, res) => {
  try {
    console.log("Iniciando proceso de subida de PDF");
    // Verificar si el usuario ya ha subido un documento esta semana
    const userId = req.user.id;
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
    
    const existingDoc = await Document.findOne({
      usuarioId: userId,
      createdAt: { $gte: startOfWeek }
    });
    
    if (existingDoc) {
      return res.status(403).json({
        message: 'Ya has subido un documento esta semana. Solo se permite un documento por usuario por semana.'
      });
    }
    
    // Proceder con la subida si no hay documentos esta semana
    uploadPdf.single('file')(req, res, async (err) => {
      if (err) {
        console.error("Error en multer durante la subida:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'El archivo excede el límite de 2MB' });
        }
        return res.status(400).json({ message: err.message });
      }
      
      if (!req.file) {
        console.error("No se recibió ningún archivo en la solicitud");
        return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      }
      
      console.log("Archivo subido a Cloudinary. Detalles completos:", JSON.stringify(req.file, null, 2));
      console.log("URL del archivo en Cloudinary:", req.file.path);
      console.log("Nombre original del archivo:", req.file.originalname);
      
      // Asegurarse de que estamos usando la URL correcta de Cloudinary
      const fileUrl = req.file.path;
      
      // Crear registro en la base de datos con la URL de Cloudinary
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      
      const newDocument = new Document({
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl: fileUrl,
        usuarioId: userId,
        email: req.body.email,
        nombre: req.body.nombre,
        grado: req.body.grado,
        grupo: req.body.grupo,
        turno: req.body.turno,
        estado: 'pendiente',
        expirationDate: expirationDate
      });
      
      const savedDocument = await newDocument.save();
      console.log("Documento guardado en la base de datos:", JSON.stringify(savedDocument, null, 2));
      
      // Crear notificación para administradores
      const admins = await User.find({ isAdmin: true });
      
      for (const admin of admins) {
        const notification = new Notification({
          tipo: 'documento',
          mensaje: `${req.body.nombre} ha subido un nuevo documento para revisión`,
          destinatario: admin._id,
          remitente: userId,
          leida: false,
          enlace: `/admin/documentos`,
          entidadId: savedDocument._id,
          entidadTipo: 'Document'
        });
        
        await notification.save();
      }
      
      res.status(201).json({ 
        message: 'Documento subido correctamente',
        document: savedDocument
      });
    });
  } catch (error) {
    console.error("Error general en la subida de PDF:", error);
    res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
  }
});

// Endpoint para obtener la lista de correos de administradores
app.get('/api/admin-emails', (req, res) => {
  try {
    console.log("Petición recibida para obtener correos de administradores");
    res.json({ adminEmails: ADMIN_EMAILS });
  } catch (error) {
    console.error('Error al obtener correos de administradores:', error);
    res.status(500).json({ message: 'Error al obtener correos de administradores', error: error.message });
  }
});

// Endpoint para obtener los datos más recientes del usuario
app.get('/user-data', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('Datos del usuario enviados desde /user-data:', usuario);
    
    res.json({ 
      user: usuario
    });
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener datos del usuario' });
  }
});

// Endpoint para ver documentos sin token (solo para visualización)
app.get('/view-document/:id', async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    // Usar la URL de Cloudinary directamente
    const fileUrl = documento.fileUrl || documento.filePath;
    
    if (!fileUrl) {
      return res.status(404).json({ message: 'URL del documento no encontrada' });
    }
    
    // Redirigir al usuario a la URL de Cloudinary
    return res.redirect(fileUrl);
    
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ message: 'Error al obtener documento', error: error.message });
  }
});

// Ruta para crear notificación
app.post('/api/notifications', verifyToken, isAdmin, async (req, res) => {
  try {
    const { usuarioId, mensaje, tipo } = req.body;
    
    const notification = new Notification({
      usuarioId,
      mensaje,
      tipo
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear notificación' });
  }
});

// Ruta para obtener notificaciones del usuario
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      usuarioId: req.user.id,
      leida: false 
    }).sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
});

// Ruta para marcar notificación como leída
app.put('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar notificación' });
  }
});

// Ruta para marcar todas las notificaciones como leídas
app.put('/api/notifications/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        usuarioId: req.user.id,
        leida: false 
      },
      { leida: true }
    );
    
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ message: 'Error al actualizar notificaciones' });
  }
});
  

// Programar limpieza semanal (cada domingo a las 00:00)
cron.schedule('0 0 * * 0', async () => {
  console.log('Ejecutando limpieza programada de archivos...');
  try {
    // Limpiar archivos en Cloudinary
    const deletedCount = await cleanupOldFiles();
    
    // Limpiar registros en la base de datos
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const result = await Document.deleteMany({
      createdAt: { $lt: oneWeekAgo }
    });
    
    console.log(`Limpieza de base de datos completada. ${result.deletedCount} registros eliminados.`);
  } catch (err) {
    console.error('Error en limpieza programada:', err);
  }
});

// Endpoint para obtener documentos por usuario
app.get('/documentos/usuario/:id', verifyToken, async (req, res) => {
  try {
    console.log("Buscando documentos para el usuario:", req.params.id);
    const documentos = await Document.find({ usuarioId: req.params.id });
    console.log("Documentos encontrados:", documentos.length);
    
    if (documentos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron documentos para este usuario' });
    }
    
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener documentos del usuario' });
  }
});

// Agregar un endpoint para verificar un documento específico
app.get('/verificar-documento/:id', verifyToken, async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    console.log("Documento encontrado:", JSON.stringify(documento, null, 2));
    
    // Verificar si la URL es accesible
    const fileUrl = documento.fileUrl || documento.filePath;
    
    res.json({
      documento,
      urlVerificada: fileUrl,
      mensaje: 'Usa esta URL para acceder al documento'
    });
  } catch (error) {
    console.error('Error al verificar documento:', error);
    res.status(500).json({ message: 'Error al verificar documento' });
  }
});

// Endpoint para diagnosticar problemas con documentos
app.get('/api/diagnostico-documentos', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    // Obtener todos los documentos
    const documentos = await Document.find().sort({ createdAt: -1 }).limit(10);
    
    // Verificar cada documento
    const resultados = [];
    
    for (const doc of documentos) {
      const url = doc.fileUrl || doc.filePath;
      
      let verificacion;
      try {
        // Intentar verificar la URL en Cloudinary
        verificacion = await verificarUrlCloudinary(url);
      } catch (error) {
        verificacion = { valido: false, error: error.message };
      }
      
      resultados.push({
        _id: doc._id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        filePath: doc.filePath,
        createdAt: doc.createdAt,
        verificacion
      });
    }
    
    res.json({
      mensaje: 'Diagnóstico completado',
      documentos: resultados,
      configuracion: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: '***' + process.env.CLOUDINARY_API_KEY.slice(-4) // Solo mostrar los últimos 4 dígitos por seguridad
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico de documentos:', error);
    res.status(500).json({ message: 'Error en diagnóstico', error: error.message });
  }
});

// Rutas para proyectores
app.get('/api/proyectores', verifyToken, async (req, res) => {
  try {
    console.log("Solicitud recibida para obtener proyectores");
    const proyectores = await Proyector.find();
    console.log(`Se encontraron ${proyectores.length} proyectores`);
    res.json(proyectores);
  } catch (error) {
    console.error('Error al obtener proyectores:', error);
    res.status(500).json({ message: 'Error al obtener proyectores', error: error.message });
  }
});

app.post('/api/proyectores', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { grado, grupo, turno, estado } = req.body;
    
    // Generar código automáticamente
    const codigo = `PRY-${grado}${grupo}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const nuevoProyector = new Proyector({
      codigo,
      grado,
      grupo,
      turno,
      estado
    });
    
    const proyectorGuardado = await nuevoProyector.save();
    res.status(201).json(proyectorGuardado);
  } catch (error) {
    console.error('Error al crear proyector:', error);
    res.status(500).json({ message: 'Error al crear proyector', error: error.message });
  }
});

app.put('/api/proyectores/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    
    const proyectorActualizado = await Proyector.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    
    if (!proyectorActualizado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }
    
    res.json(proyectorActualizado);
  } catch (error) {
    console.error('Error al actualizar proyector:', error);
    res.status(500).json({ message: 'Error al actualizar proyector' });
  }
});

app.delete('/api/proyectores/:id', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    const proyectorEliminado = await Proyector.findByIdAndDelete(req.params.id);
    
    if (!proyectorEliminado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }
    
    res.json({ message: 'Proyector eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar proyector:', error);
    res.status(500).json({ message: 'Error al eliminar proyector', error: error.message });
  }
});

app.use('/qr-codes', qrCodeRoutes);

// Ruta para actualizar el tema del usuario
app.put('/update-theme', async (req, res) => {
  try {
    const { theme, darkMode } = req.body;
    let userId;

    // Si hay token, actualizar el usuario específico
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      
      await User.findByIdAndUpdate(userId, { theme, darkMode });
    }

    // Siempre actualizar el último tema usado
    await User.findOneAndUpdate(
      {},
      { theme, darkMode },
      { 
        sort: { updatedAt: -1 },
        upsert: true // Crear si no existe
      }
    );

    res.json({ success: true, theme, darkMode });
  } catch (error) {
    console.error('Error al actualizar tema:', error);
    res.status(500).json({ message: 'Error al actualizar el tema' });
  }
});

// Ruta para obtener el tema del usuario
app.get('/user-theme', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const usuario = await User.findById(userId);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ 
      theme: usuario.theme || 'default',
      darkMode: usuario.darkMode || false
    });
    
  } catch (error) {
    console.error('Error al obtener tema:', error);
    res.status(500).json({ 
      message: 'Error al obtener el tema',
      error: error.message 
    });
  }
});

// Ruta para obtener el último tema usado (sin autenticación)
app.get('/last-theme', async (req, res) => {
  try {
    // Obtener el último tema y darkMode usados
    const ultimoTema = await User.findOne({}, { theme: 1, darkMode: 1 })
      .sort({ updatedAt: -1 })
      .limit(1);
    
    // Asegurarnos de enviar ambos valores
    res.json({ 
      theme: ultimoTema?.theme || 'default',
      darkMode: ultimoTema?.darkMode || false
    });
  } catch (error) {
    console.error('Error al obtener último tema:', error);
    res.status(500).json({ 
      message: 'Error al obtener el tema',
      error: error.message 
    });
  }
});


// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => {
    console.log('Conectado a MongoDB Atlas! 🥳');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });

app.get('/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    // Agregar más logs para debugging
    //console.log('Token recibido:', req.headers.authorization);
    //console.log('Usuario autenticado:', {
    //  id: req.user.id,
    //  email: req.user.email
    //});

    const solicitudes = await Solicitud.find({ 
      usuarioId: req.user.id 
    });
    
    // Log para ver la consulta
    //console.log('Consulta MongoDB:', {
    //  usuarioId: req.user.id,
    //  encontradas: solicitudes.length
    //});

    // Si no hay solicitudes, enviar array vacío pero con mensaje
    if (!solicitudes || solicitudes.length === 0) {
      console.log('No se encontraron solicitudes para el usuario');
      return res.json([]);
    }

    const solicitudesFormateadas = await Solicitud.find({ 
      usuarioId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .select('_id motivo fechaInicio fechaFin estado')
    .lean();

    res.json(solicitudesFormateadas);
  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({ 
      message: 'Error al obtener solicitudes',
      error: error.message 
    });
  }
});

// Ruta para obtener estadísticas del dashboard
app.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todas las solicitudes del usuario
    const solicitudesUsuario = await Solicitud.find({ usuarioId: userId });
    
    // Calcular estadísticas
    const stats = {
      solicitudesActivas: solicitudesUsuario.filter(s => s.estado === 'aprobado').length,
      misSolicitudes: solicitudesUsuario.length,
      // Otras estadísticas que quieras incluir
      proyectoresDisponibles: await Proyector.countDocuments({ estado: 'disponible' }),
      solicitudesPendientes: solicitudesUsuario.filter(s => s.estado === 'pendiente').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error.message 
    });
  }
});

app.get('/api/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({ 
      usuarioId: req.user.id 
    })
    .sort({ createdAt: -1 })
    .populate('proyectorId', 'nombre codigo')
    .select('materia profesor salon fechaInicio fechaFin estado motivo comentarios')
    .lean();

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});

// Endpoint para subir PDFs
app.post('/upload-pdf', verifyToken, async (req, res) => {
  try {
    console.log("Iniciando proceso de subida de PDF");
    // Verificar si el usuario ya ha subido un documento esta semana
    const userId = req.user.id;
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
    
    const existingDoc = await Document.findOne({
      usuarioId: userId,
      createdAt: { $gte: startOfWeek }
    });
    
    if (existingDoc) {
      return res.status(403).json({
        message: 'Ya has subido un documento esta semana. Solo se permite un documento por usuario por semana.'
      });
    }
    
    // Proceder con la subida si no hay documentos esta semana
    uploadPdf.single('file')(req, res, async (err) => {
      if (err) {
        console.error("Error en multer durante la subida:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'El archivo excede el límite de 2MB' });
        }
        return res.status(400).json({ message: err.message });
      }
      
      if (!req.file) {
        console.error("No se recibió ningún archivo en la solicitud");
        return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      }
      
      console.log("Archivo subido a Cloudinary. Detalles completos:", JSON.stringify(req.file, null, 2));
      console.log("URL del archivo en Cloudinary:", req.file.path);
      console.log("Nombre original del archivo:", req.file.originalname);
      
      // Asegurarse de que estamos usando la URL correcta de Cloudinary
      const fileUrl = req.file.path;
      
      // Crear registro en la base de datos con la URL de Cloudinary
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      
      const newDocument = new Document({
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl: fileUrl,
        usuarioId: userId,
        email: req.body.email,
        nombre: req.body.nombre,
        grado: req.body.grado,
        grupo: req.body.grupo,
        turno: req.body.turno,
        estado: 'pendiente',
        expirationDate: expirationDate
      });
      
      const savedDocument = await newDocument.save();
      console.log("Documento guardado en la base de datos:", JSON.stringify(savedDocument, null, 2));
      
      // Crear notificación para administradores
      const admins = await User.find({ isAdmin: true });
      
      for (const admin of admins) {
        const notification = new Notification({
          tipo: 'documento',
          mensaje: `${req.body.nombre} ha subido un nuevo documento para revisión`,
          destinatario: admin._id,
          remitente: userId,
          leida: false,
          enlace: `/admin/documentos`,
          entidadId: savedDocument._id,
          entidadTipo: 'Document'
        });
        
        await notification.save();
      }
      
      res.status(201).json({ 
        message: 'Documento subido correctamente',
        document: savedDocument
      });
    });
  } catch (error) {
    console.error("Error general en la subida de PDF:", error);
    res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
  }
});

// Endpoint para obtener la lista de correos de administradores
app.get('/api/admin-emails', (req, res) => {
  try {
    console.log("Petición recibida para obtener correos de administradores");
    res.json({ adminEmails: ADMIN_EMAILS });
  } catch (error) {
    console.error('Error al obtener correos de administradores:', error);
    res.status(500).json({ message: 'Error al obtener correos de administradores', error: error.message });
  }
});

// Endpoint para obtener los datos más recientes del usuario
app.get('/user-data', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('Datos del usuario enviados desde /user-data:', usuario);
    
    res.json({ 
      user: usuario
    });
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener datos del usuario' });
  }
});

// Endpoint para ver documentos sin token (solo para visualización)
app.get('/view-document/:id', async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    // Usar la URL de Cloudinary directamente
    const fileUrl = documento.fileUrl || documento.filePath;
    
    if (!fileUrl) {
      return res.status(404).json({ message: 'URL del documento no encontrada' });
    }
    
    // Redirigir al usuario a la URL de Cloudinary
    return res.redirect(fileUrl);
    
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ message: 'Error al obtener documento', error: error.message });
  }
});

// Ruta para crear notificación
app.post('/api/notifications', verifyToken, isAdmin, async (req, res) => {
  try {
    const { usuarioId, mensaje, tipo } = req.body;
    
    const notification = new Notification({
      usuarioId,
      mensaje,
      tipo
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear notificación' });
  }
});

// Ruta para obtener notificaciones del usuario
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      usuarioId: req.user.id,
      leida: false 
    }).sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
});

// Ruta para marcar notificación como leída
app.put('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar notificación' });
  }
});

// Ruta para marcar todas las notificaciones como leídas
app.put('/api/notifications/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        usuarioId: req.user.id,
        leida: false 
      },
      { leida: true }
    );
    
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ message: 'Error al actualizar notificaciones' });
  }
});
  

// Programar limpieza semanal (cada domingo a las 00:00)
cron.schedule('0 0 * * 0', async () => {
  console.log('Ejecutando limpieza programada de archivos...');
  try {
    // Limpiar archivos en Cloudinary
    const deletedCount = await cleanupOldFiles();
    
    // Limpiar registros en la base de datos
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const result = await Document.deleteMany({
      createdAt: { $lt: oneWeekAgo }
    });
    
    console.log(`Limpieza de base de datos completada. ${result.deletedCount} registros eliminados.`);
  } catch (err) {
    console.error('Error en limpieza programada:', err);
  }
});

// Endpoint para obtener documentos por usuario
app.get('/documentos/usuario/:id', verifyToken, async (req, res) => {
  try {
    console.log("Buscando documentos para el usuario:", req.params.id);
    const documentos = await Document.find({ usuarioId: req.params.id });
    console.log("Documentos encontrados:", documentos.length);
    
    if (documentos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron documentos para este usuario' });
    }
    
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener documentos del usuario' });
  }
});

// Agregar un endpoint para verificar un documento específico
app.get('/verificar-documento/:id', verifyToken, async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    console.log("Documento encontrado:", JSON.stringify(documento, null, 2));
    
    // Verificar si la URL es accesible
    const fileUrl = documento.fileUrl || documento.filePath;
    
    res.json({
      documento,
      urlVerificada: fileUrl,
      mensaje: 'Usa esta URL para acceder al documento'
    });
  } catch (error) {
    console.error('Error al verificar documento:', error);
    res.status(500).json({ message: 'Error al verificar documento' });
  }
});

// Endpoint para diagnosticar problemas con documentos
app.get('/api/diagnostico-documentos', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    // Obtener todos los documentos
    const documentos = await Document.find().sort({ createdAt: -1 }).limit(10);
    
    // Verificar cada documento
    const resultados = [];
    
    for (const doc of documentos) {
      const url = doc.fileUrl || doc.filePath;
      
      let verificacion;
      try {
        // Intentar verificar la URL en Cloudinary
        verificacion = await verificarUrlCloudinary(url);
      } catch (error) {
        verificacion = { valido: false, error: error.message };
      }
      
      resultados.push({
        _id: doc._id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        filePath: doc.filePath,
        createdAt: doc.createdAt,
        verificacion
      });
    }
    
    res.json({
      mensaje: 'Diagnóstico completado',
      documentos: resultados,
      configuracion: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: '***' + process.env.CLOUDINARY_API_KEY.slice(-4) // Solo mostrar los últimos 4 dígitos por seguridad
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico de documentos:', error);
    res.status(500).json({ message: 'Error en diagnóstico', error: error.message });
  }
});

// Rutas para proyectores
app.get('/api/proyectores', verifyToken, async (req, res) => {
  try {
    console.log("Solicitud recibida para obtener proyectores");
    const proyectores = await Proyector.find();
    console.log(`Se encontraron ${proyectores.length} proyectores`);
    res.json(proyectores);
  } catch (error) {
    console.error('Error al obtener proyectores:', error);
    res.status(500).json({ message: 'Error al obtener proyectores', error: error.message });
  }
});

app.post('/api/proyectores', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { grado, grupo, turno, estado } = req.body;
    
    // Generar código automáticamente
    const codigo = `PRY-${grado}${grupo}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const nuevoProyector = new Proyector({
      codigo,
      grado,
      grupo,
      turno,
      estado
    });
    
    const proyectorGuardado = await nuevoProyector.save();
    res.status(201).json(proyectorGuardado);
  } catch (error) {
    console.error('Error al crear proyector:', error);
    res.status(500).json({ message: 'Error al crear proyector', error: error.message });
  }
});

app.put('/api/proyectores/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    
    const proyectorActualizado = await Proyector.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    
    if (!proyectorActualizado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }
    
    res.json(proyectorActualizado);
  } catch (error) {
    console.error('Error al actualizar proyector:', error);
    res.status(500).json({ message: 'Error al actualizar proyector' });
  }
});

app.delete('/api/proyectores/:id', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    const proyectorEliminado = await Proyector.findByIdAndDelete(req.params.id);
    
    if (!proyectorEliminado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }
    
    res.json({ message: 'Proyector eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar proyector:', error);
    res.status(500).json({ message: 'Error al eliminar proyector', error: error.message });
  }
});

app.use('/qr-codes', qrCodeRoutes);

// Ruta para actualizar el tema del usuario
app.put('/update-theme', async (req, res) => {
  try {
    const { theme, darkMode } = req.body;
    let userId;

    // Si hay token, actualizar el usuario específico
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      
      await User.findByIdAndUpdate(userId, { theme, darkMode });
    }

    // Siempre actualizar el último tema usado
    await User.findOneAndUpdate(
      {},
      { theme, darkMode },
      { 
        sort: { updatedAt: -1 },
        upsert: true // Crear si no existe
      }
    );

    res.json({ success: true, theme, darkMode });
  } catch (error) {
    console.error('Error al actualizar tema:', error);
    res.status(500).json({ message: 'Error al actualizar el tema' });
  }
});

// Ruta para obtener el tema del usuario
app.get('/user-theme', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const usuario = await User.findById(userId);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ 
      theme: usuario.theme || 'default',
      darkMode: usuario.darkMode || false
    });
    
  } catch (error) {
    console.error('Error al obtener tema:', error);
    res.status(500).json({ 
      message: 'Error al obtener el tema',
      error: error.message 
    });
  }
});

// Ruta para obtener el último tema usado (sin autenticación)
app.get('/last-theme', async (req, res) => {
  try {
    // Obtener el último tema y darkMode usados
    const ultimoTema = await User.findOne({}, { theme: 1, darkMode: 1 })
      .sort({ updatedAt: -1 })
      .limit(1);
    
    // Asegurarnos de enviar ambos valores
    res.json({ 
      theme: ultimoTema?.theme || 'default',
      darkMode: ultimoTema?.darkMode || false
    });
  } catch (error) {
    console.error('Error al obtener último tema:', error);
    res.status(500).json({ 
      message: 'Error al obtener el tema',
      error: error.message 
    });
  }
});
  