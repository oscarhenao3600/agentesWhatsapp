const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Branch = require('./models/Branch');
  const Business = require('./models/Business');
  const BranchAIConfig = require('./models/BranchAIConfig');
  const User = require('./models/User');

  try {
    let owner = await User.findOneAndUpdate(
      { username: 'test_admin' },
      { name: 'Test Admin', email: 'test@admin.com', password: 'password123', role: 'admin' },
      { upsert: true, new: true }
    );

    let business = await Business.findOneAndUpdate(
      { name: 'Negocio de Prueba' },
      { industry: 'restaurant', commission: 5, whatsappNumber: '1234567890', owner: owner._id },
      { upsert: true, new: true }
    );

    let branch = await Branch.findOneAndUpdate(
      { whatsappNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID },
      { business: business._id, name: 'Sucursal Principal', address: '123 Test', accessToken: process.env.WHATSAPP_TOKEN, whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN },
      { upsert: true, new: true }
    );

    await BranchAIConfig.findOneAndUpdate(
      { branch: branch._id },
      { basePrompt: 'Eres el asistente virtual para Negocio de Prueba. Cuando un usuario quiera reservar, devuelve exactamente y sin formato markdown este texto: <RESERVATION_JSON>{"detected":true, "customerName":"Cliente VIP", "roomType":"Mesa", "total":50}</RESERVATION_JSON>' },
      { upsert: true, new: true }
    );

    console.log('✅ Sucursal de prueba creada/actualizada!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
});
