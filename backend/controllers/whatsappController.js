const { generateDynamicResponse } = require('../services/aiService');
const { sendTextMessage, markAsRead } = require('../services/metaService');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const BranchAIConfig = require('../models/BranchAIConfig');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');

/**
 * Normaliza un número telefónico removiendo caracteres no numéricos
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/[^0-9]/g, '');
};

/**
 * Normaliza texto para comparaciones insensibles a mayúsculas, tildes y espacios
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Compara dos números de teléfono teniendo en cuenta posibles prefijos de país (ej: +57 o 57)
 */
const isPhoneMatch = (phoneA, phoneB) => {
  const a = normalizePhone(phoneA);
  const b = normalizePhone(phoneB);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
};

/**
 * Valida si el remitente coincide con el identificador, usuario o teléfono configurado para la prueba
 */
const isAuthorizedTester = (authorizedTarget, { cleanFrom, extraPhone, lid, rawSender, contactName }) => {
  if (!authorizedTarget || !authorizedTarget.trim()) return false;
  
  const targetRaw = authorizedTarget.trim();
  const targetNormText = normalizeText(targetRaw);
  const targetDigits = normalizePhone(targetRaw);

  // 1. Coincidencia por Nombre de Contacto / Usuario de WhatsApp (ej: "Oscar Henao", "Oscar", "oscar")
  if (contactName) {
    const cNorm = normalizeText(contactName);
    if (cNorm && targetNormText) {
      if (cNorm === targetNormText || cNorm.includes(targetNormText) || targetNormText.includes(cNorm)) {
        return true;
      }
    }
  }

  // 2. Coincidencia por LID de WhatsApp (ej: 100055625281586)
  if (lid && targetDigits) {
    const lidDigits = normalizePhone(lid);
    if (lidDigits && (lidDigits === targetDigits || lidDigits.includes(targetDigits) || targetDigits.includes(lidDigits))) {
      return true;
    }
  }

  // 3. Coincidencia por Número Telefónico (ej: 3113414361, +573113414361, etc.)
  const phoneCandidates = [cleanFrom, extraPhone, rawSender].filter(Boolean);
  for (const cand of phoneCandidates) {
    const candDigits = normalizePhone(cand);
    if (candDigits && targetDigits) {
      if (candDigits === targetDigits || candDigits.endsWith(targetDigits) || targetDigits.endsWith(candDigits)) {
        return true;
      }
    }
    if (cand && normalizeText(cand) === targetNormText) {
      return true;
    }
  }

  return false;
};

const DEFAULT_ADMIN_ALERT_PHONE = '573113414361';

/**
 * Clasifica el error técnico de IA o del sistema en un motivo claro para el administrador
 */
const diagnoseFailureReason = (error) => {
  const rawMsg = error?.message || String(error || 'Error desconocido');
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('insufficient_quota') ||
    lower.includes('billing')
  ) {
    return {
      category: '🛑 Cuota o Tokens Agotados (Límite 429)',
      explanation: 'Se alcanzó el límite de peticiones por minuto/día o se agotaron los tokens/saldo de la API Key configurada.',
      rawDetail: rawMsg
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('incorrect api key') ||
    lower.includes('no hay api key') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('permission_denied')
  ) {
    return {
      category: '🔑 Problema de API Key / Credenciales (400/401/403)',
      explanation: 'La API Key configurada es inválida, expiró, no tiene permisos o no corresponde al proveedor (en Google Gemini debe iniciar con "AIza...").',
      rawDetail: rawMsg
    };
  }

  if (
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('500') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('high demand') ||
    lower.includes('fetch failed') ||
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound')
  ) {
    return {
      category: '🌐 Servicio de IA Caído o Saturado (503 / Red)',
      explanation: 'Los servidores del proveedor de IA presentan alta demanda temporal o hubo un corte de conexión a internet.',
      rawDetail: rawMsg
    };
  }

  if (lower.includes('404') || lower.includes('not found') || lower.includes('is not supported')) {
    return {
      category: '🤖 Modelo de IA No Disponible (404)',
      explanation: 'El modelo de IA seleccionado no está disponible o fue retirado en la API del proveedor.',
      rawDetail: rawMsg
    };
  }

  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('recitation')) {
    return {
      category: '🛡️ Respuesta Bloqueada por Filtro de Seguridad',
      explanation: 'El proveedor de IA bloqueó la respuesta por políticas de seguridad de contenido.',
      rawDetail: rawMsg
    };
  }

  return {
    category: '⚙️ Error Técnico Interno',
    explanation: 'Ocurrió una excepción técnica inesperada al procesar o responder el mensaje (no es por falta de contexto del prompt).',
    rawDetail: rawMsg
  };
};

/**
 * Envía una notificación detallada por WhatsApp al administrador (573113414361) indicando el motivo exacto de la falla
 */
const notifyAdminFailure = async ({ branch, aiConfig, cleanFrom, contactName, messageText, error }) => {
  try {
    const adminPhone = (process.env.ADMIN_ALERT_PHONE || DEFAULT_ADMIN_ALERT_PHONE).replace(/[^0-9]/g, '');
    if (!adminPhone) return;

    const diagnosis = diagnoseFailureReason(error);
    const provider = aiConfig?.aiProvider || 'gemini';
    const model = aiConfig?.aiModel || 'gemini-flash-lite-latest';
    const usingBranchKey = Boolean(aiConfig?.apiKey && aiConfig.apiKey.trim());
    const branchName = branch?.name || 'Sucursal desconocida';
    const businessName = branch?.business?.name ? ` (${branch.business.name})` : '';
    const timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const alertMessage = [
      `🚨 *ALERTA TÉCNICA - AGENTE WHATSAPP*`,
      ``,
      `🏢 *Sucursal:* ${branchName}${businessName}`,
      `👤 *Cliente afectado:* ${contactName || 'Sin nombre'} (${cleanFrom})`,
      `💬 *Mensaje del cliente:* "${messageText || '[Multimedia]'}"`,
      ``,
      `🔍 *Motivo de la falla:* ${diagnosis.category}`,
      `💡 *Diagnóstico:* ${diagnosis.explanation}`,
      `🧠 *Proveedor / Modelo:* ${provider} / ${model} (${usingBranchKey ? 'API Key de Sucursal' : 'API Key Global .env'})`,
      `🛠️ *Detalle técnico:* ${diagnosis.rawDetail.substring(0, 350)}`,
      `🕒 *Hora:* ${timestamp}`
    ].join('\n');

    // 1. Intentar envío por Baileys (motor principal)
    const baileysService = require('../services/baileysService');
    const sentViaBaileys = await baileysService.sendDirectMessage(branch?._id, adminPhone, alertMessage);
    if (sentViaBaileys) return;

    // 2. Respaldo: intentar envío por WhatsApp Web si estuviera activo
    const whatsappWebService = require('../services/whatsappWebService');
    const sentViaWweb = await whatsappWebService.sendDirectMessage(branch?._id, adminPhone, alertMessage);
    if (sentViaWweb) return;

    // 3. Respaldo: intentar envío por Meta Cloud API si la sucursal tiene credenciales
    if (branch?.whatsappNumberId && branch?.accessToken) {
      await sendTextMessage(branch.whatsappNumberId, branch.accessToken, adminPhone, alertMessage);
      console.log(`[MetaAPI] 🚨 Alerta técnica enviada al administrador (${adminPhone}).`);
    }
  } catch (notifyErr) {
    console.error('[AdminAlert] Error enviando notificación de falla al administrador:', notifyErr.message);
  }
};

/**
 * Procesa un mensaje entrante tanto de WhatsApp Web (vía whatsapp-web.js) como de Meta Cloud API.
 * 
 * Soporta dos firmas:
 * 1. Objeto: handleIncomingMessage({ from, branchId, messageText, messageId, contactName, gateway, replyCallback })
 * 2. Posicional (Meta Webhook): handleIncomingMessage(from, phoneNumberId, messageText, messageId, contactName)
 */
const handleIncomingMessage = async (arg1, arg2, arg3, arg4, arg5 = '', arg6 = null) => {
  let from, branchId, phoneNumberId, messageText, messageId, contactName, gateway, replyCallback, mediaType, hasMedia;
  let extraPhone = '';
  let lid = '';
  let rawSender = '';

  if (typeof arg1 === 'object' && arg1 !== null) {
    from = arg1.from;
    extraPhone = arg1.resolvedPhone || '';
    lid = arg1.lid || '';
    rawSender = arg1.rawSender || '';
    branchId = arg1.branchId;
    phoneNumberId = arg1.phoneNumberId;
    messageText = (arg1.messageText || '').trim();
    messageId = arg1.messageId;
    contactName = arg1.contactName || '';
    gateway = arg1.gateway || 'baileys';
    replyCallback = arg1.replyCallback;
    hasMedia = Boolean(arg1.hasMedia);
    mediaType = arg1.mediaType || null;
  } else {
    from = arg1;
    phoneNumberId = arg2;
    messageText = (arg3 || '').trim();
    messageId = arg4;
    contactName = arg5 || '';
    gateway = 'meta';
    mediaType = arg6 || null;
    hasMedia = Boolean(mediaType);
  }

  let cleanFrom = '';
  let branch = null;
  let aiConfig = null;

  try {
    // Si no hay media y el texto está vacío, ignorar mensaje
    if (!hasMedia && !messageText) return;

    // Normalizar el identificador del remitente
    cleanFrom = from ? from.toString() : '';
    if (cleanFrom.startsWith('whatsapp:')) cleanFrom = cleanFrom.replace('whatsapp:', '');
    cleanFrom = cleanFrom.replace(/@c\.us|@s\.whatsapp\.net|@lid/g, '').split(':')[0];
    
    // Si tenemos el teléfono real resuelto y cleanFrom parece un LID (>= 14 dígitos), usar el teléfono real
    if (extraPhone && cleanFrom.length >= 14) {
      cleanFrom = extraPhone;
    }
    const cleanDigits = normalizePhone(cleanFrom);

    // 1. Obtener la sucursal (por branchId directo o por whatsappNumberId de Meta)
    if (branchId) {
      branch = await Branch.findById(branchId).populate('business');
    } else if (phoneNumberId) {
      branch = await Branch.findOne({ whatsappNumberId: phoneNumberId }).populate('business');
    }

    if (!branch) {
      console.error(`Sucursal no encontrada para procesar mensaje (branchId: ${branchId}, phoneNumberId: ${phoneNumberId})`);
      return;
    }

    // 2. Obtener la configuración de IA de la sucursal
    aiConfig = await BranchAIConfig.findOne({ branch: branch._id });

    // 3. FILTRO DE MODO PRUEBAS (Protección de chats personales en demos)
    if (aiConfig && aiConfig.testMode && aiConfig.testPhoneNumber && aiConfig.testPhoneNumber.trim() !== '') {
      const authorized = aiConfig.testPhoneNumber.trim();
      const isAllowed = isAuthorizedTester(authorized, {
        cleanFrom,
        extraPhone,
        lid,
        rawSender,
        contactName
      });

      if (!isAllowed) {
        console.log(`🔒 [Modo Pruebas Activo] Mensaje de "${cleanFrom}" (Nombre: "${contactName || 'N/A'}", LID: "${lid || 'N/A'}") ignorado. Solo se responderá al contacto/usuario autorizado: "${authorized}".`);
        return null;
      }
      console.log(`✅ [Modo Pruebas] Mensaje de "${cleanFrom}" (${contactName || 'Sin Nombre'}) autorizado (coincide con "${authorized}"). Procesando con IA...`);
    }

    // 4. Buscar o crear la conversación
    let conversation = await Conversation.findOne({ 
      branch: branch._id, 
      customerNumber: cleanFrom 
    });

    if (!conversation) {
      conversation = new Conversation({
        branch: branch._id,
        customerNumber: cleanFrom,
        customerName: contactName || undefined,
        messages: []
      });
    } else if (contactName && !conversation.customerName) {
      conversation.customerName = contactName;
    }

    // 5. VALIDACIÓN DE FORMATO: ¿Es media (imagen, audio, captura, etc.) o contenido sin texto alfanumérico ni emojis?
    const hasAlphanumericOrEmoji = /[a-zA-Z0-9\u00C0-\u017F]|\p{Extended_Pictographic}/u.test(messageText);
    const isNonTextOrUnsupported = hasMedia || !hasAlphanumericOrEmoji;

    if (isNonTextOrUnsupported) {
      let userDisplayContent = messageText;
      let reminderResponse = '';

      if (mediaType === 'audio' || mediaType === 'ptt' || mediaType === 'voice') {
        userDisplayContent = messageText ? `[Nota de voz / Audio]: ${messageText}` : '[Nota de voz / Audio]';
        reminderResponse = 'Hola 😊 Por este canal no puedo escuchar notas de voz ni audios, únicamente puedo procesar mensajes de texto y emojis. ¿Podrías escribir lo que necesitas para ayudarte con gusto?';
      } else if (mediaType === 'image') {
        userDisplayContent = messageText ? `[Imagen / Captura]: ${messageText}` : '[Imagen / Captura de pantalla]';
        if (messageText) {
          reminderResponse = 'Hola 😊 Por este medio no puedo visualizar imágenes ni capturas de pantalla, solo procesar texto y emojis. ¿Podrías indicarme por escrito los detalles de tu consulta para ayudarte con gusto?';
        } else {
          reminderResponse = 'Hola 😊 Te comento que por este chat no puedo ver imágenes ni capturas de pantalla, únicamente procesar mensajes de texto y emojis. Por favor, escríbeme los detalles de lo que necesitas y con gusto te colaboro.';
        }
      } else if (mediaType === 'video') {
        userDisplayContent = messageText ? `[Video]: ${messageText}` : '[Video]';
        reminderResponse = 'Hola 😊 Por este canal no puedo reproducir videos, únicamente puedo leer mensajes de texto y emojis. Por favor cuéntame por escrito lo que necesitas y con gusto te asisto.';
      } else if (mediaType === 'document') {
        userDisplayContent = messageText ? `[Documento adjunto]: ${messageText}` : '[Documento adjunto]';
        reminderResponse = 'Hola 😊 Por este chat no puedo abrir documentos o archivos adjuntos, este canal funciona exclusivamente con texto y emojis. Por favor escríbeme tu consulta en texto y con gusto te ayudo.';
      } else if (mediaType === 'sticker') {
        userDisplayContent = '[Sticker]';
        reminderResponse = 'Hola 😊 Te recuerdo de forma sutil que este chat es únicamente para mensajes de texto y emojis. Por favor escríbeme lo que necesitas por escrito y con gusto te ayudo.';
      } else {
        userDisplayContent = messageText || '[Contenido no admitido]';
        reminderResponse = 'Hola 😊 Te recuerdo de forma sutil que este canal de atención funciona únicamente con mensajes de texto y emojis. Por favor escríbeme tu consulta por aquí y con mucho gusto te ayudo.';
      }

      console.log(`[Validación Texto] Detectado contenido no textual (${mediaType || 'sin texto alfanumérico/emoji'}) de ${cleanFrom}. Enviando recordatorio sutil.`);

      // Guardar en el historial de la conversación
      conversation.messages.push({ role: 'user', content: userDisplayContent });
      conversation.messages.push({ role: 'assistant', content: reminderResponse });
      conversation.lastInteraction = Date.now();
      await conversation.save();

      // Enviar respuesta por el canal correspondiente
      if ((gateway === 'whatsapp_web' || gateway === 'baileys') && typeof replyCallback === 'function') {
        await replyCallback(reminderResponse);
        console.log(`[${gateway}] Recordatorio enviado a ${cleanFrom}: "${reminderResponse}"`);
      } else if (branch.whatsappNumberId && branch.accessToken) {
        await sendTextMessage(branch.whatsappNumberId, branch.accessToken, cleanFrom, reminderResponse);
        if (messageId) {
          await markAsRead(branch.whatsappNumberId, branch.accessToken, messageId);
        }
        console.log(`[MetaAPI] Recordatorio enviado a ${cleanFrom}: "${reminderResponse}"`);
      }

      return reminderResponse;
    }


    // Historial reciente de los últimos 10 mensajes
    const history = conversation.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 5. Preparar contexto adicional (ej: disponibilidad en tiempo real de Google Calendar)
    let extraContext = {};
    if (aiConfig && aiConfig.calendarSyncEnabled) {
      try {
        const { getCalendarBusyRanges } = require('../services/googleCalendarService');
        const busyEvents = await getCalendarBusyRanges(aiConfig);
        if (busyEvents && busyEvents.length > 0) {
          const eventsList = busyEvents.map(e => {
            const startStr = e.start ? new Date(e.start).toLocaleDateString('es-CO') : '';
            const endStr = e.end ? new Date(e.end).toLocaleDateString('es-CO') : '';
            return `- ${e.summary}: del ${startStr} al ${endStr}`;
          }).join('\n');
          extraContext.calendarAvailability = `Fechas ocupadas/reservadas en el calendario:\n${eventsList}`;
        } else {
          extraContext.calendarAvailability = 'Todas las fechas están disponibles en este momento.';
        }
      } catch (calErr) {
        console.warn('[GoogleCalendar] Error consultando disponibilidad para el prompt:', calErr.message);
      }
    }

    // 6. Llamada al motor dinámico de IA (Gemini, OpenAI, o DeepSeek) con directrices de concisión
    let rawResponse;
    try {
      rawResponse = await generateDynamicResponse(aiConfig, messageText, history, extraContext);
    } catch (aiError) {
      console.error('[AI Fallback] Error en servicio de IA (agotamiento de tokens/cuota o indisponibilidad):', aiError.message);

      const contactPhone = branch?.phone ? ` al ${branch.phone}` : '';
      const technicalFallbackMsg = `Lo lamento, por el momento no te puedo seguir atendiendo estamos presentando problemas técnicos por favor comunícate con un agente humano${contactPhone}.`;

      // Guardar en la base de datos la interacción con el mensaje de contingencia para que se vea en el panel de chats
      conversation.messages.push({ role: 'user', content: messageText });
      conversation.messages.push({ role: 'assistant', content: technicalFallbackMsg });
      conversation.lastInteraction = Date.now();
      await conversation.save();

      // Enviar la respuesta por el canal correspondiente (Baileys, WhatsApp Web o Meta API)
      if ((gateway === 'whatsapp_web' || gateway === 'baileys') && typeof replyCallback === 'function') {
        await replyCallback(technicalFallbackMsg);
        console.log(`[${gateway}] Contingencia (sin tokens/error IA) enviada a ${cleanFrom}: "${technicalFallbackMsg}"`);
      } else if (branch.whatsappNumberId && branch.accessToken) {
        await sendTextMessage(branch.whatsappNumberId, branch.accessToken, cleanFrom, technicalFallbackMsg);
        if (messageId) {
          await markAsRead(branch.whatsappNumberId, branch.accessToken, messageId);
        }
        console.log(`[MetaAPI] Contingencia (sin tokens/error IA) enviada a ${cleanFrom}: "${technicalFallbackMsg}"`);
      }

      // Notificar al WhatsApp del administrador (573113414361) con el diagnóstico exacto de la falla
      await notifyAdminFailure({
        branch,
        aiConfig,
        cleanFrom,
        contactName,
        messageText,
        error: aiError
      });

      return technicalFallbackMsg;
    }

    // 7. Extraer JSON de pedido o reservación si existe
    let cleanResponse = rawResponse;
    let orderData = null;
    let reservationData = null;

    if (rawResponse.includes('<ORDER_JSON>')) {
      const match = rawResponse.match(/<ORDER_JSON>([\s\S]*?)<\/ORDER_JSON>/);
      if (match && match[1]) {
        try {
          orderData = JSON.parse(match[1].trim());
          cleanResponse = rawResponse.replace(/<ORDER_JSON>[\s\S]*?<\/ORDER_JSON>/, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de pedido:', e);
        }
      }
    } else if (rawResponse.includes('<RESERVATION_JSON>')) {
      const match = rawResponse.match(/<RESERVATION_JSON>([\s\S]*?)<\/RESERVATION_JSON>/);
      if (match && match[1]) {
        try {
          reservationData = JSON.parse(match[1].trim());
          cleanResponse = rawResponse.replace(/<RESERVATION_JSON>[\s\S]*?<\/RESERVATION_JSON>/, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de reservación:', e);
        }
      }
    }

    // 8. Guardar mensajes en la base de datos
    conversation.messages.push({ role: 'user', content: messageText });
    conversation.messages.push({ role: 'assistant', content: cleanResponse });
    conversation.lastInteraction = Date.now();
    await conversation.save();

    // 9. Si hay un pedido o reservación detectada, guardarla
    if (orderData && orderData.detected) {
      let commissionAmount = 0;
      if (branch.business && typeof branch.business.commission === 'number') {
        commissionAmount = (orderData.total * branch.business.commission) / 100;
      }

      const newOrder = new Order({
        branch: branch._id,
        customerPhone: cleanFrom,
        customerName: contactName || undefined,
        items: orderData.items,
        total: orderData.total,
        deliveryAddress: orderData.deliveryAddress,
        status: 'pending',
        commissionStatus: 'pending',
        commissionAmount: commissionAmount,
        orderType: 'order'
      });
      await newOrder.save();
      console.log('Nuevo pedido registrado:', newOrder._id);
    } else if (reservationData && reservationData.detected) {
      let commissionAmount = 0;
      if (branch.business && typeof branch.business.commission === 'number') {
        commissionAmount = ((reservationData.total || 0) * branch.business.commission) / 100;
      }

      // Sincronizar automáticamente con Google Calendar si está activado
      let googleEvent = null;
      if (aiConfig && aiConfig.calendarSyncEnabled) {
        try {
          const { createReservationEvent } = require('../services/googleCalendarService');
          googleEvent = await createReservationEvent(aiConfig, reservationData, cleanFrom);
        } catch (gcalErr) {
          console.error('[GoogleCalendar] Error creando evento en Google Calendar:', gcalErr.message);
        }
      }

      const newReservation = new Order({
        branch: branch._id,
        customerPhone: cleanFrom,
        customerName: reservationData.customerName || contactName || '',
        items: [{
          name: `Reserva: ${reservationData.roomType || 'Habitación/Glamping'}`,
          quantity: 1,
          price: reservationData.total || 0,
          total: reservationData.total || 0
        }],
        total: reservationData.total || 0,
        status: 'pending',
        commissionStatus: 'pending',
        commissionAmount: commissionAmount,
        orderType: 'reservation',
        checkIn: reservationData.checkIn ? new Date(reservationData.checkIn) : null,
        checkOut: reservationData.checkOut ? new Date(reservationData.checkOut) : null,
        guestsCount: reservationData.guestsCount || 1,
        roomType: reservationData.roomType || 'Habitación/Glamping',
        notes: reservationData.notes || '',
        googleCalendarEventId: googleEvent?.eventId,
        googleCalendarEventLink: googleEvent?.eventLink
      });
      await newReservation.save();
      console.log('Nueva reservación registrada:', newReservation._id, googleEvent ? `(Sincronizada en Google Calendar: ${googleEvent.eventId})` : '');
    }

    // 9. Enviar la respuesta por el canal correspondiente
    if ((gateway === 'whatsapp_web' || gateway === 'baileys') && typeof replyCallback === 'function') {
      // Envío mediante Baileys o WhatsApp Web (whatsapp-web.js)
      await replyCallback(cleanResponse);
      console.log(`[${gateway}] Respuesta enviada a ${cleanFrom}: "${cleanResponse}"`);
    } else if (branch.whatsappNumberId && branch.accessToken) {
      // Envío mediante Meta Cloud API
      await sendTextMessage(branch.whatsappNumberId, branch.accessToken, cleanFrom, cleanResponse);
      if (messageId) {
        await markAsRead(branch.whatsappNumberId, branch.accessToken, messageId);
      }
      console.log(`[MetaAPI] Respuesta enviada a ${cleanFrom}: "${cleanResponse}"`);
    } else {
      console.warn(`[Canal no configurado] No se pudo enviar mensaje saliente para ${cleanFrom}`);
    }

    return cleanResponse;

  } catch (error) {
    console.error('Error procesando mensaje:', error);
    const contactPhone = branch?.phone ? ` al ${branch.phone}` : '';
    const technicalFallbackMsg = `Lo lamento, por el momento no te puedo seguir atendiendo estamos presentando problemas técnicos por favor comunícate con un agente humano${contactPhone}.`;

    if ((gateway === 'whatsapp_web' || gateway === 'baileys') && typeof replyCallback === 'function') {
      try {
        await replyCallback(technicalFallbackMsg);
        console.log(`[${gateway}] Mensaje de contingencia enviado a ${cleanFrom}: "${technicalFallbackMsg}"`);
      } catch (replyErr) {
        console.error('Error enviando mensaje de contingencia:', replyErr.message);
      }
    } else if (branch?.whatsappNumberId && branch?.accessToken) {
      try {
        await sendTextMessage(branch.whatsappNumberId, branch.accessToken, cleanFrom, technicalFallbackMsg);
        if (messageId) {
          await markAsRead(branch.whatsappNumberId, branch.accessToken, messageId);
        }
        console.log(`[MetaAPI] Mensaje de contingencia enviado a ${cleanFrom}: "${technicalFallbackMsg}"`);
      } catch (metaErr) {
        console.error('Error enviando mensaje de contingencia por Meta:', metaErr.message);
      }
    }

    // Notificar al WhatsApp del administrador (573113414361) con el diagnóstico exacto de la falla
    await notifyAdminFailure({
      branch,
      aiConfig,
      cleanFrom,
      contactName,
      messageText,
      error
    });
  }
};

module.exports = { 
  handleIncomingMessage,
  normalizePhone,
  isPhoneMatch
};
