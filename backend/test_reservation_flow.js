require('dotenv').config();
const { generateDynamicResponse } = require('./services/aiService');

async function testReservationExtraction() {
  console.log('\n--- TEST: Extracción de Reservación en Modo Conciso ---');
  const aiConfig = {
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.4,
    conciseMode: true,
    maxOutputTokens: 250,
    businessType: 'hotel',
    basePrompt: 'Eres el recepcionista del Hotel Paraíso Glamping.',
    menuContent: 'Domo: $150 USD por noche. Cabaña: $100 USD por noche.'
  };

  const userMessage = 'Quiero reservar el Domo a nombre de Carlos Pérez para 2 personas del 15 al 17 de octubre';
  console.log(`Usuario: "${userMessage}"\n`);

  const response = await generateDynamicResponse(aiConfig, userMessage);
  console.log('Respuesta completa de la IA:');
  console.log('\x1b[36m%s\x1b[0m', response);

  const hasJson = response.includes('<RESERVATION_JSON>');
  console.log(`\n¿Contiene bloque <RESERVATION_JSON>?: ${hasJson ? 'SÍ ✅' : 'NO ❌'}`);

  if (hasJson) {
    const match = response.match(/<RESERVATION_JSON>([\s\S]*?)<\/RESERVATION_JSON>/);
    try {
      const parsed = JSON.parse(match[1].trim());
      console.log('JSON parseado exitosamente:', parsed);
      const cleanText = response.replace(/<RESERVATION_JSON>[\s\S]*?<\/RESERVATION_JSON>/, '').trim();
      console.log(`\nMensaje limpio que verá el usuario en WhatsApp:\n"${cleanText}"`);
    } catch (e) {
      console.error('Error parseando JSON:', e.message);
    }
  }
}

testReservationExtraction();
