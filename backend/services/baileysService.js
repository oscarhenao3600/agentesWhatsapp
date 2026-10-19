const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const Branch = require('../models/Branch');
const BranchAIConfig = require('../models/BranchAIConfig');

// Carpeta local para almacenar sesiones de Baileys (dentro de .wwebjs_auth para aprovechar el volumen Docker existente)
const baileysAuthRoot = path.join(__dirname, '../.wwebjs_auth/baileys');
if (!fs.existsSync(baileysAuthRoot)) {
  fs.mkdirSync(baileysAuthRoot, { recursive: true });
}

// Mapa en memoria para sesiones activas de Baileys
// Clave: branchId (string) -> Valor: { sock, status, qrImage, connectedPhone, lastError, manualDisconnect, reconnectTimer }
const sessions = new Map();

// Set para evitar que los mensajes enviados por el propio bot en su chat personal disparen un bucle infinito
const sentByBotIds = new Set();

// Deduplicación de mensajes entrantes procesados recientemente
const processedMsgIds = new Set();

/**
 * Carga dinámica compatible tanto con CommonJS como con ESM de @whiskeysockets/baileys
 */
let baileysModuleCache = null;
const loadBaileys = async () => {
  if (baileysModuleCache) return baileysModuleCache;
  try {
    baileysModuleCache = require('@whiskeysockets/baileys');
  } catch (err) {
    baileysModuleCache = await import('@whiskeysockets/baileys');
  }
  return baileysModuleCache;
};

/**
 * Limpia el JID para obtener únicamente los dígitos o identificador base
 */
const cleanJidUser = (jid) => {
  if (!jid) return '';
  return String(jid)
    .replace(/@s\.whatsapp\.net|@c\.us|@lid|@g\.us/g, '')
    .split(':')[0]
    .trim();
};

/**
 * Extrae el contenido real del mensaje desencapsulando contenedores efímeros o viewOnce
 */
const unwrapMessage = (message) => {
  if (!message) return null;
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension?.message) return unwrapMessage(message.viewOnceMessageV2Extension.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.editedMessage?.message) return unwrapMessage(message.editedMessage.message);
  return message;
};

/**
 * Obtiene el estado actual de la sesión Baileys de una sucursal.
 * @param {string} branchId
 * @returns {Object} { status, qrImage, connectedPhone, gatewayType }
 */
const getSessionStatus = (branchId) => {
  const session = sessions.get(branchId.toString());
  if (!session) {
    return { status: 'disconnected', qrImage: null, connectedPhone: '', gatewayType: 'baileys' };
  }
  return {
    status: session.status,
    qrImage: session.qrImage,
    connectedPhone: session.connectedPhone || '',
    gatewayType: 'baileys'
  };
};

/**
 * Verifica si existe una sesión activa o inicializando en Baileys para una sucursal
 */
const hasActiveSession = (branchId) => {
  const session = sessions.get(branchId.toString());
  return Boolean(session && session.status !== 'disconnected');
};

const MAX_QR_ATTEMPTS = 3; // 1 QR inicial + 2 adicionales (1 minuto cada uno)
const QR_TIMEOUT_MS = 60000; // 1 minuto por código QR

/**
 * Inicializa la sesión de WhatsApp mediante Baileys (WebSockets ligeros, sin Chromium)
 * @param {string} branchId
 * @param {number} initialQrCount
 * @returns {Promise<Object>} Estado inicial de la sesión
 */
const initSession = async (branchId, initialQrCount = 0) => {
  const idStr = branchId.toString();
  let session = sessions.get(idStr);

  if (session && session.status === 'connected') {
    return { status: 'connected', qrImage: null, connectedPhone: session.connectedPhone, gatewayType: 'baileys' };
  }

  if (session && session.status === 'qr_ready' && session.qrImage && initialQrCount === 0) {
    return { status: 'qr_ready', qrImage: session.qrImage, connectedPhone: '', gatewayType: 'baileys' };
  }

  // Si existía un socket previo, cerrarlo limpiamente antes de crear uno nuevo
  if (session) {
    session.manualDisconnect = true;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session.qrExpireTimer) clearTimeout(session.qrExpireTimer);
    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners();
        session.sock.end(undefined);
      } catch (e) {}
    }
  }

  console.log(`[Baileys] Inicializando sesión ligera (sin Chromium) para sucursal: ${idStr}`);

  session = {
    sock: null,
    status: 'initializing',
    qrImage: null,
    connectedPhone: '',
    lastError: null,
    manualDisconnect: false,
    reconnectTimer: null,
    qrExpireTimer: null,
    qrCount: initialQrCount
  };
  sessions.set(idStr, session);

  const closeExpiredQrSession = () => {
    console.warn(`[Baileys] ⏱️ Límite de ${MAX_QR_ATTEMPTS} códigos QR alcanzado sin escaneo en sucursal ${idStr}. Cerrando socket para liberar RAM.`);
    session.manualDisconnect = true;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session.qrExpireTimer) clearTimeout(session.qrExpireTimer);
    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners();
        session.sock.end(undefined);
      } catch (e) {}
      session.sock = null;
    }
    session.status = 'error';
    session.qrImage = null;
    session.lastError = 'Tiempo de escaneo QR agotado (3 intentos).';
    setTimeout(() => {
      const current = sessions.get(idStr);
      if (current === session && current.status === 'error') {
        sessions.delete(idStr);
      }
    }, 15000);
  };

  const sessionDir = path.join(baileysAuthRoot, `session-branch_${idStr}`);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  try {
    const baileys = await loadBaileys();
    const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
    const {
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      Browsers
    } = baileys;

    const silentLogger = pino({ level: 'silent' });
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // Obtener versión de protocolo de WhatsApp Web con fallback seguro
    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest?.version) {
        version = latest.version;
      }
    } catch (vErr) {
      console.warn(`[Baileys] Usando versión de protocolo local por defecto (${version.join('.')})`);
    }

    const sock = makeWASocket({
      version,
      logger: silentLogger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: typeof makeCacheableSignalKeyStore === 'function'
          ? makeCacheableSignalKeyStore(state.keys, silentLogger)
          : state.keys
      },
      browser: Browsers?.ubuntu ? Browsers.ubuntu('Chrome') : ['AgentesWhatsApp', 'Chrome', '120.0.0'],
      syncFullHistory: false, // Crítico para ahorrar RAM y CPU en Raspberry Pi
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      qrTimeout: QR_TIMEOUT_MS, // 1 minuto por cada código QR
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      getMessage: async () => undefined
    });

    session.sock = sock;

    // Guardar credenciales actualizadas automáticamente
    sock.ev.on('creds.update', saveCreds);

    // Monitorear cambios de estado de la conexión y generación de QR
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        if (session.qrExpireTimer) clearTimeout(session.qrExpireTimer);

        if (session.qrCount >= MAX_QR_ATTEMPTS) {
          closeExpiredQrSession();
          return;
        }

        session.qrCount += 1;
        console.log(`[Baileys] Código QR generado (${session.qrCount}/${MAX_QR_ATTEMPTS}) para la sucursal: ${idStr}`);
        try {
          const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
          session.status = 'qr_ready';
          session.qrImage = qrDataUrl;

          // Si es el 3er código QR (1 inicial + 2 adicionales), programar cierre automático tras 1 minuto
          if (session.qrCount >= MAX_QR_ATTEMPTS) {
            session.qrExpireTimer = setTimeout(() => {
              if (session.status !== 'connected') {
                closeExpiredQrSession();
              }
            }, QR_TIMEOUT_MS);
          }
        } catch (qrErr) {
          console.error('[Baileys] Error convirtiendo QR a DataURL:', qrErr.message);
          session.status = 'error';
          session.lastError = 'No se pudo renderizar el QR';
        }
      }

      if (connection === 'open') {
        if (session.qrExpireTimer) {
          clearTimeout(session.qrExpireTimer);
          session.qrExpireTimer = null;
        }
        session.qrCount = 0;

        const phone = cleanJidUser(sock.user?.id);
        console.log(`[Baileys] ✅ Cliente listo y conectado para sucursal ${idStr}. Teléfono: ${phone}`);
        session.status = 'connected';
        session.qrImage = null;
        session.connectedPhone = phone;
        session.lastError = null;

        try {
          await Branch.findByIdAndUpdate(branchId, {
            whatsappConnected: true,
            whatsappPhoneNumber: phone,
            gatewayType: 'baileys'
          });
          await BranchAIConfig.findOneAndUpdate(
            { branch: branchId },
            { gatewayType: 'baileys' }
          );
        } catch (dbErr) {
          console.error('[Baileys] Error actualizando estado de sucursal en BD:', dbErr.message);
        }
      }

      if (connection === 'close') {
        if (session.qrExpireTimer) {
          clearTimeout(session.qrExpireTimer);
          session.qrExpireTimer = null;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reasonMsg = lastDisconnect?.error?.message || `código ${statusCode}`;
        const isLoggedOut = statusCode === DisconnectReason?.loggedOut || statusCode === 401 || statusCode === 403;
        const isQrTimeout = statusCode === DisconnectReason?.timedOut || statusCode === 408 || reasonMsg.toLowerCase().includes('qr refs attempts ended');

        console.log(`[Baileys] Conexión cerrada en sucursal ${idStr} (${reasonMsg}). LoggedOut=${isLoggedOut}, Manual=${session.manualDisconnect}`);

        if (session.manualDisconnect) {
          return;
        }

        if (isLoggedOut) {
          // Sesión cerrada desde el teléfono: limpiar archivos de autenticación
          session.status = 'disconnected';
          session.qrImage = null;
          session.connectedPhone = '';
          sessions.delete(idStr);

          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (rmErr) {
            console.warn(`[Baileys] Error limpiando carpeta de sesión ${idStr}:`, rmErr.message);
          }

          try {
            await Branch.findByIdAndUpdate(branchId, {
              whatsappConnected: false,
              whatsappPhoneNumber: ''
            });
          } catch (dbErr) {
            console.error('[Baileys] Error actualizando desconexión en BD:', dbErr.message);
          }
        } else if (session.qrCount > 0 && session.status !== 'connected' && statusCode !== DisconnectReason?.restartRequired && statusCode !== 515) {
          // Estaba esperando escaneo de QR y aún no se ha vinculado
          if (session.qrCount >= MAX_QR_ATTEMPTS || isQrTimeout) {
            closeExpiredQrSession();
          } else {
            const carriedQrCount = session.qrCount;
            session.reconnectTimer = setTimeout(() => {
              if (!session.manualDisconnect) {
                sessions.delete(idStr);
                initSession(branchId, carriedQrCount).catch(err =>
                  console.error(`[Baileys] Error reintentando QR de ${idStr}:`, err.message)
                );
              }
            }, 2000);
          }
        } else {
          // Reconexión automática de sesión ya autenticada (ej. código 515 tras escanear QR o microcorte de red)
          session.status = 'initializing';
          session.reconnectTimer = setTimeout(() => {
            if (!session.manualDisconnect) {
              sessions.delete(idStr);
              initSession(branchId, 0).catch(err =>
                console.error(`[Baileys] Error en reconexión automática de ${idStr}:`, err.message)
              );
            }
          }, 2500);
        }
      }
    });

    // Recepción de mensajes en tiempo real
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages) {
        try {
          if (!msg || !msg.key) continue;

          const msgId = msg.key.id;
          if (!msgId) continue;

          // Si fue enviado por el propio bot como respuesta automática, ignorar para evitar bucle infinito
          if (sentByBotIds.has(msgId)) continue;

          // Deduplicación por ID de mensaje
          if (processedMsgIds.has(msgId)) continue;

          // En eventos 'append', solo procesar si es un mensaje recién recibido (últimos 30 segundos)
          if (type === 'append') {
            const msgTimestamp = Number(msg.messageTimestamp || 0);
            const nowSec = Math.floor(Date.now() / 1000);
            if (!msgTimestamp || (nowSec - msgTimestamp) > 30) continue;
          }

          const remoteJid = msg.key.remoteJid || '';
          if (!remoteJid) continue;

          // Ignorar estados, canales y grupos
          if (
            remoteJid === 'status@broadcast' ||
            remoteJid.endsWith('@broadcast') ||
            remoteJid.endsWith('@g.us') ||
            remoteJid.endsWith('@newsletter')
          ) {
            continue;
          }

          // Desencapsular el contenido del mensaje
          const content = unwrapMessage(msg.message);
          if (!content) continue;

          // Ignorar mensajes internos de protocolo, reacciones o recibos de sincronización
          if (
            content.protocolMessage ||
            content.reactionMessage ||
            content.senderKeyDistributionMessage ||
            content.keepInChatMessage ||
            content.pinInChatMessage
          ) {
            continue;
          }

          // Si el mensaje es propio (fromMe), solo permitirlo si el usuario se está escribiendo a sí mismo (self-chat para pruebas)
          if (msg.key.fromMe) {
            const myPhone = cleanJidUser(sock.user?.id);
            const myLid = cleanJidUser(sock.user?.lid);
            const targetUser = cleanJidUser(remoteJid);
            const isSelfChat =
              (myPhone && targetUser === myPhone) ||
              (myLid && targetUser === myLid);

            if (!isSelfChat) {
              continue;
            }
          }

          // Registrar mensaje como procesado (TTL 30s)
          processedMsgIds.add(msgId);
          setTimeout(() => processedMsgIds.delete(msgId), 30000);

          // Determinar tipo de contenido (texto vs multimedia)
          let messageText = '';
          let mediaType = null;

          if (typeof content.conversation === 'string') {
            messageText = content.conversation;
          } else if (content.extendedTextMessage?.text) {
            messageText = content.extendedTextMessage.text;
          } else if (content.imageMessage) {
            mediaType = 'image';
            messageText = content.imageMessage.caption || '';
          } else if (content.audioMessage) {
            mediaType = content.audioMessage.ptt ? 'ptt' : 'audio';
          } else if (content.videoMessage) {
            mediaType = 'video';
            messageText = content.videoMessage.caption || '';
          } else if (content.documentMessage) {
            mediaType = 'document';
            messageText = content.documentMessage.caption || '';
          } else if (content.stickerMessage) {
            mediaType = 'sticker';
          } else if (
            content.contactMessage ||
            content.contactsArrayMessage ||
            content.locationMessage ||
            content.liveLocationMessage
          ) {
            mediaType = 'media';
          } else {
            continue;
          }

          const hasMedia = Boolean(mediaType);
          if (!hasMedia && (!messageText || !messageText.trim())) continue;

          // Resolver número de teléfono real y LID
          const isLidJid = remoteJid.endsWith('@lid');
          const rawLid = isLidJid ? cleanJidUser(remoteJid) : cleanJidUser(msg.key.senderLid || '');

          // En Baileys v6.7+, remoteJidAlt o senderPn puede traer el número telefónico real cuando remoteJid es un @lid
          const altJid = msg.key.remoteJidAlt || msg.key.senderPn || msg.key.participantAlt || '';
          let realPhoneNumber = '';
          if (altJid && !altJid.endsWith('@lid')) {
            realPhoneNumber = cleanJidUser(altJid);
          } else if (!isLidJid) {
            realPhoneNumber = cleanJidUser(remoteJid);
          }

          let cleanFrom = realPhoneNumber || cleanJidUser(remoteJid);
          if (msg.key.fromMe && sock.user?.id) {
            cleanFrom = cleanJidUser(sock.user.id);
          }

          const contactName = msg.pushName || msg.verifiedBizName || '';

          console.log(`[Baileys] Procesando mensaje de ${cleanFrom} (LID: ${rawLid || 'N/A'}, Nombre: ${contactName || 'N/A'}, Tipo: ${mediaType || 'chat'}): "${messageText}"`);

          const { handleIncomingMessage } = require('../controllers/whatsappController');
          await handleIncomingMessage({
            from: cleanFrom,
            resolvedPhone: realPhoneNumber,
            lid: rawLid,
            rawSender: remoteJid,
            branchId: idStr,
            messageText: messageText,
            messageId: msgId,
            contactName: contactName,
            gateway: 'baileys',
            hasMedia: hasMedia,
            mediaType: mediaType,
            replyCallback: async (replyText) => {
              console.log(`[Baileys] Enviando respuesta a ${remoteJid}...`);
              const sentMsg = await sock.sendMessage(
                remoteJid,
                { text: replyText },
                { quoted: msg }
              );
              if (sentMsg?.key?.id) {
                sentByBotIds.add(sentMsg.key.id);
                setTimeout(() => sentByBotIds.delete(sentMsg.key.id), 60000);
              }
            }
          });
        } catch (msgErr) {
          console.error('[Baileys] Error procesando mensaje entrante:', msgErr);
        }
      }
    });

    return { status: 'initializing', qrImage: null, connectedPhone: '', gatewayType: 'baileys' };
  } catch (err) {
    console.error(`[Baileys] Error inicializando sesión para sucursal ${idStr}:`, err);
    session.status = 'error';
    session.lastError = err.message;
    return { status: 'error', qrImage: null, connectedPhone: '', gatewayType: 'baileys', error: err.message };
  }
};

/**
 * Desconecta y elimina la sesión de Baileys de una sucursal.
 * @param {string} branchId
 */
const disconnectSession = async (branchId, updateDb = true) => {
  const idStr = branchId.toString();
  const session = sessions.get(idStr);

  if (session) {
    session.manualDisconnect = true;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session.qrExpireTimer) clearTimeout(session.qrExpireTimer);
    if (session.sock) {
      try {
        await session.sock.logout().catch(() => {});
      } catch (e) {}
      try {
        session.sock.ev.removeAllListeners();
        session.sock.end(undefined);
      } catch (e) {}
    }
  }

  sessions.delete(idStr);

  // Eliminar credenciales guardadas en disco para forzar nuevo QR al reconectar
  const sessionDir = path.join(baileysAuthRoot, `session-branch_${idStr}`);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn(`[Baileys] No se pudo limpiar directorio de sesión ${idStr}:`, e.message);
  }

  if (updateDb) {
    try {
      await Branch.findByIdAndUpdate(branchId, {
        whatsappConnected: false,
        whatsappPhoneNumber: ''
      });
    } catch (dbErr) {
      console.error('[Baileys] Error actualizando desconexión en BD:', dbErr.message);
    }
  }

  return { success: true, message: 'Sesión de WhatsApp (Baileys) desconectada' };
};

/**
 * Auto-restaura las sesiones de sucursales que usan Baileys al iniciar el servidor.
 * Migra automáticamente cualquier sucursal 'whatsapp_web' a 'baileys' para evitar el uso de Chromium.
 */
const autoReconnectBaileysBranches = async () => {
  try {
    // Migrar sucursales que hayan quedado con 'whatsapp_web' a 'baileys'
    await Branch.updateMany(
      { gatewayType: 'whatsapp_web' },
      { $set: { gatewayType: 'baileys' } }
    );
    await BranchAIConfig.updateMany(
      { gatewayType: 'whatsapp_web' },
      { $set: { gatewayType: 'baileys' } }
    );

    const branches = await Branch.find({
      whatsappConnected: true,
      gatewayType: 'baileys'
    });
    for (const br of branches) {
      const credsFile = path.join(baileysAuthRoot, `session-branch_${br._id}`, 'creds.json');
      if (!fs.existsSync(credsFile)) {
        console.log(`[Baileys] Sucursal ${br._id} (${br.name}) sin credenciales guardadas en disco. Marcando desconectada para evitar QR en segundo plano.`);
        await Branch.findByIdAndUpdate(br._id, { whatsappConnected: false });
        continue;
      }
      console.log(`[Baileys] Auto-restaurando sesión para la sucursal: ${br._id} (${br.name})`);
      initSession(br._id).catch(e =>
        console.warn(`[Baileys] Error auto-reconectando ${br._id}:`, e.message)
      );
    }
  } catch (err) {
    console.error('[Baileys] Error en auto-reconexión de sucursales:', err.message);
  }
};

/**
 * Envía un mensaje directo de WhatsApp a un número específico usando la sesión activa de la sucursal
 * (o cualquier otra sesión activa de Baileys como respaldo).
 * Registra el ID del mensaje en sentByBotIds para evitar bucles infinitos.
 * @param {string} branchId
 * @param {string} targetPhone - Número destino con código de país (ej. "573113414361")
 * @param {string} text - Contenido del mensaje
 * @returns {Promise<boolean>} true si se envió correctamente
 */
const sendDirectMessage = async (branchId, targetPhone, text) => {
  const cleanPhone = String(targetPhone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone || !text) return false;

  let session = branchId ? sessions.get(branchId.toString()) : null;
  if (!session || session.status !== 'connected' || !session.sock) {
    // Respaldo: buscar cualquier sesión activa de Baileys para garantizar que la alerta llegue al admin
    for (const s of sessions.values()) {
      if (s.status === 'connected' && s.sock) {
        session = s;
        break;
      }
    }
  }

  if (!session || session.status !== 'connected' || !session.sock) {
    console.warn(`[Baileys] No hay sesión activa conectada para enviar alerta al admin (${cleanPhone}).`);
    return false;
  }

  let targetJid = `${cleanPhone}@s.whatsapp.net`;
  try {
    if (typeof session.sock.onWhatsApp === 'function') {
      const [result] = await session.sock.onWhatsApp(cleanPhone);
      if (result && result.exists && result.jid) {
        targetJid = result.jid;
      }
    }
  } catch (e) {
    // Continuar con el JID estándar si falla la consulta onWhatsApp
  }

  const sentMsg = await session.sock.sendMessage(targetJid, { text });
  if (sentMsg?.key?.id) {
    sentByBotIds.add(sentMsg.key.id);
    setTimeout(() => sentByBotIds.delete(sentMsg.key.id), 60000);
  }
  console.log(`[Baileys] 🚨 Alerta técnica enviada al administrador (${targetJid}).`);
  return true;
};

module.exports = {
  initSession,
  getSessionStatus,
  hasActiveSession,
  disconnectSession,
  autoReconnectBaileysBranches,
  sendDirectMessage
};

