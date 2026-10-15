require('dotenv').config();
const { isPhoneMatch, normalizePhone, handleIncomingMessage } = require('./controllers/whatsappController');
const { generateDynamicResponse } = require('./services/aiService');

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 PRUEBAS UNITARIAS: MODO PRUEBAS, CONCISIÓN Y FILTROS');
  console.log('========================================================\n');

  // Test 1: Normalización y Coincidencia de Teléfonos
  console.log('--- TEST 1: Comparación y Normalización de Teléfonos ---');
  const phoneTests = [
    { incoming: '+57 300 123 4567', test: '573001234567', expected: true },
    { incoming: '573001234567@c.us', test: '+573001234567', expected: true },
    { incoming: '3001234567', test: '+57 300 123 4567', expected: true },
    { incoming: '+57 311 999 8888', test: '+57 300 123 4567', expected: false }, // Amigo/Familiar del cliente
    { incoming: '573205554433', test: '+57 300 123 4567', expected: false } // Contacto desconocido
  ];

  let test1Passed = true;
  for (const t of phoneTests) {
    const match = isPhoneMatch(t.incoming, t.test);
    const pass = match === t.expected;
    console.log(`  [${pass ? '✅ PASS' : '❌ FAIL'}] "${t.incoming}" vs "${t.test}" -> Coincide: ${match} (Esperado: ${t.expected})`);
    if (!pass) test1Passed = false;
  }

  // Test 2: Simulación de Filtrado de Modo Pruebas
  console.log('\n--- TEST 2: Filtrado de Modo Pruebas (Protección de Chats Personales) ---');
  const clientTestNumber = '+57 300 123 4567';
  const incomingStranger = '+57 310 555 1234'; // Chat personal ajeno a la demo
  const incomingClient = '573001234567'; // El teléfono de la demo

  const isStrangerAllowed = isPhoneMatch(incomingStranger, clientTestNumber);
  const isClientAllowed = isPhoneMatch(incomingClient, clientTestNumber);

  console.log(`  Contacto Personal (${incomingStranger}): ¿Es procesado por el bot? -> ${isStrangerAllowed ? 'SÍ (Peligro)' : 'NO (Ignorado en silencio - SEGURO ✅)'}`);
  console.log(`  Contacto Demo (${incomingClient}): ¿Es procesado por el bot? -> ${isClientAllowed ? 'SÍ (Autorizado ✅)' : 'NO (Error)'}`);

  // Test 3: Verificación de Respuestas Concretas y Límite de Tokens con Gemini
  console.log('\n--- TEST 3: Respuestas Concretas y Breves de la IA (Ahorro de Mensajes) ---');
  try {
    const aiConfig = {
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.4,
      conciseMode: true,
      maxOutputTokens: 250,
      businessType: 'hotel',
      basePrompt: 'Eres el recepcionista del Hotel Paraíso Glamping. Tenemos Glamping Domo ($150 USD) y Cabaña ($100 USD).',
      menuContent: 'Domo: $150. Cabaña: $100.'
    };

    console.log('Enviando consulta a Gemini 2.5 Flash en Modo Conciso: "Hola, qué precio tienen los glampings y qué incluyen?"...');
    const response = await generateDynamicResponse(aiConfig, 'Hola, qué precio tienen los glampings y qué incluyen?');
    
    console.log('\n💬 Respuesta Generada por la IA:');
    console.log('\x1b[36m%s\x1b[0m', response);

    // Contar oraciones y longitud
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    console.log(`\n📊 Métricas de Concisión:`);
    console.log(`- Caracteres totales: ${response.length}`);
    console.log(`- Cantidad de oraciones aprox: ${sentences.length}`);
    const isConcise = sentences.length <= 4 && response.length < 400;
    console.log(`- ¿Cumple con brevedad y síntesis para WhatsApp?: ${isConcise ? 'SÍ ✅' : 'NO ⚠️'}`);

  } catch (err) {
    console.error('Error en Test 3:', err.message);
  }

  console.log('\n========================================================');
  console.log('🎉 PRUEBAS FINALIZADAS');
  console.log('========================================================\n');
}

runTests();
