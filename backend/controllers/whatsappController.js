const fs = require('fs');
const path = require('path');
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
 * Asegura que un número móvil colombiano de 10 dígitos tenga el prefijo de país 57 para envío por WhatsApp
 */
const ensureCountryCode = (phone) => {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
};

/**
 * Obtiene el número de WhatsApp del administrador de la sucursal
 */
const getBranchAdminPhone = (branch, aiConfig) => {
  const candidate =
    (aiConfig?.branchAdminPhone && aiConfig.branchAdminPhone.trim()) ||
    (branch?.phone && branch.phone.trim()) ||
    process.env.ADMIN_ALERT_PHONE ||
    DEFAULT_ADMIN_ALERT_PHONE;
  return ensureCountryCode(candidate);
};

/**
 * Envía un mensaje saliente de WhatsApp a cualquier número destino usando la pasarela activa de la sucursal
 */
const sendOutboundWhatsAppMessage = async (branch, targetPhone, text) => {
  const formattedTarget = ensureCountryCode(targetPhone);
  if (!formattedTarget || !text) return false;

  try {
    // 1. Intentar envío por Baileys (motor principal)
    const baileysService = require('../services/baileysService');
    const sentViaBaileys = await baileysService.sendDirectMessage(branch?._id, formattedTarget, text);
    if (sentViaBaileys) return true;

    // 2. Respaldo: intentar envío por WhatsApp Web si estuviera activo
    const whatsappWebService = require('../services/whatsappWebService');
    const sentViaWweb = await whatsappWebService.sendDirectMessage(branch?._id, formattedTarget, text);
    if (sentViaWweb) return true;

    // 3. Respaldo: intentar envío por Meta Cloud API si la sucursal tiene credenciales
    if (branch?.whatsappNumberId && branch?.accessToken) {
      await sendTextMessage(branch.whatsappNumberId, branch.accessToken, formattedTarget, text);
      return true;
    }
  } catch (err) {
    console.error(`[OutboundWhatsApp] Error enviando mensaje a ${formattedTarget}:`, err.message);
  }
  return false;
};

/**
 * Calcula la fecha/hora hasta la cual se pausará el bot tras confirmarse una reserva de hotel (hasta el Check-Out)
 */
const computeHotelCheckOutPauseDate = (checkInRaw, checkOutRaw) => {
  const now = new Date();
  let checkInDate = checkInRaw ? new Date(checkInRaw) : now;
  if (isNaN(checkInDate.getTime())) checkInDate = now;

  if (checkOutRaw) {
    const rawStr = String(checkOutRaw).trim();
    // Si viene solo fecha YYYY-MM-DD, fijar las 14:00 (2:00 PM hora Colombia = 19:00 UTC) del día de Check-Out
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawStr)) {
      const parsedEnd = new Date(`${rawStr}T19:00:00.000Z`);
      if (!isNaN(parsedEnd.getTime()) && parsedEnd > now) {
        return parsedEnd;
      }
    }
    const parsedCustom = new Date(rawStr);
    if (!isNaN(parsedCustom.getTime()) && parsedCustom > now) {
      return parsedCustom;
    }
  }

  // Fallback si la fecha de check-out no es futura: 24 horas después del check-in o del momento actual
  const baseTime = Math.max(checkInDate.getTime(), now.getTime());
  return new Date(baseTime + 24 * 60 * 60 * 1000);
};

/**
 * Detecta si un mensaje entrante es una respuesta del administrador de la sucursal con el #ID de conversación
 */
const parseAdminReplyCommand = (messageText, quotedText = '', isFromBranchAdmin = false) => {
  const text = (messageText || '').trim();
  if (!text) return null;

  // Caso 1: El administrador responde deslizando/citando el mensaje de alerta de WhatsApp que contiene #ID
  if (quotedText) {
    const quotedIdMatch =
      quotedText.match(/ID\s*(?:Conversaci[oó]n|Chat)?\s*:\*?\s*#([A-F0-9]{4,24})/i) ||
      quotedText.match(/#([A-F0-9]{4,24})\b/i);
    if (quotedIdMatch && quotedIdMatch[1]) {
      // Si el texto también empieza con #ID, limpiarlo para no enviarlo duplicado al cliente
      const cleanedAnswer = text.replace(/^(?:id\s*[:#-]?\s*)?#?[a-fA-F0-9]{4,24}[\s:.,-]+/i, '').trim() || text;
      return {
        shortId: quotedIdMatch[1].toUpperCase(),
        answer: cleanedAnswer
      };
    }
  }

  // Caso 2: El administrador reenvía el bloque de alerta completo y escribe la respuesta al final o al inicio
  const forwardedBlockMatch = text.match(/ID\s*(?:Conversaci[oó]n|Chat)?\s*:\*?\s*#([A-F0-9]{4,24})/i);
  if (forwardedBlockMatch && forwardedBlockMatch[1]) {
    const shortId = forwardedBlockMatch[1].toUpperCase();
    // Intentar extraer lo que escribió después de la última línea de instrucción o después del bloque
    const parts = text.split(/#[A-F0-9]{4,24}\s*Tu respuesta aqu[ií]/i);
    if (parts.length > 1 && parts[1].trim()) {
      return { shortId, answer: parts[1].trim() };
    }
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const nonTemplateLines = lines.filter(l =>
      !l.startsWith('❓') &&
      !l.startsWith('🆔') &&
      !l.startsWith('👤') &&
      !l.startsWith('💬') &&
      !l.startsWith('✍️') &&
      !l.startsWith('📲') &&
      !/^#[A-F0-9]{4,24}\s+Tu respuesta aqu/i.test(l)
    );
    if (nonTemplateLines.length > 0) {
      const joined = nonTemplateLines.join('\n').replace(new RegExp(`^#?${shortId}[\\s:.,-]+`, 'i'), '').trim();
      if (joined) {
        return { shortId, answer: joined };
      }
    }
  }

  // Caso 3: Mensaje directo que inicia con #ID <respuesta> (ej: "#A4F2 Sí claro, tenemos disponibilidad...")
  const explicitHashMatch = text.match(/^(?:id\s*[:#-]?\s*)?#([a-fA-F0-9]{4,24})[\s:.,-]+([\s\S]+)$/i);
  if (explicitHashMatch) {
    return {
      shortId: explicitHashMatch[1].toUpperCase(),
      answer: explicitHashMatch[2].trim()
    };
  }

  // Caso 4: Si proviene del número del administrador de la sucursal y escribe el ID sin '#' (ej: "A4F2 Sí claro...")
  if (isFromBranchAdmin) {
    const implicitIdMatch = text.match(/^(?:id\s*[:#-]?\s*)?([a-fA-F0-9]{4})[\s:.,-]+([\s\S]+)$/i);
    if (implicitIdMatch) {
      return {
        shortId: implicitIdMatch[1].toUpperCase(),
        answer: implicitIdMatch[2].trim()
      };
    }
  }

  return null;
};

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
  let from, branchId, phoneNumberId, messageText, messageId, contactName, gateway, replyCallback, sendDocumentCallback, mediaType, hasMedia;
  let extraPhone = '';
  let lid = '';
  let rawSender = '';
  let quotedText = '';

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
    sendDocumentCallback = arg1.sendDocumentCallback;
    hasMedia = Boolean(arg1.hasMedia);
    mediaType = arg1.mediaType || null;
    quotedText = arg1.quotedText || '';
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

    // 2.5. INTERCEPTOR DE RESPUESTAS DEL ADMINISTRADOR DE LA SUCURSAL (#ID <respuesta>)
    const branchAdminPhone = getBranchAdminPhone(branch, aiConfig);
    const isFromBranchAdmin = Boolean(
      branchAdminPhone &&
      (isPhoneMatch(cleanFrom, branchAdminPhone) ||
       (extraPhone && isPhoneMatch(extraPhone, branchAdminPhone)))
    );

    const adminReplyCmd = parseAdminReplyCommand(messageText, quotedText, isFromBranchAdmin);
    if (adminReplyCmd && adminReplyCmd.shortId && adminReplyCmd.answer) {
      const targetCode = adminReplyCmd.shortId.toUpperCase();
      let targetConversation = await Conversation.findOne({
        branch: branch._id,
        shortId: targetCode
      });

      // Respaldo para conversaciones previas que aún no tenían shortId guardado
      if (!targetConversation) {
        const branchConvs = await Conversation.find({ branch: branch._id }).sort({ lastInteraction: -1 });
        targetConversation = branchConvs.find(c =>
          (c.shortId && c.shortId.toUpperCase() === targetCode) ||
          c._id.toString().toUpperCase().endsWith(targetCode)
        );
        if (targetConversation && !targetConversation.shortId) {
          targetConversation.shortId = targetConversation._id.toString().slice(-4).toUpperCase();
        }
      }

      if (targetConversation) {
        const answerToDeliver = adminReplyCmd.answer;

        // Enviar la respuesta tal cual la escribió el administrador al chat del cliente
        const delivered = await sendOutboundWhatsAppMessage(branch, targetConversation.customerNumber, answerToDeliver);

        // Registrar la respuesta en el historial de la conversación del cliente como 'assistant'
        // para que la IA mantenga el contexto completo y continúe la conversación de forma natural
        targetConversation.messages.push({
          role: 'assistant',
          content: answerToDeliver,
          timestamp: new Date()
        });
        targetConversation.lastInteraction = new Date();

        if (Array.isArray(targetConversation.pendingAdminQueries) && targetConversation.pendingAdminQueries.length > 0) {
          const pendingIdx = [...targetConversation.pendingAdminQueries].reverse().findIndex(q => !q.answeredAt);
          if (pendingIdx !== -1) {
            const realIdx = targetConversation.pendingAdminQueries.length - 1 - pendingIdx;
            targetConversation.pendingAdminQueries[realIdx].answeredAt = new Date();
            targetConversation.pendingAdminQueries[realIdx].answer = answerToDeliver;
          }
        }

        await targetConversation.save();

        const confirmText = delivered
          ? `✅ Respuesta enviada al cliente *${targetConversation.customerName || targetConversation.customerNumber}* (Chat #${targetConversation.shortId}). El bot continuará la conversación de forma natural.`
          : `⚠️ Se guardó tu respuesta en el Chat #${targetConversation.shortId}, pero hubo un inconveniente entregándola por WhatsApp a ${targetConversation.customerNumber}.`;

        if ((gateway === 'whatsapp_web' || gateway === 'baileys') && typeof replyCallback === 'function') {
          await replyCallback(confirmText);
        } else {
          await sendOutboundWhatsAppMessage(branch, cleanFrom, confirmText);
        }

        console.log(`[AdminRelay] 💬 Respuesta del administrador entregada al Chat #${targetConversation.shortId} (${targetConversation.customerNumber}): "${answerToDeliver}"`);
        return answerToDeliver;
      }
    }

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
      conversation.shortId = conversation._id.toString().slice(-4).toUpperCase();
    } else {
      if (contactName && !conversation.customerName) {
        conversation.customerName = contactName;
      }
      if (!conversation.shortId && conversation._id) {
        conversation.shortId = conversation._id.toString().slice(-4).toUpperCase();
      }
    }

    // 4.5. VERIFICACIÓN DE PAUSA AUTOMÁTICA DEL BOT ("Hacerse a un lado" tras reserva/pedido o intervención manual)
    if (conversation.botPausedUntil) {
      const now = new Date();
      const pausedUntilDate = new Date(conversation.botPausedUntil);
      if (now < pausedUntilDate) {
        const displayMsg = messageText || `[${mediaType || 'Multimedia'}]`;
        conversation.messages.push({ role: 'user', content: displayMsg });
        conversation.lastInteraction = now;
        await conversation.save();

        const pauseUntilStr = pausedUntilDate.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        console.log(`⏸️ [Bot en Pausa] Mensaje de ${cleanFrom} (Chat #${conversation.shortId}) registrado sin respuesta de IA. Bot pausado (${conversation.pauseReason}) hasta ${pauseUntilStr}.`);

        // Si el administrador de la sucursal tiene un número distinto al WhatsApp conectado de la sucursal,
        // reenviarle el mensaje con el #ID para que pueda atender o responder al cliente si lo desea.
        if (branchAdminPhone && !isPhoneMatch(branchAdminPhone, branch.whatsappPhoneNumber) && !isPhoneMatch(branchAdminPhone, cleanFrom)) {
          const forwardMsg = [
            `📩 *MENSAJE DIRECTO DE CLIENTE (BOT EN PAUSA) - ${branch.name}*`,
            `🆔 *ID Conversación:* #${conversation.shortId}`,
            `👤 *Cliente:* ${conversation.customerName || 'Cliente'} (${cleanFrom})`,
            `💬 *Mensaje:* "${displayMsg}"`,
            `⏱️ *Bot en pausa hasta:* ${pauseUntilStr}`,
            ``,
            `✍️ *Para responderle por medio del bot, responde a este mensaje o escribe:*`,
            `#${conversation.shortId} Tu respuesta aquí`
          ].join('\n');
          await sendOutboundWhatsAppMessage(branch, branchAdminPhone, forwardMsg);
        }

        return null;
      } else {
        // El tiempo de pausa (Check-Out de hotel o 40 min de entrega de pedido) ya se cumplió -> Reactivar bot automáticamente
        console.log(`▶️ [Bot Reactivado] El periodo de pausa (${conversation.pauseReason}) finalizó para ${cleanFrom} (Chat #${conversation.shortId}). Retomando atención con IA.`);
        conversation.botPausedUntil = null;
        conversation.pauseReason = 'none';
      }
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
        const {
          getCalendarBusyRanges,
          formatCalendarAvailabilityForPrompt,
          extractQueriedDatesFromText
        } = require('../services/googleCalendarService');

        const recentText = [
          ...history.slice(-4).map(m => m.content || ''),
          messageText || ''
        ].join(' ');
        const queriedDates = extractQueriedDatesFromText(recentText, new Date());

        let minDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        for (const qYmd of queriedDates) {
          const qDate = new Date(`${qYmd}T12:00:00-05:00`);
          if (!isNaN(qDate.getTime())) {
            const qMin = new Date(qDate.getTime() - 15 * 24 * 60 * 60 * 1000);
            const qMax = new Date(qDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (qMin < minDate) minDate = qMin;
            if (qMax > maxDate) maxDate = qMax;
          }
        }

        const busyEvents = await getCalendarBusyRanges(aiConfig, minDate, maxDate);
        extraContext.calendarAvailability = formatCalendarAvailabilityForPrompt(busyEvents, {
          userMessage: messageText,
          history,
          aiConfig
        });
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

    // 7. Extraer JSON de pedido, reservación, consulta al administrador o envío de documentos si existe
    let cleanResponse = rawResponse;
    let orderData = null;
    let reservationData = null;
    let adminQueryData = null;
    let requestedDocuments = [];

    if (cleanResponse.includes('<ORDER_JSON>')) {
      const match = cleanResponse.match(/<ORDER_JSON>([\s\S]*?)<\/ORDER_JSON>/);
      if (match && match[1]) {
        try {
          orderData = JSON.parse(match[1].trim());
          cleanResponse = cleanResponse.replace(/<ORDER_JSON>[\s\S]*?<\/ORDER_JSON>/g, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de pedido:', e);
        }
      }
    }

    if (cleanResponse.includes('<RESERVATION_JSON>')) {
      const match = cleanResponse.match(/<RESERVATION_JSON>([\s\S]*?)<\/RESERVATION_JSON>/);
      if (match && match[1]) {
        try {
          reservationData = JSON.parse(match[1].trim());
          cleanResponse = cleanResponse.replace(/<RESERVATION_JSON>[\s\S]*?<\/RESERVATION_JSON>/g, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de reservación:', e);
        }
      }
    }

    if (cleanResponse.includes('<ADMIN_QUERY_JSON>')) {
      const match = cleanResponse.match(/<ADMIN_QUERY_JSON>([\s\S]*?)<\/ADMIN_QUERY_JSON>/);
      if (match && match[1]) {
        try {
          adminQueryData = JSON.parse(match[1].trim());
          cleanResponse = cleanResponse.replace(/<ADMIN_QUERY_JSON>[\s\S]*?<\/ADMIN_QUERY_JSON>/g, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de consulta al administrador:', e);
        }
      }
    }

    if (cleanResponse.includes('<SEND_DOCUMENT_JSON>')) {
      const match = cleanResponse.match(/<SEND_DOCUMENT_JSON>([\s\S]*?)<\/SEND_DOCUMENT_JSON>/);
      if (match && match[1]) {
        try {
          const docJson = JSON.parse(match[1].trim());
          if (Array.isArray(docJson.files)) {
            requestedDocuments.push(...docJson.files);
          } else if (docJson.file || docJson.name) {
            requestedDocuments.push(docJson.file || docJson.name);
          }
          cleanResponse = cleanResponse.replace(/<SEND_DOCUMENT_JSON>[\s\S]*?<\/SEND_DOCUMENT_JSON>/g, '').trim();
        } catch (e) {
          console.error('Error parseando JSON de envío de documento:', e);
        }
      }
    }

    // También soportar sintaxis directa [ENVIAR_DOC: NombreArchivo] si la IA la incluyó en el texto
    const inlineDocMatches = [...cleanResponse.matchAll(/\[ENVIAR_DOC:\s*([^\]]+)\]/gi)];
    if (inlineDocMatches.length > 0) {
      for (const m of inlineDocMatches) {
        if (m[1]) requestedDocuments.push(m[1].trim());
      }
      cleanResponse = cleanResponse.replace(/\[ENVIAR_DOC:\s*[^\]]+\]/gi, '').trim();
    }

    // Si hay consulta para el administrador, registrarla en la conversación
    if (adminQueryData && adminQueryData.detected) {
      const questionToAsk = (adminQueryData.question || messageText).trim();
      conversation.pendingAdminQueries.push({
        question: questionToAsk,
        askedAt: new Date()
      });
    }

    // 8. Guardar mensajes en la base de datos
    conversation.messages.push({ role: 'user', content: messageText });
    conversation.messages.push({ role: 'assistant', content: cleanResponse });
    conversation.lastInteraction = Date.now();
    await conversation.save();

    // 8.5. Si la IA no tenía la respuesta, enviar la pregunta con el #ID al WhatsApp del administrador de la sucursal
    if (adminQueryData && adminQueryData.detected && branchAdminPhone) {
      const questionToAsk = (adminQueryData.question || messageText).trim();
      const adminQueryAlert = [
        `❓ *CONSULTA DE CLIENTE - ${branch.name}*`,
        `🆔 *ID Conversación:* #${conversation.shortId}`,
        `👤 *Cliente:* ${conversation.customerName || contactName || 'Cliente'} (${cleanFrom})`,
        `💬 *Pregunta:* "${questionToAsk}"`,
        ``,
        `📲 *Para responderle al cliente a través del bot, responde a este mensaje o envía el ID seguido de tu respuesta:*`,
        `#${conversation.shortId} Tu respuesta aquí`
      ].join('\n');

      await sendOutboundWhatsAppMessage(branch, branchAdminPhone, adminQueryAlert);
      console.log(`[AdminQuery] ❓ Pregunta escalada al administrador (${branchAdminPhone}) con ID #${conversation.shortId}: "${questionToAsk}"`);
    }

    // 9. Si hay un pedido o reservación detectada, guardarla y pausar el bot según el tipo de negocio
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

      // Pausar respuestas automáticas del bot por 40 minutos (o el tiempo configurado) mientras se entrega el pedido
      const pauseMinutes = (aiConfig && typeof aiConfig.postOrderPauseMinutes === 'number' && aiConfig.postOrderPauseMinutes > 0)
        ? aiConfig.postOrderPauseMinutes
        : 40;
      const pauseUntilDate = new Date(Date.now() + pauseMinutes * 60 * 1000);
      conversation.botPausedUntil = pauseUntilDate;
      conversation.pauseReason = 'order_active';
      await conversation.save();

      const pauseUntilStr = pauseUntilDate.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
      console.log(`⏸️ [Pedido Confirmado] Bot en pausa por ${pauseMinutes} min para ${cleanFrom} (Chat #${conversation.shortId}) hasta las ${pauseUntilStr}.`);

      if (branchAdminPhone) {
        const itemsText = Array.isArray(orderData.items)
          ? orderData.items.map(i => `  • ${i.quantity || 1}x ${i.name} ($${i.price || 0})`).join('\n')
          : '  • Ver en panel';
        const orderAlert = [
          `🛍️ *NUEVO PEDIDO CONFIRMADO - ${branch.name}*`,
          `🆔 *ID Conversación:* #${conversation.shortId}`,
          `👤 *Cliente:* ${conversation.customerName || contactName || 'Cliente'} (${cleanFrom})`,
          `📦 *Detalle:*`,
          itemsText,
          `💵 *Total:* $${orderData.total || 0}`,
          orderData.deliveryAddress ? `📍 *Dirección:* ${orderData.deliveryAddress}` : '',
          ``,
          `⏸️ *El bot se ha hecho a un lado por ${pauseMinutes} minutos (hasta las ${pauseUntilStr})* mientras se entrega el pedido. Pasado este tiempo, el bot volverá a responder automáticamente.`
        ].filter(Boolean).join('\n');

        await sendOutboundWhatsAppMessage(branch, branchAdminPhone, orderAlert);
      }
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
        customerOrigin: reservationData.customerOrigin || '',
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

      // Pausar las respuestas del bot en este chat hasta que venza la estadía / Check-Out
      const checkOutPauseDate = computeHotelCheckOutPauseDate(reservationData.checkIn, reservationData.checkOut);
      conversation.botPausedUntil = checkOutPauseDate;
      conversation.pauseReason = 'reservation_active';
      await conversation.save();

      const checkOutPauseStr = checkOutPauseDate.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      console.log(`⏸️ [Reserva Hotel Confirmada] Bot en pausa para ${cleanFrom} (Chat #${conversation.shortId}) hasta el Check-Out (${checkOutPauseStr}).`);

      if (branchAdminPhone) {
        const reservationAlert = [
          `🏨 *NUEVA RESERVACIÓN CONFIRMADA - ${branch.name}*`,
          `🆔 *ID Conversación:* #${conversation.shortId}`,
          `👤 *Huésped:* ${reservationData.customerName || conversation.customerName || contactName || 'Cliente'} (${cleanFrom})`,
          reservationData.customerOrigin ? `📍 *Procedencia:* ${reservationData.customerOrigin}` : '',
          `🛏️ *Suite / Alojamiento:* ${reservationData.roomType || 'Por definir'}`,
          `👥 *Huéspedes:* ${reservationData.guestsCount || 1}`,
          `📅 *Check-In:* ${reservationData.checkIn || 'Por definir'}`,
          `📅 *Check-Out:* ${reservationData.checkOut || 'Por definir'}`,
          `💵 *Total:* $${reservationData.total || 0}`,
          reservationData.notes ? `📝 *Notas:* ${reservationData.notes}` : '',
          googleEvent ? `📆 *Google Calendar:* Agendado automáticamente ✅` : '',
          ``,
          `⏸️ *El bot se ha hecho a un lado en este chat hasta finalizar el Check-Out (${checkOutPauseStr})* para que cualquier solicitud del huésped sea atendida por ti. Finalizado el Check-Out, el bot se reactivará automáticamente.`
        ].filter(Boolean).join('\n');

        await sendOutboundWhatsAppMessage(branch, branchAdminPhone, reservationAlert);
      }
    }

    // 10. Enviar la respuesta al cliente por el canal correspondiente
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

    // 11. Si la IA determinó que debe adjuntar uno o más documentos de la Base de Conocimiento (ej. Políticas de Mascotas, Menú PDF)
    if (requestedDocuments.length > 0 && Array.isArray(aiConfig?.knowledgeSources) && aiConfig.knowledgeSources.length > 0) {
      const uniqueDocs = [...new Set(requestedDocuments.map(d => String(d).trim()).filter(Boolean))];
      for (const reqDocName of uniqueDocs) {
        const normTarget = normalizeText(reqDocName);
        const matchedSource = aiConfig.knowledgeSources.find(src => {
          if (src.type !== 'file') return false;
          const normName = normalizeText(src.name);
          const normAlias = normalizeText(src.alias);
          return (
            normName === normTarget ||
            normAlias === normTarget ||
            normName.includes(normTarget) ||
            normTarget.includes(normName) ||
            (normAlias && (normAlias.includes(normTarget) || normTarget.includes(normAlias)))
          );
        });

        if (matchedSource) {
          let fileBuffer = null;
          if (matchedSource.filePath && fs.existsSync(matchedSource.filePath)) {
            fileBuffer = fs.readFileSync(matchedSource.filePath);
          } else if (matchedSource.fileDataBase64) {
            fileBuffer = Buffer.from(matchedSource.fileDataBase64, 'base64');
            // Reconstruir en disco si no existía
            if (matchedSource.filePath) {
              try {
                fs.mkdirSync(path.dirname(matchedSource.filePath), { recursive: true });
                fs.writeFileSync(matchedSource.filePath, fileBuffer);
              } catch (e) {}
            }
          }

          if (fileBuffer) {
            try {
              if (typeof sendDocumentCallback === 'function') {
                await sendDocumentCallback({
                  fileBuffer,
                  fileName: matchedSource.name,
                  mimeType: matchedSource.mimeType || 'application/pdf',
                  caption: matchedSource.alias || matchedSource.name
                });
              } else {
                const baileysService = require('../services/baileysService');
                await baileysService.sendDirectDocument(branch._id, cleanFrom, {
                  fileBuffer,
                  fileName: matchedSource.name,
                  mimeType: matchedSource.mimeType || 'application/pdf',
                  caption: matchedSource.alias || matchedSource.name
                });
              }
              console.log(`📎 [Documento RAG Enviado] "${matchedSource.name}" enviado exitosamente al cliente ${cleanFrom}.`);
            } catch (docErr) {
              console.error(`[Documento RAG] Error enviando archivo "${matchedSource.name}" a ${cleanFrom}:`, docErr.message);
            }
          }
        }
      }
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
  isPhoneMatch,
  sendOutboundWhatsAppMessage,
  parseAdminReplyCommand,
  computeHotelCheckOutPauseDate
};
