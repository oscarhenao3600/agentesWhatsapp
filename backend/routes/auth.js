const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Limitadores de velocidad contra ataques de fuerza bruta y creación masiva de cuentas
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 intentos cada 15 min por IP
  message: 'Demasiados intentos de inicio de sesión. Por seguridad, espera 15 minutos.'
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: 'Demasiadas solicitudes de registro desde esta IP. Intenta más tarde.'
});

// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Auxiliar para verificar si la petición proviene de un administrador autenticado
const getAuthenticatedAdmin = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const caller = await User.findById(decoded.id).select('-password');
    if (caller && caller.role === 'admin' && caller.active !== false) {
      return caller;
    }
    return null;
  } catch {
    return null;
  }
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  const rawUsername = typeof req.body.username === 'string' ? req.body.username : '';
  const username = rawUsername.trim();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Por favor ingresa usuario y contraseña' });
  }

  try {
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (user && user.active !== false && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Usuario o contraseña inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error interno al procesar el inicio de sesión' });
  }
});

// @desc    Registrar nuevo cliente
// @route   POST /api/auth/register
// @access  Public (o solo Admin si ALLOW_PUBLIC_REGISTER=false)
router.post('/register', registerLimiter, async (req, res) => {
  const rawUsername = typeof req.body.username === 'string' ? req.body.username : '';
  const username = rawUsername.trim();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const { role } = req.body;
  const adminUsername = (process.env.ADMIN_USERNAME || 'oscarhenao').trim();

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: ' Se requiere un usuario válido y una contraseña de al menos 6 caracteres' });
  }

  try {
    const adminCaller = await getAuthenticatedAdmin(req);

    // Si se deshabilita el registro público por variable de entorno, exigir token de Admin
    if (process.env.ALLOW_PUBLIC_REGISTER === 'false' && !adminCaller) {
      return res.status(403).json({
        message: 'El registro público está deshabilitado. Solicita tu cuenta al administrador.'
      });
    }

    // Impedir que usuarios públicos intenten registrar el username reservado del administrador
    if (!adminCaller && username.toLowerCase() === adminUsername.toLowerCase()) {
      return res.status(403).json({ message: 'Nombre de usuario no disponible' });
    }

    const userExists = await User.findOne({
      username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // SEGURIDAD CRÍTICA: Nunca permitir que un registro público asigne rol 'admin'.
    // Solo un administrador ya autenticado puede asignar un rol distinto a 'client'.
    const assignedRole = (adminCaller && role === 'admin') ? 'admin' : 'client';

    const user = await User.create({
      username,
      password,
      role: assignedRole
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error interno al registrar el usuario' });
  }
});

// @desc    Obtener todos los usuarios (Solo Admin)
// @route   GET /api/auth/users
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'client' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
