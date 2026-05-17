const Conversation = require('../models/Conversation');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const { sendTextMessage } = require('../services/metaService');

// Auxiliar para validar si el usuario tiene acceso a la sucursal
const validateBranchAccess = async (userId, userRole, branchId) => {
  if (userRole === 'admin') return true;

  const branch = await Branch.findById(branchId);
  if (!branch) return false;

  const business = await Business.findById(branch.business);
  if (!business) return false;

  return business.owner.toString() === userId.toString();
};

// @desc    Obtener conversaciones por sucursal
// @route   GET /api/chat/:branchId
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const { branchId } = req.params;

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const conversations = await Conversation.find({ branch: branchId }).sort({ lastInteraction: -1 });
    res.json(conversations);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'Error al obtener las conversaciones' });
  }
};

// @desc    Enviar mensaje manual
// @route   POST /api/chat/:branchId/send
// @access  Private
exports.sendManualMessage = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { customerNumber, message } = req.body;

    if (!customerNumber || !message) {
      return res.status(400).json({ message: 'Número de cliente y mensaje son requeridos' });
    }

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    if (!branch.whatsappNumberId || !branch.accessToken) {
      return res.status(400).json({ message: 'La sucursal no tiene configuradas las credenciales de WhatsApp' });
    }

    // 1. Enviar el mensaje a través de WhatsApp (Meta API)
    await sendTextMessage(branch.whatsappNumberId, branch.accessToken, customerNumber, message);

    // 2. Registrar en la base de datos
    let conversation = await Conversation.findOne({ branch: branchId, customerNumber });
    if (!conversation) {
      conversation = new Conversation({
        branch: branchId,
        customerNumber,
        messages: []
      });
    }

    conversation.messages.push({
      role: 'assistant',
      content: message,
      timestamp: new Date()
    });
    conversation.lastInteraction = new Date();
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error al enviar mensaje manual:', error);
    res.status(500).json({ message: 'Error al enviar el mensaje manual' });
  }
};
