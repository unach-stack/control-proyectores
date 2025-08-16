const Solicitud = require('../models/Solicitud');
const Proyector = require('../models/Proyector');

// Obtener todas las solicitudes
const obtenerSolicitudes = async (req, res) => {
  try {
    const solicitudes = await Solicitud.find().populate('usuarioId', 'nombre email');
    res.status(200).json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ mensaje: 'Error al obtener las solicitudes' });
  }
};

// Actualizar estado de solicitud
const actualizarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    console.log('Actualizando solicitud:', id, 'con estado:', estado);
    
    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    solicitud.estado = estado;
    await solicitud.save();

    const solicitudActualizada = await solicitud.populate('usuarioId');

    res.json({ 
      mensaje: 'Estado actualizado correctamente',
      solicitud: solicitudActualizada
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la solicitud' });
  }
};

// Crear nueva solicitud
const crearSolicitud = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, motivo, ubicacion } = req.body;
    const usuarioId = req.user._id;

    // Buscar un proyector que esté devuelto y disponible para la ubicación especificada
    const proyector = await Proyector.findOne({ ubicacion, estado: 'devuelto' });
    if (!proyector) {
      return res.status(400).json({ mensaje: 'No hay proyectores disponibles para esta ubicación' });
    }

    const nuevaSolicitud = new Solicitud({
      usuarioId,
      proyectorId: proyector._id,
      fechaInicio,
      fechaFin,
      motivo
    });

    // Cambiar el estado del proyector a 'reservado'
    proyector.estado = 'reservado';
    await proyector.save();

    const solicitudGuardada = await nuevaSolicitud.save();
    const solicitudConUsuario = await solicitudGuardada.populate('usuarioId', 'nombre email');

    res.status(201).json({ 
      mensaje: 'Solicitud creada exitosamente',
      solicitud: solicitudConUsuario
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear la solicitud',
      error: error.message
    });
  }
};

module.exports = {
  obtenerSolicitudes,
  actualizarSolicitud,
  crearSolicitud
}; 