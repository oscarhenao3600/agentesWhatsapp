const express = require('express');
const router = express.Router();
const { handleIncomingMessage } = require('../controllers/whatsappController');
const Branch = require('../models/Branch');

// @desc    Verificación del Webhook (Meta requiere esto al configurar)
// @route   GET /api/whatsapp/webhook
router.get('/webhook', async (req, res) => {
  console.log('--- GET /webhook ---');
  console.log('Query Params:', req.query);
  try {
    const mode = req.query['hub.mode'] || req.query['hub_mode'];
    const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
    const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

    if (mode && token) {
      if (mode === 'subscribe') {
        console.log(`Verifying token: received='${token}', expected='${process.env.WHATSAPP_VERIFY_TOKEN}'`);
        // Buscar si el token pertenece a alguna sucursal o si es el global de respaldo
        const branch = await Branch.findOne({ whatsappVerifyToken: token });
        
        if (branch || token === process.env.WHATSAPP_VERIFY_TOKEN) {
          console.log(`Webhook Verificado Exitosamente!`);
          return res.status(200).send(challenge);
        } else {
          console.log('Token mismatch.');
        }
      }
      return res.sendStatus(403);
    }
    return res.status(400).send('Faltan parametros hub.mode o hub.verify_token');
  } catch (error) {
    console.error('Error en GET /webhook:', error);
    return res.sendStatus(500);
  }
});

// @desc    Recepción de mensajes de WhatsApp
// @route   POST /api/whatsapp/webhook
router.post('/webhook', async (req, res) => {
  console.log('--- POST /webhook ---');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const value = body.entry[0].changes[0].value;
        const message = value.messages[0];
        
        const from = message.from; // Número del cliente
        const text = message.text?.body; // Texto del mensaje
        const messageId = message.id; // ID del mensaje
        const phoneNumberId = value.metadata.phone_number_id; // ID del número que recibió el mensaje

        if (text) {
          // Procesar mensaje con nuestra lógica de IA (ahora vinculada a Branch)
          await handleIncomingMessage(from, phoneNumberId, text, messageId);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error en Webhook POST:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
