const axios = require('axios');

/**
 * Envía un mensaje de texto a través de la API de Meta (WhatsApp Business).
 * @param {string} phoneNumberId - ID del número de teléfono remitente.
 * @param {string} accessToken - Token de acceso de Meta.
 * @param {string} to - Número de teléfono del destinatario.
 * @param {string} text - Contenido del mensaje.
 */
const sendTextMessage = async (phoneNumberId, accessToken, to, text) => {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error enviando mensaje vía Meta API:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Marca un mensaje entrante como leído.
 * @param {string} phoneNumberId - ID del número de teléfono remitente.
 * @param {string} accessToken - Token de acceso de Meta.
 * @param {string} messageId - ID del mensaje a marcar.
 */
const markAsRead = async (phoneNumberId, accessToken, messageId) => {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
  } catch (error) {
    console.error('Error al marcar mensaje como leído:', error.response?.data || error.message);
  }
};

module.exports = {
  sendTextMessage,
  markAsRead
};
