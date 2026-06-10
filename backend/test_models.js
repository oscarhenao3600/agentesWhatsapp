require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'tu_api_key_de_gemini' || apiKey.trim() === '') {
    console.error('❌ Por favor, configura GEMINI_API_KEY en el archivo .env primero.');
    return;
  }

  try {
    console.log('Consultando modelos de Gemini disponibles para tu API Key...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // El método oficial para listar modelos en el SDK v0.11 es listModels
    // Vamos a intentar obtener los modelos usando listModels()
    // Nota: El cliente utiliza la API interna, intentaremos listar los modelos
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('\n✅ Modelos Disponibles en tu Cuenta:');
    if (data.models && data.models.length > 0) {
      data.models.forEach(m => {
        console.log(`- ${m.name} (${m.displayName})`);
      });
    } else {
      console.log('No se encontraron modelos.');
    }
  } catch (error) {
    console.error('❌ Error al listar modelos:', error.message);
  }
}

main();
