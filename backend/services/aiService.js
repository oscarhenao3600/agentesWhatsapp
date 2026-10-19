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
  let modelName = aiConfig?.aiModel || 'gemini-flash-lite-latest';
  let apiKey = aiConfig?.apiKey;
  let temperature = aiConfig?.temperature !== undefined ? aiConfig.temperature : 0.7;

  // Si el modelo guardado es obsoleto o no existe en la API oficial de Google, migrarlo a un modelo válido
  if (modelName && (modelName.includes('gemini-1.5') || modelName.includes('gemini-2.0'))) {
    modelName = 'gemini-flash-lite-latest';
  } else if (modelName === 'gemini-3.5-flash-lite') {
    modelName = 'gemini-2.5-flash-lite';
  } else if (modelName === 'gemini-3.8-flash') {
    modelName = 'gemini-2.5-flash';
  }

  // Limpiar posibles espacios en blanco al inicio o final de la API Key
  if (typeof apiKey === 'string') {
    apiKey = apiKey.trim();
  }
  const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();

  // Fallback si la sucursal no tiene API Key configurada
  if (!apiKey) {
    if (envGeminiKey) {
      console.log('No branch API Key found, using global Gemini fallback.');
      provider = 'gemini';
      if (!modelName || modelName.includes('gemini-1.5') || modelName.includes('gemini-2.0')) {
        modelName = 'gemini-flash-lite-latest';
      }
      apiKey = envGeminiKey;
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
      try {
        return await callGemini(apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens);
      } catch (gemErr) {
        const isInvalidKey = gemErr.message?.includes('API_KEY_INVALID') || gemErr.message?.includes('API key not valid');
        if (isInvalidKey && envGeminiKey && envGeminiKey !== apiKey) {
          console.warn('[AI Service] La API Key de la sucursal es inválida. Intentando con GEMINI_API_KEY global del .env...');
          return await callGemini(envGeminiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens);
        }
        throw gemErr;
      }
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
    throw new Error(`No se pudo generar una respuesta usando ${provider}: ${error.message}`);
  }
};

const callGemini = async (apiKey, modelName, systemInstruction, userMessage, history, temperature, maxTokens = 250) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Lista de modelos reales de Google Gemini a intentar en cascada ante errores de cuota (429), demanda (503) o modelos no encontrados (404)
  const candidateModels = [
    modelName,
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest'
  ];

  // Filtrar modelos no válidos, obsoletos y eliminar duplicados
  const uniqueModels = [...new Set(candidateModels.filter(m => m && !m.includes('gemini-1.5') && !m.includes('gemini-2.0') && m !== 'gemini-3.5-flash-lite' && m !== 'gemini-3.8-flash'))];

  let primaryError = null;
  let lastError = null;

  for (const targetModel of uniqueModels) {
    const executeChat = async () => {
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

    let abortAllModels = false;

    // Reintentar hasta 2 veces por modelo en caso de saturación temporal (503)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await executeChat();
        return text;
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        // Preservar el primer error relevante (ej. 429 cuota o 503 saturación) para que no sea sobrescrito por un 404 secundario
        if (!primaryError || (!msg.includes('404') && primaryError.message?.includes('404'))) {
          primaryError = err;
        }

        const isInvalidKey = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('401') || msg.includes('403');
        if (isInvalidKey) {
          console.error(`[Gemini Error] Credencial API Key inválida o sin permisos: ${msg}`);
          abortAllModels = true;
          break;
        }

        const isDemandOrQuota = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('404');
        if ((msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) && attempt < 2) {
          console.warn(`[Gemini Retry] Modelo ${targetModel} con límite momentáneo o saturación (intento ${attempt}). Reintentando en 2500ms...`);
          await new Promise(r => setTimeout(r, 2500));
        } else {
          console.warn(`[Gemini Fallback] Error con modelo '${targetModel}': ${msg.substring(0, 120)}. ${isDemandOrQuota ? 'Intentando siguiente modelo...' : ''}`);
          break; // Pasar al siguiente modelo de la lista
        }
      }
    }

    if (abortAllModels) {
      break;
    }
  }

  throw primaryError || lastError || new Error("No se pudo generar una respuesta con ninguno de los modelos de Gemini disponibles.");
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
