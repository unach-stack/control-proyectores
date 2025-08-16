const QRCode = require('../backend/models/QRCode');

// Guardar un nuevo código QR
exports.saveQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;
    const userId = req.user.id; // Asumiendo que tienes middleware de autenticación

    if (!qrData) {
      return res.status(400).json({ message: 'Datos de QR requeridos' });
    }

    const newQRCode = new QRCode({
      qrData,
      userId
    });

    await newQRCode.save();

    res.status(201).json({
      success: true,
      qrCode: newQRCode
    });
  } catch (error) {
    console.error('Error al guardar código QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el código QR',
      error: error.message
    });
  }
};

// Obtener todos los códigos QR de un usuario
exports.getUserQRCodes = async (req, res) => {
  try {
    const userId = req.user.id; // Asumiendo que tienes middleware de autenticación

    const qrCodes = await QRCode.find({ userId })
      .sort({ createdAt: -1 }); // Ordenar por fecha de creación descendente

    res.status(200).json({
      success: true,
      qrCodes
    });
  } catch (error) {
    console.error('Error al obtener códigos QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los códigos QR',
      error: error.message
    });
  }
};

// Eliminar un código QR
exports.deleteQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const qrCode = await QRCode.findById(id);

    if (!qrCode) {
      return res.status(404).json({ message: 'Código QR no encontrado' });
    }

    // Verificar que el QR pertenezca al usuario
    if (qrCode.userId.toString() !== userId) {
      return res.status(403).json({ message: 'No autorizado para eliminar este QR' });
    }

    await QRCode.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Código QR eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar código QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el código QR',
      error: error.message
    });
  }
}; 