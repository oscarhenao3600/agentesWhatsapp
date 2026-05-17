const { generateDynamicResponse } = require('../services/aiService');
const { sendTextMessage, markAsRead } = require('../services/metaService');
const Branch = require('../models/Branch');
const BranchAIConfig = require('../models/BranchAIConfig');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');

/**
 * Procesa un mensaje entrante de WhatsApp (Meta API).
// ... (previous params)
 */
const handleIncomingMessage = async (from, phoneNumberId, messageText, messageId) => {
  try {
    // ... (previous branch and config finding)
    const branch = await Branch.findOne({ whatsappNumberId: phoneNumberId }).populate('business');
    if (!branch) {
      console.error(`Sucursal no encontrada para el ID: ${phoneNumberId}`);
      return;
    }

    const aiConfig = await BranchAIConfig.findOne({ branch: branch._id });
    const basePrompt = aiConfig ? aiConfig.basePrompt : 'Eres un asistente virtual amable.';

    // ... (previous conversation logic)
    let conversation = await Conversation.findOne({ 
      branch: branch._id, 
      customerNumber: from 
    });

    if (!conversation) {
      conversation = new Conversation({
        branch: branch._id,
        customerNumber: from,
        messages: []
      });
    }

    const history = conversation.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Llamada al motor dinámico de IA (Gemini, OpenAI, o DeepSeek)
    const rawResponse = await generateDynamicResponse(aiConfig, messageText, history);

    // 6. Extraer JSON de pedido si existe
    let cleanResponse = rawResponse;
    let orderData = null;

    if (rawResponse.includes('<ORDER_JSON>')) {
      const match = rawResponse.match(/<ORDER_JSON>([\s\S]*?)<\/ORDER_JSON>/);
      if (match && match[1]) {
        try {
          orderData = JSON.parse(match[1].trim());
          // Limpiar la respuesta para el usuario (quitar el bloque JSON)
          cleanResponse = rawResponse.replace(/<ORDER_JSON>[\s\S]*?<\/ORDER_JSON>/, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de pedido:', e);
        }
      }
    }

    // 7. Guardar mensajes en la base de datos
    conversation.messages.push({ role: 'user', content: messageText });
    conversation.messages.push({ role: 'assistant', content: cleanResponse });
    conversation.lastInteraction = Date.now();
    await conversation.save();

    // 8. Si hay un pedido detectado, guardarlo
    if (orderData && orderData.detected) {
      let commissionAmount = 0;
      if (branch.business && typeof branch.business.commission === 'number') {
        commissionAmount = (orderData.total * branch.business.commission) / 100;
      }

      const newOrder = new Order({
        branch: branch._id,
        customerPhone: from,
        items: orderData.items,
        total: orderData.total,
        deliveryAddress: orderData.deliveryAddress,
        status: 'pending',
        commissionStatus: 'pending',
        commissionAmount: commissionAmount
      });
      await newOrder.save();
      console.log('Nuevo pedido registrado:', newOrder._id);
    }

    // 9. Enviar respuesta real a WhatsApp vía Meta API
    await sendTextMessage(branch.whatsappNumberId, branch.accessToken, from, cleanResponse);
    
    // 10. Marcar como leído
    await markAsRead(branch.whatsappNumberId, branch.accessToken, messageId);

    return cleanResponse;

  } catch (error) {
    console.error('Error procesando mensaje:', error);
  }
};

module.exports = { handleIncomingMessage };
