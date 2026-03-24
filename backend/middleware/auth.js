const jwt = require('jsonwebtoken');
const ADMIN_EMAILS = require('../config/adminEmails');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin && ADMIN_EMAILS.includes(decoded.email)) {
      decoded.isAdmin = true;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Acceso denegado: Se requieren privilegios de administrador' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
