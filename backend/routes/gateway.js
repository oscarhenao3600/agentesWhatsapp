const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const { initSession, getSessionStatus, disconnectSession } = require('../services/whatsappWebService');

// Helper para validar acceso a la sucursal
const validateAccess = async (userId, userRole, branchId) => {
  if (userRole === 'admin') return true;
  const branch = await Branch.findById(branchId);
  if (!branch) return false;
  const business = await Business.findById(branch.business);
  if (!business) return false;
  return business.owner.toString() === userId.toString();
};

// @desc    Iniciar o solicitar QR de WhatsApp Web para demostraciones
// @route   POST /api/gateway/:branchId/qr
router.post('/:branchId/qr', protect, async (req, res) => {
  try {
    const { branchId } = req.params;
    const hasAccess = await validateAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const sessionState = await initSession(branchId);
    res.json(sessionState);
  } catch (error) {
    console.error('Error iniciando sesión WhatsApp Web:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Consultar estado en tiempo real de la sesión (QR, Conectado, Desconectado)
// @route   GET /api/gateway/:branchId/status
router.get('/:branchId/status', protect, async (req, res) => {
  try {
    const { branchId } = req.params;
    const hasAccess = await validateAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const sessionState = getSessionStatus(branchId);
    res.json(sessionState);
  } catch (error) {
    console.error('Error consultando estado WhatsApp Web:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Desconectar sesión de WhatsApp Web
// @route   POST /api/gateway/:branchId/disconnect
router.post('/:branchId/disconnect', protect, async (req, res) => {
  try {
    const { branchId } = req.params;
    const hasAccess = await validateAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const result = await disconnectSession(branchId);
    res.json(result);
  } catch (error) {
    console.error('Error desconectando sesión WhatsApp Web:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
