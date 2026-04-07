const Encargado = require('../models/Encargado');
const User = require('../models/User');
const { getISOWeek } = require('../utils/weekUtils');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('grado grupo turno nombre');
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    if (!user.grado || !user.grupo || !user.turno) {
      return res.status(403).json({
        message: 'Debes completar tu perfil (grado, grupo y turno) antes de solicitar un proyector.',
        codigoError: 'PERFIL_INCOMPLETO'
      });
    }

    const semana = getISOWeek();

    // Verificar si este usuario es el encargado activo de su grupo esta semana
    const esEncargado = await Encargado.findOne({
      usuarioId: req.user.id,
      grado: user.grado,
      grupo: user.grupo,
      turno: user.turno,
      semana,
      estado: 'activo'
    });

    if (!esEncargado) {
      // Buscar quién SÍ es el encargado activo del grupo
      const encargadoActivo = await Encargado.findOne({
        grado: user.grado,
        grupo: user.grupo,
        turno: user.turno,
        semana,
        estado: 'activo'
      }).populate('usuarioId', 'nombre');

      return res.status(403).json({
        message: 'No eres el encargado activo de tu grupo esta semana.',
        codigoError: 'NO_ES_ENCARGADO',
        encargadoActivo: encargadoActivo
          ? { nombre: encargadoActivo.usuarioId.nombre, desde: encargadoActivo.fechaInicio }
          : null,
        tieneEncargado: !!encargadoActivo
      });
    }

    req.encargado = esEncargado;
    next();
  } catch (err) {
    console.error('Error en checkEsEncargado:', err);
    res.status(500).json({ message: 'Error al verificar encargado', error: err.message });
  }
};
