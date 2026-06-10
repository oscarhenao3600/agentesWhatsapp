require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Importar modelos
const User = require('./models/User');
const Business = require('./models/Business');
const Branch = require('./models/Branch');
const BranchAIConfig = require('./models/BranchAIConfig');
const Order = require('./models/Order');

// 1. Mock de MetaService en memoria para evitar llamadas reales a la API de Meta
const metaService = require('./services/metaService');
metaService.sendTextMessage = async (phoneNumberId, accessToken, to, text) => {
  console.log('\x1b[36m%s\x1b[0m', `🏨 [Recepcionista Virtual]: ${text}\n`);
  return { success: true };
};
metaService.markAsRead = async () => { return { success: true }; };

// Importar el controlador después del mock
const { handleIncomingMessage } = require('./controllers/whatsappController');

async function checkApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'tu_api_key_de_gemini' || apiKey.trim() === '') {
    console.log('\x1b[31m%s\x1b[0m', '\n================================================================');
    console.log('⚠️  ¡ATENCIÓN! GEMINI_API_KEY no configurada.');
    console.log('Para que el agente de IA responda, necesitas una clave real de Google AI Studio.');
    console.log('Puedes obtener una gratis en: https://aistudio.google.com/');
    console.log('Una vez la tengas, pégala en el archivo .env de esta forma:');
    console.log('GEMINI_API_KEY=AIzaSy...');
    console.log('================================================================\n');
    return false;
  }
  return true;
}

async function seedData() {
  try {
    // 1. Crear un usuario administrador de prueba
    let admin = await User.findOne({ username: 'test_admin' });
    if (!admin) {
      admin = new User({
        username: 'test_admin',
        password: 'password123',
        role: 'admin'
      });
      await admin.save();
    }

    // 2. Crear un negocio de tipo Hotel/Glamping
    let business = await Business.findOne({ name: 'Hotel Paraíso Glamping' });
    if (!business) {
      business = new Business({
        name: 'Hotel Paraíso Glamping',
        description: 'Hermoso complejo de glampings con jacuzzi y vista a la montaña',
        owner: admin._id,
        commission: 12 // Comisión de ejemplo por reserva
      });
      await business.save();
    }

    // 3. Crear una sucursal de prueba vinculada a un número mock
    let branch = await Branch.findOne({ whatsappNumberId: '1234567890' });
    if (!branch) {
      branch = new Branch({
        business: business._id,
        name: 'Sede Principal Glamping',
        phone: '+573000000000',
        whatsappNumberId: '1234567890',
        whatsappVerifyToken: 'token_secreto_verify_123',
        accessToken: 'meta_mock_access_token_xyz'
      });
      await branch.save();
    }

    // 4. Crear configuración de Inteligencia Artificial para el Hotel
    let aiConfig = await BranchAIConfig.findOne({ branch: branch._id });
    const basePrompt = `Eres el recepcionista virtual del "Hotel Paraíso Glamping".
Atiende de manera servicial, alegre, formal y clara.
Ofrecemos dos tipos de hospedajes:
1. Glamping Domo: Incluye jacuzzi privado, malla de catamarán, cama king-size y desayuno por $150 USD la noche.
2. Glamping Cabaña: Hermosa vista a la montaña, fogata exterior privada, cama queen-size y desayuno por $100 USD la noche.

Tu objetivo principal es asistir al cliente para concretar su reserva. Pídele amablemente:
- Su nombre completo.
- Cuántos huéspedes serán (máximo 4 personas por glamping).
- Fechas de check-in (entrada) y check-out (salida) (indícales cuántas noches son y el costo total).

Una vez que el usuario te dé los datos y te confirme explícitamente que desea reservar (ej: "Sí, quiero reservar el Domo"), agradécele y confirma que los datos han sido registrados.`;

    const menuContent = `Catálogo de Hospedajes:
- Glamping Domo: Jacuzzi privado, malla flotante de catamarán, cama King-size, baño privado, desayuno incluido, $150 USD por noche.
- Glamping Cabaña: Vista panorámica a la montaña, balcón con fogata a gas, cama Queen-size, baño privado, desayuno incluido, $100 USD por noche.

Reglas del Hotel:
- Check-in: 3:00 PM
- Check-out: 12:00 M
- No se permiten mascotas en el Glamping Domo, pero sí en el Glamping Cabaña (cargo adicional de $15 USD por estadía).`;

    if (!aiConfig) {
      aiConfig = new BranchAIConfig({
        branch: branch._id,
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0.7,
        businessType: 'hotel',
        personality: 'friendly',
        menuContent: menuContent,
        basePrompt: basePrompt
      });
      await aiConfig.save();
    } else {
      // Actualizar API Key por si cambió en el .env y forzar modelo flash
      aiConfig.apiKey = process.env.GEMINI_API_KEY;
      aiConfig.aiModel = 'gemini-2.5-flash';
      await aiConfig.save();
    }

    return branch;
  } catch (error) {
    console.error('Error inicializando datos en la base de datos:', error);
    process.exit(1);
  }
}

async function startSimulation() {
  console.log('\x1b[35m%s\x1b[0m', '\n================================================================');
  console.log('   🏨 SIMULADOR DE CHAT INTERACTIVO - HOTEL PARAÍSO GLAMPING 🏨');
  console.log('================================================================');
  console.log('Conectando a MongoDB local...');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agentes_whatsapp');
    console.log('🟢 MongoDB conectado con éxito.');
  } catch (err) {
    console.error('❌ Error de conexión a MongoDB. Asegúrate de tener MongoDB ejecutándose localmente en el puerto 27017.');
    console.error(err.message);
    process.exit(1);
  }

  const hasKey = await checkApiKey();
  const branch = await seedData();

  console.log('\n----------------------------------------------------------------');
  console.log('🤖 Agente Inicializado en Modo "HOTEL".');
  console.log('Simularemos un chat por WhatsApp de un cliente hacia el Hotel.');
  console.log('Escribe tus mensajes. Escribe "salir" para terminar la simulación.');
  console.log('----------------------------------------------------------------\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const clientPhoneNumber = '573004445566'; // Número simulado del cliente

  const askMessage = () => {
    rl.question('\x1b[33m🗣️  Tú (Cliente): \x1b[0m', async (userInput) => {
      if (userInput.toLowerCase() === 'salir') {
        console.log('\nCerrando simulación. ¡Gracias!');
        rl.close();
        mongoose.connection.close();
        process.exit(0);
      }

      if (!userInput.trim()) {
        askMessage();
        return;
      }

      if (!hasKey) {
        console.log('\x1b[31m%s\x1b[0m', '\n❌ [Error]: No se puede procesar el mensaje porque no has configurado una GEMINI_API_KEY real en tu .env.');
        console.log('Por favor, ingresa tu clave y vuelve a iniciar el script.\n');
        askMessage();
        return;
      }

      try {
        // Tomar contador de reservaciones antes de procesar el mensaje
        const beforeCount = await Order.countDocuments();

        // Procesar mensaje mediante el controlador real
        // Esto ejecuta el flujo completo: IA -> Parseo JSON de Reservas -> Guardado en MongoDB
        await handleIncomingMessage(clientPhoneNumber, branch.whatsappNumberId, userInput, `msg-${Date.now()}`);

        // Revisar si se registró una nueva reservación en la base de datos
        const afterCount = await Order.countDocuments();
        if (afterCount > beforeCount) {
          const latestReservation = await Order.findOne({ customerPhone: clientPhoneNumber }).sort({ createdAt: -1 });
          if (latestReservation) {
            console.log('\x1b[32m%s\x1b[0m', '==================================================================');
            console.log('🎉 ¡RESERVACIÓN DETECTADA Y GUARDADA AUTOMÁTICAMENTE EN LA BD! 🎉');
            console.log(`🏨 Tipo de Alojamiento: ${latestReservation.roomType}`);
            console.log(`👤 Huésped Principal: ${latestReservation.customerName || 'No especificado'}`);
            console.log(`👥 Cantidad de Huéspedes: ${latestReservation.guestsCount} personas`);
            console.log(`📅 Check-In (Entrada): ${latestReservation.checkIn ? latestReservation.checkIn.toISOString().split('T')[0] : 'No definida'}`);
            console.log(`📅 Check-Out (Salida): ${latestReservation.checkOut ? latestReservation.checkOut.toISOString().split('T')[0] : 'No definida'}`);
            console.log(`💵 Costo Total: $${latestReservation.total} USD`);
            console.log(`📝 Notas/Extras: ${latestReservation.notes || 'Ninguno'}`);
            console.log('==================================================================\n');
          }
        }
      } catch (err) {
        console.error('\n❌ Ocurrió un error procesando el mensaje:', err.message);
      }

      askMessage();
    });
  };

  askMessage();
}

startSimulation();
