const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const rawUsername = req.body.username || '';
  const username = rawUsername.trim();
  const { password } = req.body;
  const adminUsername = (process.env.ADMIN_USERNAME || 'oscarhenao').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'oscar3600';

  try {
    let user = await User.findOne({
      username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    // Si es el usuario administrador por defecto y aún no existe en la BD, crearlo si la contraseña coincide
    if (!user && username.toLowerCase() === adminUsername.toLowerCase() && password === adminPassword) {
      user = await User.create({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
        active: true
      });
    }

    if (user && (await user.matchPassword(password))) {
      // Garantizar que la cuenta principal de administrador tenga siempre rol 'admin'
      if (user.username.toLowerCase() === adminUsername.toLowerCase() && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }

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
    res.status(500).json({ message: error.message });
  }
});

// @desc    Registrar nuevo cliente (solo admin puede crear clientes inicialmente o registro público según se prefiera)
// @route   POST /api/auth/register
// @access  Public (Para este sistema el registro inicial de oscar ya se hizo por seed)
router.post('/register', async (req, res) => {
  const rawUsername = req.body.username || '';
  const username = rawUsername.trim();
  const { password, role } = req.body;
  const adminUsername = (process.env.ADMIN_USERNAME || 'oscarhenao').trim();

  try {
    const userExists = await User.findOne({
      username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const assignedRole = username.toLowerCase() === adminUsername.toLowerCase()
      ? 'admin'
      : (role || 'client');

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
    res.status(500).json({ message: error.message });
  }
});

// @desc    Obtener todos los usuarios (Solo Admin)
// @route   GET /api/auth/users
// @access  Private/Admin
const { protect, authorize } = require('../middleware/auth');
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'client' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
