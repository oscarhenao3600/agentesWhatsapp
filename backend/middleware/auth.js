const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const secret = process.env.JWT_SECRET || 'tu_secreto_super_seguro_123';
      const decoded = jwt.verify(token, secret);

      // Obtener usuario del token
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado, usuario no existe' });
      }
      if (req.user.active === false) {
        return res.status(403).json({ message: 'Tu cuenta ha sido desactivada por el administrador' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};


// Middleware para autorizar roles específicos
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `El rol de usuario (${req.user.role}) no está autorizado para acceder a esta ruta`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
