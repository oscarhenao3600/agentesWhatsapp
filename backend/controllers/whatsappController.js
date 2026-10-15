const { generateDynamicResponse } = require('../services/aiService');
const { sendTextMessage, markAsRead } = require('../services/metaService');
const Branch = require('../models/Branch');
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

/**
 * Procesa un mensaje entrante tanto de WhatsApp Web (vía whatsapp-web.js) como de Meta Cloud API.
 * 
 * Soporta dos firmas:
 * 1. Objeto: handleIncomingMessage({ from, branchId, messageText, messageId, contactName, gateway, replyCallback })
 * 2. Posicional (Meta Webhook): handleIncomingMessage(from, phoneNumberId, messageText, messageId, contactName)
 */
const handleIncomingMessage = async (arg1, arg2, arg3, arg4, arg5 = '') => {
  let from, branchId, phoneNumberId, messageText, messageId, contactName, gateway, replyCallback;
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
    messageText = arg1.messageText;
    messageId = arg1.messageId;
    contactName = arg1.contactName || '';
    gateway = arg1.gateway || 'whatsapp_web';
    replyCallback = arg1.replyCallback;
  } else {
    from = arg1;
    phoneNumberId = arg2;
    messageText = arg3;
    messageId = arg4;
    contactName = arg5 || '';
    gateway = 'meta';
  }

  try {
    if (!messageText || !messageText.trim()) return;

    // Normalizar el identificador del remitente
    let cleanFrom = from ? from.toString() : '';
    if (cleanFrom.startsWith('whatsapp:')) cleanFrom = cleanFrom.replace('whatsapp:', '');
    cleanFrom = cleanFrom.replace(/@c\.us|@s\.whatsapp\.net|@lid/g, '').split(':')[0];
    
    // Si tenemos el teléfono real resuelto y cleanFrom parece un LID (>= 14 dígitos), usar el teléfono real
    if (extraPhone && cleanFrom.length >= 14) {
      cleanFrom = extraPhone;
    }
    const cleanDigits = normalizePhone(cleanFrom);

    // 1. Obtener la sucursal (por branchId directo o por whatsappNumberId de Meta)
    let branch = null;
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
    const aiConfig = await BranchAIConfig.findOne({ branch: branch._id });

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
    const rawResponse = await generateDynamicResponse(aiConfig, messageText, history, extraContext);

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
    if (gateway === 'whatsapp_web' && typeof replyCallback === 'function') {
      // Envío mediante WhatsApp Web (whatsapp-web.js)
      await replyCallback(cleanResponse);
      console.log(`[WhatsAppWeb] Respuesta enviada a ${cleanFrom}: "${cleanResponse}"`);
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
  }
};

module.exports = { 
  handleIncomingMessage,
  normalizePhone,
  isPhoneMatch
};
