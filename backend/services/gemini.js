const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Genera una respuesta basada en un prompt de negocio y el mensaje del usuario.
 * @param {string} businessPrompt - Instrucciones específicas del negocio.
 * @param {string} userMessage - Mensaje enviado por el cliente.
 * @param {Array} history - Historial de la conversación para mantener contexto.
 * @returns {Promise<string>} - Respuesta generada.
 */
const generateResponse = async (businessPrompt, userMessage, history = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Preparar el contexto con instrucciones de extracción de pedidos
    const systemInstruction = `
      Actúa como un asistente para el siguiente negocio. Instrucciones: ${businessPrompt}
      
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

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemInstruction }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Atenderé al cliente y extraeré la información del pedido en el formato JSON solicitado cuando sea necesario." }],
        },
        ...history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error en Gemini Service:", error);
    throw new Error("No se pudo generar una respuesta de IA");
  }
};

module.exports = { generateResponse };
