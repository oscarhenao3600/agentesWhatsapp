require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Business = require('./models/Business');
const Branch = require('./models/Branch');
const BranchAIConfig = require('./models/BranchAIConfig');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB...');

    // 1. Limpiar datos previos (OPCIONAL - CUIDADO)
    // await User.deleteMany({});
    // await Business.deleteMany({});
    // await Branch.deleteMany({});

    // 2. Crear Admin si no existe
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Admin creado: admin / admin123');
    }

    // 3. Crear un Cliente de prueba
    let client = await User.findOne({ username: 'cliente_test' });
    if (!client) {
      const hashedPassword = await bcrypt.hash('client123', 10);
      client = await User.create({
        username: 'cliente_test',
        password: hashedPassword,
        role: 'client'
      });
      console.log('Cliente creado: cliente_test / client123');
    }

    // 4. Crear un Negocio para el cliente
    let business = await Business.findOne({ owner: client._id });
    if (!business) {
      business = await Business.create({
        owner: client._id,
        name: 'Restaurante El Sabor',
        description: 'Comida típica y parrilladas',
        commission: 12
      });
      console.log('Negocio creado: Restaurante El Sabor');
    }

    // 5. Crear una Sucursal
    let branch = await Branch.findOne({ business: business._id });
    if (!branch) {
      branch = await Branch.create({
        business: business._id,
        name: 'Sede Norte',
        phone: '+573001112233',
        whatsappNumberId: '123456789012345', // Reemplazar con ID real de Meta
        whatsappVerifyToken: 'token_secreto_123',
        accessToken: 'EAABBBCCC...' // Reemplazar con Token real de Meta
      });
      console.log('Sucursal creada: Sede Norte');

      // Crear configuración de IA para la sucursal
      await BranchAIConfig.create({
        branch: branch._id,
        businessType: 'restaurant',
        personality: 'friendly',
        basePrompt: 'Eres un mesero virtual del Restaurante El Sabor. Atiende amablemente.',
        menuContent: 'MENU:\n1. Carne Asada - $25000\n2. Pollo al Horno - $22000\n3. Jugo Natural - $5000',
        welcomeMessage: '¡Hola! Bienvenido a El Sabor. ¿Qué te gustaría ordenar hoy?'
      });
      console.log('Configuración de IA creada para Sede Norte');
    }

    console.log('Seed finalizado con éxito.');
    process.exit();
  } catch (error) {
    console.error('Error en el seed:', error);
    process.exit(1);
  }
};

seedData();
