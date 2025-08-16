const jwt = require('jsonwebtoken');

// Lista de correos administrativos autorizados
const ADMIN_EMAILS = [
  'proyectoresunach@gmail.com',
  'fanny.cordova@unach.mx',
  'nidia.guzman@unach.mx',
  'deysi.gamboa@unach.mx',
  'diocelyne.arrevillaga@unach.mx',
  'karol.carrazco@unach.mx',
  'karen.portillo@unach.mx',
  'pedro.escobar@unach.mx',
  'brianfloresxxd@gmail.com'
];

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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

const isAdmin = (req, res, next) => {
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
};

module.exports = { verifyToken, isAdmin }; 