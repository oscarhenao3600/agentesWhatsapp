const Conversation = require('../models/Conversation');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const { sendOutboundWhatsAppMessage } = require('./whatsappController');

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
    const now = new Date();
    for (const conv of conversations) {
      let dirty = false;
      if (!conv.shortId && conv._id) {
        conv.shortId = conv._id.toString().slice(-4).toUpperCase();
        dirty = true;
      }
      if (conv.botPausedUntil && new Date(conv.botPausedUntil) <= now) {
        conv.botPausedUntil = null;
        conv.pauseReason = 'none';
        dirty = true;
      }
      if (dirty) {
        await conv.save();
      }
    }
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

    const cleanCustomerNumber = customerNumber.startsWith('whatsapp:') ? customerNumber.replace('whatsapp:', '') : customerNumber;

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // 1. Enviar el mensaje a través de la pasarela activa (Baileys, WhatsApp Web o Meta API)
    const sent = await sendOutboundWhatsAppMessage(branch, cleanCustomerNumber, message);
    if (!sent) {
      return res.status(400).json({ message: 'No se pudo enviar el mensaje. Verifica que el WhatsApp de la sucursal esté conectado.' });
    }

    // 2. Registrar en la base de datos
    let conversation = await Conversation.findOne({ branch: branchId, customerNumber: cleanCustomerNumber });
    if (!conversation) {
      conversation = new Conversation({
        branch: branchId,
        customerNumber: cleanCustomerNumber,
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

// @desc    Eliminar una conversación
// @route   DELETE /api/chat/:id
// @access  Private
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, conversation.branch);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso para eliminar esta conversación' });
    }

    await Conversation.findByIdAndDelete(id);

    res.json({ success: true, message: 'Conversación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json({ message: 'Error al eliminar la conversación' });
  }
};

// @desc    Eliminar múltiples conversaciones
// @route   POST /api/chat/delete-multiple
// @access  Private
exports.deleteMultipleConversations = async (req, res) => {
  try {
    const { conversationIds } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere una lista de IDs de conversación a eliminar' });
    }

    if (req.user.role === 'admin') {
      const result = await Conversation.deleteMany({ _id: { $in: conversationIds } });
      return res.json({ 
        success: true, 
        deletedCount: result.deletedCount, 
        message: `${result.deletedCount} conversación(es) eliminada(s) correctamente` 
      });
    }

    // Para clientes y usuarios normales, validar pertenencia
    const userBusinesses = await Business.find({ owner: req.user._id }).select('_id');
    const userBusinessIds = userBusinesses.map(b => b._id);
    const userBranches = await Branch.find({ business: { $in: userBusinessIds } }).select('_id');
    const userBranchIds = userBranches.map(b => b._id);

    const result = await Conversation.deleteMany({
      _id: { $in: conversationIds },
      branch: { $in: userBranchIds }
    });

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount, 
      message: `${result.deletedCount} conversación(es) eliminada(s) correctamente` 
    });
  } catch (error) {
    console.error('Error al eliminar múltiples conversaciones:', error);
    res.status(500).json({ message: 'Error al eliminar las conversaciones' });
  }
};

// @desc    Eliminar todas las conversaciones de una sucursal
// @route   DELETE /api/chat/branch/:branchId/clear
// @access  Private
exports.clearBranchConversations = async (req, res) => {
  try {
    const { branchId } = req.params;

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
    }

    const result = await Conversation.deleteMany({ branch: branchId });

    res.json({ 
      success: true, 
      deletedCount: result.deletedCount, 
      message: `Se eliminaron todas las conversaciones (${result.deletedCount}) de la sucursal` 
    });
  } catch (error) {
    console.error('Error al vaciar conversaciones:', error);
    res.status(500).json({ message: 'Error al vaciar las conversaciones' });
  }
};

// @desc    Pausar o reactivar el bot para una conversación específica
// @route   PATCH /api/chat/:id/bot-status
// @access  Private
exports.toggleBotPause = async (req, res) => {
  try {
    const { id } = req.params;
    const { paused, minutes = 40 } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const hasAccess = await validateBranchAccess(req.user._id, req.user.role, conversation.branch);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes acceso para modificar esta conversación' });
    }

    if (paused) {
      conversation.botPausedUntil = new Date(Date.now() + Number(minutes) * 60 * 1000);
      conversation.pauseReason = 'manual';
    } else {
      conversation.botPausedUntil = null;
      conversation.pauseReason = 'none';
    }

    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error al actualizar estado del bot en la conversación:', error);
    res.status(500).json({ message: 'Error al actualizar el estado del bot' });
  }
};

