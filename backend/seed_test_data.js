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

    // 4. Crear un Negocio de Restaurante para el cliente
    let business = await Business.findOne({ owner: client._id, name: 'Restaurante El Sabor' });
    if (!business) {
      business = await Business.create({
        owner: client._id,
        name: 'Restaurante El Sabor',
        description: 'Comida típica y parrilladas',
        commission: 12
      });
      console.log('Negocio creado: Restaurante El Sabor');
    }

    // 5. Crear o actualizar Sucursal del Restaurante (con placeholders de prueba)
    let rBranch = await Branch.findOne({ business: business._id });
    const rBranchData = {
      business: business._id,
      name: 'Sede Norte (Restaurante)',
      phone: '+573001112233',
      whatsappNumberId: '123456789012345',
      whatsappVerifyToken: 'token_secreto_restaurante',
      accessToken: 'EAABBBCCC...'
    };

    if (!rBranch) {
      rBranch = await Branch.create(rBranchData);
      console.log('Sucursal creada: Sede Norte (Restaurante)');
    }

    // Crear o actualizar config IA del Restaurante
    let rAiConfig = await BranchAIConfig.findOne({ branch: rBranch._id });
    const rAiConfigData = {
      branch: rBranch._id,
      businessType: 'restaurant',
      personality: 'friendly',
      basePrompt: 'Eres un mesero virtual del Restaurante El Sabor. Atiende amablemente.',
      menuContent: 'MENU:\n1. Carne Asada - $25000\n2. Pollo al Horno - $22000\n3. Jugo Natural - $5000',
      welcomeMessage: '¡Hola! Bienvenido a El Sabor. ¿Qué te gustaría ordenar hoy?'
    };

    if (!rAiConfig) {
      await BranchAIConfig.create(rAiConfigData);
      console.log('Configuración de IA creada para Sede Norte (Restaurante)');
    }

    // 6. Crear un Negocio de Hotel para el cliente
    let hotelBusiness = await Business.findOne({ owner: client._id, name: 'Hotel Paraíso Glamping' });
    if (!hotelBusiness) {
      hotelBusiness = await Business.create({
        owner: client._id,
        name: 'Hotel Paraíso Glamping',
        description: 'Hermoso complejo de glampings con jacuzzi y vista a la montaña',
        commission: 10
      });
      console.log('Negocio creado: Hotel Paraíso Glamping');
    }

    // 7. Crear o actualizar Sucursal del Hotel (usa las credenciales reales de WhatsApp en .env)
    let hBranch = await Branch.findOne({ business: hotelBusiness._id });
    const hBranchData = {
      business: hotelBusiness._id,
      name: 'Sede Principal Glamping',
      phone: process.env.PHONE_NUMBER || '+573000000000',
      whatsappNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1234567890',
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'token_secreto_hotel',
      accessToken: process.env.WHATSAPP_TOKEN || 'meta_mock_access_token_xyz'
    };

    if (!hBranch) {
      hBranch = await Branch.create(hBranchData);
      console.log('Sucursal creada: Sede Principal Glamping');
    } else {
      hBranch.phone = hBranchData.phone;
      hBranch.whatsappNumberId = hBranchData.whatsappNumberId;
      hBranch.whatsappVerifyToken = hBranchData.whatsappVerifyToken;
      hBranch.accessToken = hBranchData.accessToken;
      await hBranch.save();
      console.log('Sucursal de Hotel existente actualizada con credenciales del .env.');
    }

    // Crear o actualizar config IA del Hotel (usa la api key de Gemini del .env)
    let hAiConfig = await BranchAIConfig.findOne({ branch: hBranch._id });
    const hBasePrompt = `Eres el recepcionista virtual del "Hotel Paraíso Glamping".
Atiende de manera servicial, alegre, formal y clara.
Ofrecemos dos tipos de hospedajes:
1. Glamping Domo: Incluye jacuzzi privado, malla de catamarán, cama king-size y desayuno por $150 USD la noche.
2. Glamping Cabaña: Hermosa vista a la montaña, fogata exterior privada, cama queen-size y desayuno por $100 USD la noche.

Tu objetivo principal es asistir al cliente para concretar su reserva. Pídele amablemente:
- Su nombre completo.
- Cuántos huéspedes serán (máximo 4 personas por glamping).
- Fechas de check-in (entrada) y check-out (salida) (indícales cuántas noches son y el costo total).

Una vez que el usuario te dé los datos y te confirme explícitamente que desea reservar (ej: "Sí, quiero reservar el Domo"), agradécele y confirma que los datos han sido registrados.`;

    const hMenuContent = `Catálogo de Hospedajes:
- Glamping Domo: Jacuzzi privado, malla flotante de catamarán, cama King-size, baño privado, desayuno incluido, $150 USD por noche.
- Glamping Cabaña: Vista panorámica a la montaña, balcón con fogata a gas, cama Queen-size, baño privado, desayuno incluido, $100 USD por noche.

Reglas del Hotel:
- Check-in: 3:00 PM
- Check-out: 12:00 M
- No se permiten mascotas en el Glamping Domo, pero sí en el Glamping Cabaña (cargo adicional de $15 USD por estadía).`;

    const hAiConfigData = {
      branch: hBranch._id,
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
      businessType: 'hotel',
      personality: 'friendly',
      menuContent: hMenuContent,
      basePrompt: hBasePrompt
    };

    if (!hAiConfig) {
      await BranchAIConfig.create(hAiConfigData);
      console.log('Configuración de IA creada para Sede Principal Glamping');
    } else {
      hAiConfig.apiKey = process.env.GEMINI_API_KEY;
      hAiConfig.aiModel = 'gemini-2.5-flash';
      hAiConfig.menuContent = hMenuContent;
      hAiConfig.basePrompt = hBasePrompt;
      await hAiConfig.save();
      console.log('Configuración de IA para Sede Principal Glamping actualizada.');
    }

    console.log('Seed finalizado con éxito.');
    process.exit();
  } catch (error) {
    console.error('Error en el seed:', error);
    process.exit(1);
  }
};

seedData();
