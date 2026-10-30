const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Branch = require('../models/Branch');
const BranchAIConfig = require('../models/BranchAIConfig');
const Business = require('../models/Business');
const whatsappWebService = require('../services/whatsappWebService');
const baileysService = require('../services/baileysService');

// Helper para validar acceso a la sucursal
const validateAccess = async (userId, userRole, branchId) => {
  if (userRole === 'admin') return true;
  const branch = await Branch.findById(branchId);
  if (!branch) return false;
  const business = await Business.findById(branch.business);
  if (!business) return false;
  return business.owner.toString() === userId.toString();
};

// @desc    Iniciar o solicitar QR de WhatsApp (Baileys por defecto o WhatsApp Web con Chromium)
// @route   POST /api/gateway/:branchId/qr
router.post('/:branchId/qr', protect, async (req, res) => {
  try {
    const { branchId } = req.params;
    const hasAccess = await validateAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const branch = await Branch.findById(branchId);
    const aiConfig = await BranchAIConfig.findOne({ branch: branchId });

    // Forzar motor Baileys (WebSockets puros sin Chromium) salvo que se habilite ALLOW_CHROMIUM explícitamente
    const allowChromium = process.env.ALLOW_CHROMIUM === 'true';
    let selectedGateway = allowChromium
      ? (req.body?.gatewayType || aiConfig?.gatewayType || branch?.gatewayType || 'baileys')
      : 'baileys';
    if (!['baileys', 'whatsapp_web'].includes(selectedGateway)) {
      selectedGateway = 'baileys';
    }

    // Persistir la elección de motor en Branch y BranchAIConfig
    await Branch.findByIdAndUpdate(branchId, { gatewayType: selectedGateway });
    if (aiConfig) {
      aiConfig.gatewayType = selectedGateway;
      await aiConfig.save();
    }

    const forceNew = Boolean(req.body?.forceNew);

    let sessionState;
    if (selectedGateway === 'whatsapp_web' && allowChromium) {
      if (baileysService.hasActiveSession(branchId)) {
        await baileysService.disconnectSession(branchId, false);
      }
      sessionState = await whatsappWebService.initSession(branchId, forceNew);
    } else {
      // Por defecto: Baileys (WebSockets ligeros, ~30MB RAM, sin Chromium)
      if (whatsappWebService.hasActiveSession(branchId)) {
        await whatsappWebService.disconnectSession(branchId, false);
      }
      sessionState = await baileysService.initSession(branchId, 0, forceNew);
    }

    res.json(sessionState);
  } catch (error) {
    console.error('Error iniciando sesión de WhatsApp:', error);
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

    if (baileysService.hasActiveSession(branchId)) {
      return res.json(baileysService.getSessionStatus(branchId));
    }

    if (whatsappWebService.hasActiveSession(branchId)) {
      return res.json(whatsappWebService.getSessionStatus(branchId));
    }

    const branch = await Branch.findById(branchId).select('gatewayType');
    const gatewayType = branch?.gatewayType || process.env.DEFAULT_GATEWAY_TYPE || 'baileys';

    res.json({
      status: 'disconnected',
      qrImage: null,
      connectedPhone: '',
      gatewayType
    });
  } catch (error) {
    console.error('Error consultando estado de WhatsApp:', error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Desconectar sesión activa de WhatsApp (Baileys o WhatsApp Web)
// @route   POST /api/gateway/:branchId/disconnect
router.post('/:branchId/disconnect', protect, async (req, res) => {
  try {
    const { branchId } = req.params;
    const hasAccess = await validateAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    if (baileysService.hasActiveSession(branchId)) {
      await baileysService.disconnectSession(branchId, true);
    }
    if (whatsappWebService.hasActiveSession(branchId)) {
      await whatsappWebService.disconnectSession(branchId, true);
    }

    // Asegurar actualización en BD incluso si la sesión en memoria ya no existía
    await Branch.findByIdAndUpdate(branchId, {
      whatsappConnected: false,
      whatsappPhoneNumber: ''
    });

    res.json({ success: true, message: 'Sesión de WhatsApp desconectada correctamente' });
  } catch (error) {
    console.error('Error desconectando sesión de WhatsApp:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
