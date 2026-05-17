const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

/**
 * Genera una respuesta dinámica basada en el proveedor configurado.
 * @param {Object} aiConfig - La configuración de IA de la sucursal (modelo, proveedor, keys, etc).
 * @param {string} userMessage - Mensaje enviado por el cliente.
 * @param {Array} history - Historial de la conversación para mantener contexto.
 * @returns {Promise<string>} - Respuesta generada.
 */
const generateDynamicResponse = async (aiConfig, userMessage, history = []) => {
  // Configuración de Fallback por defecto
  let provider = aiConfig?.aiProvider || 'gemini';
  let modelName = aiConfig?.aiModel || 'gemini-1.5-pro';
  let apiKey = aiConfig?.apiKey;
  let temperature = aiConfig?.temperature !== undefined ? aiConfig.temperature : 0.7;

  // Fallback si la sucursal no tiene API Key configurada
  if (!apiKey) {
    if (process.env.GEMINI_API_KEY) {
      console.log('No branch API Key found, using global Gemini fallback.');
      provider = 'gemini';
      modelName = 'gemini-1.5-pro';
      apiKey = process.env.GEMINI_API_KEY;
    } else {
      throw new Error("No hay API Key configurada en la sucursal ni en el entorno (.env).");
    }
  }

  const basePrompt = aiConfig?.basePrompt || 'Eres un asistente virtual amable.';
  const systemInstruction = `
    Actúa como un asistente para el negocio. Instrucciones: ${basePrompt}
    
    Catálogo/Menú o información disponible (usa esto para responder):
    ${aiConfig?.menuContent || 'No hay menú específico provisto.'}
    
    IMPORTANTE: Si detectas que el usuario está confirmando un pedido con productos específicos:
    1. Genera tu respuesta amigable normalmente.
    2. AL FINAL de tu respuesta, añade un bloque JSON entre etiquetas <ORDER_JSON> y </ORDER_JSON> con la siguiente estructura:
    {
      "detected": true,
      "items": [{ "name": "nombre", "quantity": 1, "price": 0 }],
      "total": 0,
      "deliveryAddress": "si se menciona"
    }
    Si no hay un pedido claro, no incluyas el bloque JSON.
  `;

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, modelName, systemInstruction, userMessage, history, temperature);
    } else if (provider === 'openai') {
      return await callOpenAI(apiKey, modelName, systemInstruction, userMessage, history, temperature);
    } else if (provider === 'deepseek') {
      // DeepSeek es compatible con la SDK de OpenAI, solo cambia el Base URL
      return await callDeepSeek(apiKey, modelName, systemInstruction, userMessage, history, temperature);
    } else {
      throw new Error(`Proveedor de IA no soportado: ${provider}`);
    }
  } catch (error) {
    console.error(`Error en AI Service (${provider}):`, error.message);
    throw new Error(`No se pudo generar una respuesta usando ${provider}`);
  }
};

const callGemini = async (apiKey, modelName, systemInstruction, userMessage, history, temperature) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemInstruction }],
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Atenderé al cliente basándome en esas instrucciones y el menú." }],
      },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ],
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: 1000,
    },
  });

  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
};

const callOpenAI = async (apiKey, modelName, systemInstruction, userMessage, history, temperature) => {
  const openai = new OpenAI({ apiKey: apiKey });

  const formattedHistory = history.map(msg => ({
    role: msg.role, // 'user' o 'assistant'
    content: msg.content
  }));

  const messages = [
    { role: "system", content: systemInstruction },
    ...formattedHistory,
    { role: "user", content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: modelName,
    messages: messages,
    temperature: temperature,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
};

const callDeepSeek = async (apiKey, modelName, systemInstruction, userMessage, history, temperature) => {
  const openai = new OpenAI({ 
    apiKey: apiKey, 
    baseURL: 'https://api.deepseek.com' // Custom Base URL for DeepSeek
  });

  const formattedHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const messages = [
    { role: "system", content: systemInstruction },
    ...formattedHistory,
    { role: "user", content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: modelName,
    messages: messages,
    temperature: temperature,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
};

module.exports = { generateDynamicResponse };
