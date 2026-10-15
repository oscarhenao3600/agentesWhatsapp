const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

/**
 * Genera una respuesta dinámica basada en el proveedor configurado.
 * @param {Object} aiConfig - La configuración de IA de la sucursal (modelo, proveedor, keys, etc).
 * @param {string} userMessage - Mensaje enviado por el cliente.
 * @param {Array} history - Historial de la conversación para mantener contexto.
 * @returns {Promise<string>} - Respuesta generada.
 */
const generateDynamicResponse = async (aiConfig, userMessage, history = [], extraContext = {}) => {
  // Configuración de Fallback por defecto
  let provider = aiConfig?.aiProvider || 'gemini';
  let modelName = aiConfig?.aiModel || 'gemini-2.5-flash';
  let apiKey = aiConfig?.apiKey;
  let temperature = aiConfig?.temperature !== undefined ? aiConfig.temperature : 0.7;

  // Fallback si la sucursal no tiene API Key configurada
  if (!apiKey) {
    if (process.env.GEMINI_API_KEY) {
      console.log('No branch API Key found, using global Gemini fallback.');
      provider = 'gemini';
      modelName = 'gemini-2.5-flash';
      apiKey = process.env.GEMINI_API_KEY;
    } else {
      throw new Error("No hay API Key configurada en la sucursal ni en el entorno (.env).");
    }
  }

  const basePrompt = aiConfig?.basePrompt || 'Eres un asistente virtual amable.';
  
  let categoryInstructions = '';
  if (aiConfig?.businessType === 'hotel') {
    categoryInstructions = `
    IMPORTANTE: Si detectas que el usuario está confirmando una reservación (ej: fechas de estadía, número de huéspedes, tipo de glamping/habitación):
    1. Genera tu respuesta amigable normalmente.
    2. AL FINAL de tu respuesta, añade un bloque JSON entre etiquetas <RESERVATION_JSON> y </RESERVATION_JSON> con la siguiente estructura:
    {
      "detected": true,
      "customerName": "Nombre del huésped si lo menciona",
      "checkIn": "Fecha checkIn (formato YYYY-MM-DD o YYYY-MM-DD HH:mm)",
      "checkOut": "Fecha checkOut (formato YYYY-MM-DD o YYYY-MM-DD HH:mm)",
      "guestsCount": 1,
      "roomType": "Nombre del tipo de habitación, glamping, o cabaña elegida",
      "total": 0,
      "notes": "observaciones, peticiones especiales o extras"
    }
    Si no hay una reservación claramente confirmada por el usuario, no incluyas el bloque JSON.
    `;
  } else {
    categoryInstructions = `
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
  }

  const calendarContext = extraContext?.calendarAvailability ? `
    CALENDARIO DE DISPONIBILIDAD (Google Calendar en tiempo real):
    ${extraContext.calendarAvailability}
    Instrucción de disponibilidad: Si el cliente consulta por fechas que se encuentran OCUPADAS, infórmale cortésmente y sugiere fechas disponibles cercanas. Si las fechas están libres, procede a solicitar los datos de la reserva normalmente.
  ` : '';

  const conciseInstructions = (aiConfig?.conciseMode !== false) ? `
    REGLAS ESTRICTAS DE CONCISIÓN PARA WHATSAPP (Ahorro de Mensajes y Costos Meta):
    1. Responde de forma DIRECTA, CONCRETA y BREVE (máximo 2 a 3 oraciones cortas).
    2. Ve al grano: no uses fórmulas de cortesía largas, introducciones innecesarias ni repitas saludos si la conversación ya está activa.
    3. Si necesitas recopilar datos del cliente (ej: fechas de check-in y check-out, cantidad de personas o productos para un pedido), pídela TODA de una sola vez en un único mensaje claro, en lugar de hacer múltiples preguntas en varios turnos.
    4. Prohibido usar frases de cierre repetitivas como "¿En qué más te puedo colaborar hoy?" o "¿Deseas algo más?", ya que alargan la conversación y generan mensajes y cobros innecesarios.
    5. Proporciona toda la respuesta en un solo mensaje fluido. No inventes precios ni datos no incluidos en el catálogo.
  ` : '';

  const textOnlyRule = `
    REGLA DE FORMATO DE ATENCIÓN (SOLO TEXTO Y EMOJIS):
    Este canal de WhatsApp opera exclusivamente mediante mensajes de texto y emojis.
    Si el cliente en su mensaje indica o hace referencia a que envió o desea enviar un audio, nota de voz, imagen, foto, captura de pantalla o documento (ej: "te mandé un audio", "mira la captura", "revisa la foto"), recuérdale de forma sutil, cordial y breve que por este chat únicamente puedes procesar mensajes de texto y emojis, e invítalo amablemente a escribir los detalles de su consulta en texto.
  `;

  const systemInstruction = `
    Actúa como un asistente para el negocio. Instrucciones: ${basePrompt}
    
    Catálogo/Menú o información disponible (usa esto para responder):
    ${aiConfig?.menuContent || 'No hay menú específico provisto.'}
    
    ${categoryInstructions}

    ${calendarContext}

    ${conciseInstructions}

    ${textOnlyRule}
  `;


  const maxTokens = aiConfig?.maxOutputTokens || 250;

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens);
    } else if (provider === 'openai') {
      return await callOpenAI(apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens);
    } else if (provider === 'deepseek') {
      // DeepSeek es compatible con la SDK de OpenAI, solo cambia el Base URL
      return await callDeepSeek(apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens);
    } else {
      throw new Error(`Proveedor de IA no soportado: ${provider}`);
    }
  } catch (error) {
    console.error(`Error en AI Service (${provider}):`, error.message);
    throw new Error(`No se pudo generar una respuesta usando ${provider}`);
  }
};

const callGemini = async (apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens = 250) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  const executeChat = async (targetModel) => {
    const model = genAI.getGenerativeModel({ model: targetModel });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemInstruction }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Atenderé al cliente de forma breve, concisa y directa según tus instrucciones." }],
        },
        ...history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  };

  // Reintento con backoff en caso de 503 (alta demanda) o rate limit
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await executeChat(modelName);
    } catch (err) {
      const isRetryable = err.message.includes('503') || err.message.includes('demand') || err.message.includes('RESOURCE_EXHAUSTED');
      if (isRetryable && attempt < 3) {
        console.warn(`[Gemini Retry] Intento ${attempt} falló (${err.message.substring(0, 60)}). Reintentando en ${attempt * 1200}ms...`);
        await new Promise(r => setTimeout(r, attempt * 1200));
      } else {
        throw err;
      }
    }
  }
};

const callOpenAI = async (apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens = 250) => {
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
    max_tokens: maxTokens,
  });

  return response.choices[0].message.content;
};

const callDeepSeek = async (apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens = 250) => {
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
    max_tokens: maxTokens,
  });

  return response.choices[0].message.content;
};

module.exports = { generateDynamicResponse };
