const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Encargado = require('../models/Encargado');
const Notification = require('../models/Notification');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getISOWeek, getNextISOWeek, getPrevISOWeek, getMondayOfWeek, getFridayOfWeek } = require('../utils/weekUtils');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function crearNotificacion(usuarioId, mensaje, tipo = 'info', entidadId = null) {
  try {
    await Notification.create({ usuarioId, mensaje, tipo, entidadId, entidadTipo: 'Encargado' });
  } catch (e) {
    console.error('Error al crear notificación de encargado:', e.message);
  }
}

// ─── POST /api/encargado/postular ─────────────────────────────────────────────
// El usuario se postula como encargado para la semana siguiente.
// Solo disponible jueves y viernes.
router.post('/api/encargado/postular', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('grado grupo turno nombre perfilModificadoEn');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (!user.grado || !user.grupo || !user.turno) {
      return res.status(400).json({ message: 'Debes completar tu perfil (grado, grupo y turno) antes de postularte.' });
    }

    if (user.perfilModificadoEn) {
      const msPerDia = 1000 * 60 * 60 * 24;
      const diasDesde = Math.floor((Date.now() - user.perfilModificadoEn.getTime()) / msPerDia);
      if (diasDesde < 7) {
        return res.status(403).json({
          message: `Tu perfil fue modificado hace ${diasDesde} día${diasDesde === 1 ? '' : 's'}. Debes esperar ${7 - diasDesde} día${7 - diasDesde === 1 ? '' : 's'} más para postularte.`,
          codigoError: 'PERFIL_RECIENTE'
        });
      }
    }

    // Solo jueves (4) o viernes (5) en UTC
    const hoy = new Date();
    const diaSemana = hoy.getUTCDay(); // 0=Dom ... 4=Jue 5=Vie
    if (diaSemana !== 4 && diaSemana !== 5) {
      return res.status(400).json({ message: 'Las postulaciones solo están abiertas los jueves y viernes.' });
    }

    const semanaActual = getISOWeek();
    const semanaSiguiente = getNextISOWeek(semanaActual);

    // No puede ser encargado activo esta semana
    const encargadoActual = await Encargado.findOne({
      usuarioId: req.user.id,
      semana: semanaActual,
      estado: 'activo'
    });
    if (encargadoActual) {
      return res.status(400).json({ message: 'Ya eres encargado activo esta semana, no puedes postularte para la siguiente.' });
    }

    // Regla: no dos semanas consecutivas — verificar si fue encargado la semana pasada
    const semanaPasada = getPrevISOWeek(semanaActual);
    const fueEncargadoSemanaAnterior = await Encargado.findOne({
      usuarioId: req.user.id,
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana: semanaPasada,
      estado: { $in: ['activo', 'sustituido'] }
    });
    if (fueEncargadoSemanaAnterior) {
      return res.status(400).json({ message: 'No puedes ser encargado dos semanas seguidas del mismo grupo. Es turno de otro compañero.' });
    }

    // Ya tiene postulación activa para la semana siguiente
    const yaPostulado = await Encargado.findOne({
      usuarioId: req.user.id,
      semana: semanaSiguiente,
      estado: { $in: ['postulado', 'activo'] }
    });
    if (yaPostulado) {
      return res.status(400).json({ message: 'Ya tienes una postulación activa para la semana siguiente.' });
    }

    const nueva = await Encargado.create({
      usuarioId: req.user.id,
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana: semanaSiguiente,
      tipo: 'titular',
      estado: 'postulado'
    });

    res.status(201).json({ message: 'Postulación registrada correctamente.', encargado: nueva });
  } catch (err) {
    console.error('Error en postular:', err);
    res.status(500).json({ message: 'Error al procesar la postulación', error: err.message });
  }
});

// ─── GET /api/encargado/activo ────────────────────────────────────────────────
// Devuelve el estado del usuario autenticado como encargado esta semana,
// y quién es el encargado activo de su grupo.
router.get('/api/encargado/activo', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('grado grupo turno');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (!user.grado || !user.grupo || !user.turno) {
      return res.json({ esEncargado: false, encargadoActivo: null, perfilIncompleto: true });
    }

    const semana = getISOWeek();

    const miEncargado = await Encargado.findOne({
      usuarioId: req.user.id,
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana,
      estado: 'activo'
    });

    const encargadoActivo = await Encargado.findOne({
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana,
      estado: 'activo'
    }).populate('usuarioId', 'nombre picture');

    // Estado de postulación del usuario para la semana siguiente
    const semanaSiguiente = getNextISOWeek(semana);
    const miPostulacion = await Encargado.findOne({
      usuarioId: req.user.id,
      semana: semanaSiguiente
    });

    res.json({
      esEncargado: !!miEncargado,
      encargadoActivo: encargadoActivo
        ? {
            nombre: encargadoActivo.usuarioId.nombre,
            picture: encargadoActivo.usuarioId.picture,
            desde: encargadoActivo.fechaInicio,
            tipo: encargadoActivo.tipo,
            noSePresento: encargadoActivo.noSePresento
          }
        : null,
      semana,
      miPostulacionSiguienteSemana: miPostulacion ? miPostulacion.estado : null
    });
  } catch (err) {
    console.error('Error en activo:', err);
    res.status(500).json({ message: 'Error al obtener estado de encargado', error: err.message });
  }
});

// ─── GET /api/encargado/grupos ────────────────────────────────────────────────
// Admin: todos los grupos con su estado de encargado para una semana dada.
// Query param: ?semana=2026-W13 (default: próxima semana)
router.get('/api/encargado/grupos', verifyToken, isAdmin, async (req, res) => {
  try {
    const semanaActual = getISOWeek();
    const semana = req.query.semana || getNextISOWeek(semanaActual);

    // Obtener combinaciones únicas de grado+grupo+turno de usuarios no-admin con perfil completo
    const grupos = await User.aggregate([
      { $match: { isAdmin: false, grado: { $ne: null }, grupo: { $ne: null }, turno: { $ne: null } } },
      { $group: { _id: { grado: '$grado', grupo: '$grupo', turno: '$turno' }, totalUsuarios: { $sum: 1 } } },
      { $sort: { '_id.grado': 1, '_id.grupo': 1, '_id.turno': 1 } }
    ]);

    // Cargar todos los registros de encargados para esa semana
    const encargadosSemana = await Encargado.find({ semana })
      .populate('usuarioId', 'nombre email picture')
      .lean();

    // Construir respuesta enriquecida
    const resultado = grupos.map(g => {
      const { grado, grupo, turno } = g._id;
      const registros = encargadosSemana.filter(
        e => e.grado === grado && e.grupo === grupo && e.turno === turno
      );
      const activo = registros.find(e => e.estado === 'activo');
      const postulantes = registros.filter(e => e.estado === 'postulado');
      return {
        grado,
        grupo,
        turno,
        totalUsuarios: g.totalUsuarios,
        encargadoActivo: activo || null,
        postulantes
      };
    });

    res.json({ semana, grupos: resultado });
  } catch (err) {
    console.error('Error en grupos:', err);
    res.status(500).json({ message: 'Error al obtener grupos', error: err.message });
  }
});

// ─── GET /api/encargado/semana/:semana ────────────────────────────────────────
// Admin: todos los registros de encargados para una semana específica.
router.get('/api/encargado/semana/:semana', verifyToken, isAdmin, async (req, res) => {
  try {
    const { semana } = req.params;
    const encargados = await Encargado.find({ semana })
      .populate('usuarioId', 'nombre email picture grado grupo turno')
      .populate('aprobadoPor', 'nombre')
      .sort({ grado: 1, grupo: 1, turno: 1, estado: 1 })
      .lean();
    res.json(encargados);
  } catch (err) {
    console.error('Error en semana:', err);
    res.status(500).json({ message: 'Error al obtener encargados de la semana', error: err.message });
  }
});

// ─── PUT /api/encargado/:id/designar ─────────────────────────────────────────
// Admin: designa un postulante como encargado titular.
router.put('/api/encargado/:id/designar', verifyToken, isAdmin, async (req, res) => {
  try {
    const encargado = await Encargado.findById(req.params.id).populate('usuarioId', 'nombre');
    if (!encargado) return res.status(404).json({ message: 'Postulación no encontrada' });
    if (encargado.estado !== 'postulado') {
      return res.status(400).json({ message: `No se puede designar un registro en estado "${encargado.estado}"` });
    }

    const { grado, grupo, turno, semana } = encargado;

    // Verificar que no haya ya un activo para este grupo/semana
    const yaActivo = await Encargado.findOne({ grado, grupo, turno, semana, estado: 'activo' });
    if (yaActivo) {
      return res.status(400).json({ message: 'Ya existe un encargado activo para este grupo esta semana.' });
    }

    // Inactivar otros postulantes del mismo grupo/semana
    await Encargado.updateMany(
      { grado, grupo, turno, semana, estado: 'postulado', _id: { $ne: encargado._id } },
      { $set: { estado: 'inactivo' } }
    );

    // Activar este
    encargado.estado = 'activo';
    encargado.aprobadoPor = req.user.id;
    encargado.fechaInicio = getMondayOfWeek(semana);
    encargado.fechaFin = getFridayOfWeek(semana);
    await encargado.save();

    await crearNotificacion(
      encargado.usuarioId._id,
      `¡Felicidades! Has sido designado Encargado del grupo ${grado}°${grupo} turno ${turno} para la semana ${semana}.`,
      'success',
      encargado._id
    );

    res.json({ message: 'Encargado designado correctamente.', encargado });
  } catch (err) {
    console.error('Error en designar:', err);
    res.status(500).json({ message: 'Error al designar encargado', error: err.message });
  }
});

// ─── POST /api/encargado/asignar-directo ─────────────────────────────────────
// Admin: asigna directamente un encargado sin que haya postulación previa.
router.post('/api/encargado/asignar-directo', verifyToken, isAdmin, async (req, res) => {
  try {
    const { usuarioId, semana: semanaParam } = req.body;
    if (!usuarioId) return res.status(400).json({ message: 'El campo usuarioId es requerido.' });

    const semanaActual = getISOWeek();
    const semana = semanaParam || getNextISOWeek(semanaActual);

    const usuario = await User.findById(usuarioId).select('grado grupo turno nombre isAdmin');
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (usuario.isAdmin) return res.status(400).json({ message: 'No puedes asignar a un administrador como encargado.' });
    if (!usuario.grado || !usuario.grupo || !usuario.turno) {
      return res.status(400).json({ message: 'El usuario no tiene perfil completo (grado/grupo/turno).' });
    }

    // Regla: no dos semanas consecutivas
    const semanaPrev = getPrevISOWeek(semana);
    const fueEncargado = await Encargado.findOne({
      usuarioId,
      grado: usuario.grado,
      grupo: usuario.grupo,
      turno: usuario.turno,
      semana: semanaPrev,
      estado: { $in: ['activo', 'sustituido'] }
    });
    if (fueEncargado) {
      return res.status(400).json({ message: 'Este usuario fue encargado la semana anterior. No se permiten dos semanas consecutivas.' });
    }

    // Verificar que no haya ya un activo para ese grupo/semana
    const yaActivo = await Encargado.findOne({
      grado: usuario.grado,
      grupo: usuario.grupo,
      turno: usuario.turno,
      semana,
      estado: 'activo'
    });
    if (yaActivo) {
      return res.status(400).json({ message: 'Ya existe un encargado activo para ese grupo en esa semana.' });
    }

    // Inactivar cualquier postulación previa del usuario para esa semana
    await Encargado.updateMany(
      { usuarioId, semana },
      { $set: { estado: 'inactivo' } }
    );

    const nuevo = await Encargado.create({
      usuarioId,
      grado: usuario.grado,
      grupo: usuario.grupo,
      turno: usuario.turno,
      semana,
      tipo: 'titular',
      estado: 'activo',
      aprobadoPor: req.user.id,
      fechaInicio: getMondayOfWeek(semana),
      fechaFin: getFridayOfWeek(semana)
    });

    await crearNotificacion(
      usuarioId,
      `Has sido asignado directamente como Encargado del grupo ${usuario.grado}°${usuario.grupo} turno ${usuario.turno} para la semana ${semana}.`,
      'success',
      nuevo._id
    );

    res.status(201).json({ message: 'Encargado asignado directamente.', encargado: nuevo });
  } catch (err) {
    console.error('Error en asignar-directo:', err);
    res.status(500).json({ message: 'Error al asignar encargado', error: err.message });
  }
});

// ─── POST /api/encargado/sustitucion ─────────────────────────────────────────
// Usuario solicita ser encargado provisional (cuando el titular no se presentó).
router.post('/api/encargado/sustitucion', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('grado grupo turno nombre');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!user.grado || !user.grupo || !user.turno) {
      return res.status(400).json({ message: 'Perfil incompleto.' });
    }

    const semana = getISOWeek();

    // El encargado titular debe estar marcado como noSePresento
    const encargadoTitular = await Encargado.findOne({
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana,
      estado: 'activo',
      tipo: 'titular'
    });

    if (!encargadoTitular) {
      return res.status(400).json({ message: 'No hay encargado titular activo para tu grupo esta semana.' });
    }
    if (!encargadoTitular.noSePresento) {
      return res.status(400).json({ message: 'El encargado titular no ha sido marcado como ausente todavía.' });
    }

    // No puede pedir sustitución si ya la pidió
    const yaPostulado = await Encargado.findOne({
      usuarioId: req.user.id,
      semana,
      tipo: 'provisional'
    });
    if (yaPostulado) {
      return res.status(400).json({ message: 'Ya tienes una solicitud de sustitución para esta semana.' });
    }

    const provisional = await Encargado.create({
      usuarioId: req.user.id,
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana,
      tipo: 'provisional',
      estado: 'postulado',
      fechaInicio: new Date(),
      fechaFin: getFridayOfWeek(semana)
    });

    // Notificar a todos los admins
    const admins = await User.find({ isAdmin: true }).select('_id');
    await Promise.all(admins.map(admin =>
      crearNotificacion(
        admin._id,
        `${user.nombre} solicita ser Encargado Provisional del grupo ${user.grado}°${user.grupo} (${user.turno}) — el titular no se presentó.`,
        'warning',
        provisional._id
      )
    ));

    res.status(201).json({ message: 'Solicitud de sustitución enviada al administrador.', encargado: provisional });
  } catch (err) {
    console.error('Error en sustitucion:', err);
    res.status(500).json({ message: 'Error al solicitar sustitución', error: err.message });
  }
});

// ─── PUT /api/encargado/:id/aprobar-sustitucion ───────────────────────────────
// Admin aprueba una solicitud de sustitución provisional.
router.put('/api/encargado/:id/aprobar-sustitucion', verifyToken, isAdmin, async (req, res) => {
  try {
    const provisional = await Encargado.findById(req.params.id).populate('usuarioId', 'nombre');
    if (!provisional) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (provisional.tipo !== 'provisional' || provisional.estado !== 'postulado') {
      return res.status(400).json({ message: 'Esta solicitud no puede ser aprobada en su estado actual.' });
    }

    const { grado, grupo, turno, semana } = provisional;

    // Marcar al titular como sustituido
    await Encargado.updateMany(
      { grado, grupo, turno, semana, tipo: 'titular', estado: 'activo' },
      { $set: { estado: 'sustituido', sustituidoPor: provisional.usuarioId._id } }
    );

    provisional.estado = 'activo';
    provisional.aprobadoPor = req.user.id;
    await provisional.save();

    await crearNotificacion(
      provisional.usuarioId._id,
      `¡Has sido aprobado como Encargado Provisional del grupo ${grado}°${grupo} (${turno}) para la semana ${semana}!`,
      'success',
      provisional._id
    );

    res.json({ message: 'Sustitución aprobada.', encargado: provisional });
  } catch (err) {
    console.error('Error en aprobar-sustitucion:', err);
    res.status(500).json({ message: 'Error al aprobar sustitución', error: err.message });
  }
});

// ─── GET /api/encargado/mis-postulaciones ─────────────────────────────────────
// Devuelve el historial de postulaciones del usuario autenticado.
router.get('/api/encargado/mis-postulaciones', verifyToken, async (req, res) => {
  try {
    const postulaciones = await Encargado.find({ usuarioId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(postulaciones);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener postulaciones', error: err.message });
  }
});

// ─── GET /api/encargado/historial ────────────────────────────────────────────
// Devuelve el historial de encargados de un grupo específico.
router.get('/api/encargado/historial', verifyToken, async (req, res) => {
  try {
    const { grado, grupo, turno, limit = 10 } = req.query;
    if (!grado || !grupo || !turno) {
      return res.status(400).json({ message: 'grado, grupo y turno son requeridos' });
    }
    const historial = await Encargado.find({
      grado: Number(grado), grupo, turno,
      estado: { $in: ['activo', 'inactivo', 'sustituido'] }
    })
      .populate('usuarioId', 'nombre picture email')
      .populate('sustituidoPor', 'nombre')
      .sort({ fechaInicio: -1 })
      .limit(Number(limit));
    res.json(historial);
  } catch (err) {
    console.error('Error en historial encargados:', err);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

module.exports = router;
