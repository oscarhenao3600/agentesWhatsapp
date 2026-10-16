const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const Branch = require('../models/Branch');

// Carpeta local para almacenar sesiones autenticadas por sucursal
const authDataPath = path.join(__dirname, '../.wwebjs_auth');
if (!fs.existsSync(authDataPath)) {
  fs.mkdirSync(authDataPath, { recursive: true });
}

// Mapa en memoria para almacenar las sesiones activas
// Clave: branchId (string) -> Valor: { client, status, qrImage, connectedPhone, lastError }
const sessions = new Map();

/**
 * Obtiene el estado actual de la sesión de una sucursal.
 * @param {string} branchId 
 * @returns {Object} { status, qrImage, connectedPhone }
 */
const getSessionStatus = (branchId) => {
  const session = sessions.get(branchId.toString());
  if (!session) {
    return { status: 'disconnected', qrImage: null, connectedPhone: '' };
  }
  return {
    status: session.status,
    qrImage: session.qrImage,
    connectedPhone: session.connectedPhone || ''
  };
};

/**
 * Inicializa la sesión de WhatsApp Web para una sucursal y genera el QR.
 * @param {string} branchId 
 * @returns {Promise<Object>} Estado de la sesión
 */
const initSession = async (branchId) => {
  const idStr = branchId.toString();
  let session = sessions.get(idStr);

  // Si ya está conectada, devolver el estado
  if (session && session.status === 'connected') {
    return { status: 'connected', qrImage: null, connectedPhone: session.connectedPhone };
  }

  // Si ya está generando QR o esperando escaneo, devolver el estado actual
  if (session && session.status === 'qr_ready') {
    return { status: 'qr_ready', qrImage: session.qrImage, connectedPhone: '' };
  }

  // Si había una sesión anterior no conectada, destruirla antes de iniciar una nueva
  if (session && session.client) {
    try {
      await session.client.destroy();
    } catch (e) {
      console.warn(`[WhatsAppWeb] Error destruyendo cliente previo de ${idStr}:`, e.message);
    }
  }

  // Limpiar bloqueos residuales de Chromium (SingletonLock, etc.) que impiden iniciar en caso de reinicio forzado del contenedor
  // Nota: Chromium crea SingletonLock como enlace simbólico (symlink). En Node.js fs.existsSync() devuelve false
  // para symlinks rotos, por lo que se debe intentar unlink directamente.
  const sessionDir = path.join(authDataPath, `session-branch_${idStr}`);
  ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach(lockFile => {
    const fullPath = path.join(sessionDir, lockFile);
    try {
      fs.unlinkSync(fullPath);
      console.log(`[WhatsAppWeb] Bloqueo residual de Chromium eliminado: ${lockFile}`);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.warn(`[WhatsAppWeb] No se pudo eliminar ${lockFile}:`, e.message);
      }
    }
  });


  console.log(`[WhatsAppWeb] Inicializando sesión para la sucursal: ${idStr}`);

  session = {
    client: null,
    status: 'initializing',
    qrImage: null,
    connectedPhone: '',
    lastError: null
  };
  sessions.set(idStr, session);


  const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--mute-audio'
  ];

  const puppeteerConfig = {
    headless: true,
    args: puppeteerArgs
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `branch_${idStr}`,
      dataPath: authDataPath
    }),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 3000,
    puppeteer: puppeteerConfig
  });

  session.client = client;

  // 0. Eventos de progreso de sincronización y estado de conexión
  client.on('loading_screen', (percent, message) => {
    console.log(`[WhatsAppWeb] Sincronizando sucursal ${idStr}: ${percent}% (${message})`);
  });

  client.on('change_state', (state) => {
    console.log(`[WhatsAppWeb] Cambio de estado en sucursal ${idStr}: ${state}`);
  });

  client.on('message_ciphertext', (msg) => {
    console.log(`[WhatsAppWeb] ⏳ Mensaje recibido como CIPHERTEXT de ${msg.from} (esperando llave de desencriptación desde el celular principal...)`);
  });

  client.on('message_ciphertext_failed', (msg) => {
    console.warn(`[WhatsAppWeb] ⚠️ No se pudo desencriptar mensaje CIPHERTEXT de ${msg.from}. Mantén WhatsApp abierto en el celular principal unos segundos.`);
  });

  // 1. Evento de generación de código QR
  client.on('qr', async (qr) => {
    console.log(`[WhatsAppWeb] Código QR generado para la sucursal: ${idStr}`);
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
      session.status = 'qr_ready';
      session.qrImage = qrDataUrl;
    } catch (err) {
      console.error('[WhatsAppWeb] Error convirtiendo QR a imagen DataURL:', err);
      session.status = 'error';
      session.lastError = 'No se pudo renderizar el QR';
    }
  });

  // 2. Evento de autenticación completada
  client.on('authenticated', () => {
    console.log(`[WhatsAppWeb] Sucursal ${idStr} autenticada exitosamente.`);
    session.status = 'authenticated';
  });

  // 3. Evento de cliente listo (conectado a WhatsApp Web)
  client.on('ready', async () => {
    const phone = client.info?.wid?.user || '';
    console.log(`[WhatsAppWeb] Cliente listo y conectado para sucursal ${idStr}. Teléfono: ${phone}`);
    session.status = 'connected';
    session.qrImage = null;
    session.connectedPhone = phone;

    // Monitorear errores de Chromium y asegurar captura de mensajes nuevos aunque WhatsApp Web
    // siga sincronizando historial en segundo plano (donde msg.isNewMsg viene en false en Raspberry Pi)
    if (client.pupPage) {
      client.pupPage.on('error', (err) => {
        console.error(`[WhatsAppWeb] ❌ Crash en pestaña Chromium de sucursal ${idStr}:`, err.message);
        sessions.delete(idStr);
        setTimeout(() => initSession(branchId).catch(() => {}), 5000);
      });

      client.pupPage.on('pageerror', (err) => {
        console.warn(`[WhatsAppWeb] ⚠️ Error JS en página de WhatsApp (${idStr}):`, err.message);
      });

      try {
        await client.pupPage.evaluate(() => {
          if (window.__agentesFallbackMsgHooked) return;
          window.__agentesFallbackMsgHooked = true;
          const { Msg } = window.require('WAWebCollections');
          const bootTimeSec = Math.floor(Date.now() / 1000) - 10;

          Msg.on('add', (msg) => {
            try {
              // Si msg.isNewMsg es true, whatsapp-web.js ya lo procesa nativamente
              if (msg.isNewMsg) return;

              // Si msg.isNewMsg es false pero el timestamp del mensaje es posterior al arranque,
              // es un mensaje entrante real durante la sincronización lenta en Raspberry Pi
              const msgTime = msg.t || 0;
              if (msgTime >= bootTimeSec) {
                if (msg.type !== 'ciphertext') {
                  window.onAddMessageEvent(window.WWebJS.getMessageModel(msg));
                } else {
                  msg.once('change:type', (_msg) => {
                    if (_msg.type !== 'revoked' && _msg.type !== 'ciphertext') {
                      window.onAddMessageEvent(window.WWebJS.getMessageModel(_msg));
                    }
                  });
                }
              }
            } catch (e) {
              // Ignorar errores de serialización individuales
            }
          });
        });
        console.log(`[WhatsAppWeb] ✅ Listener de mensajes en tiempo real reforzado activo para sucursal ${idStr}.`);
      } catch (hookErr) {
        console.warn(`[WhatsAppWeb] No se pudo inyectar listener de refuerzo:`, hookErr.message);
      }
    }

    try {
      await Branch.findByIdAndUpdate(branchId, {
        whatsappConnected: true,
        whatsappPhoneNumber: phone,
        gatewayType: 'whatsapp_web'
      });
    } catch (dbErr) {
      console.error('[WhatsAppWeb] Error actualizando estado de sucursal en BD:', dbErr);
    }
  });

  // 4. Evento de fallo de autenticación
  client.on('auth_failure', (msg) => {
    console.error(`[WhatsAppWeb] Fallo de autenticación en sucursal ${idStr}:`, msg);
    session.status = 'error';
    session.lastError = msg;
  });

  // 5. Evento de desconexión
  client.on('disconnected', async (reason) => {
    console.log(`[WhatsAppWeb] Sucursal ${idStr} desconectada. Razón:`, reason);
    session.status = 'disconnected';
    session.qrImage = null;
    session.connectedPhone = '';

    try {
      await Branch.findByIdAndUpdate(branchId, {
        whatsappConnected: false
      });
    } catch (dbErr) {
      console.error('[WhatsAppWeb] Error actualizando estado desconectado en BD:', dbErr);
    }

    try {
      await client.destroy();
    } catch (e) {
      // Ignorar error de destrucción al desconectar
    }
    sessions.delete(idStr);
  });

  // 6. Evento de recepción de mensajes (DEMOSTRACIÓN INTERACTIVA)
  const handleIncomingMsg = async (msg) => {
    try {
      // Ignorar estados de WhatsApp y difusiones
      if (msg.isStatus || msg.broadcast) return;

      // Ignorar grupos (solo conversaciones directas 1 a 1)
      if (msg.from?.includes('@g.us') || msg.to?.includes('@g.us')) return;

      // Si el mensaje fue enviado por la propia cuenta (fromMe):
      // Solo lo procesamos si es un chat consigo mismo para pruebas (ej: escribiéndose a sí mismo)
      // Si fue enviado a otra persona, es la respuesta saliente del bot -> ignorar para evitar bucle infinito
      if (msg.fromMe) {
        const isSelfChat = (msg.to === msg.from) || 
                           (client.info?.wid && (msg.to === client.info.wid._serialized || msg.to === client.info.wid.user + '@c.us'));
        if (!isSelfChat) {
          return;
        }
      }

      console.log(`[WhatsAppWeb] Mensaje detectado: id=${msg.id?.id}, from=${msg.from}, to=${msg.to}, fromMe=${msg.fromMe}, body="${msg.body}"`);

      // Obtener el contacto
      let contactNumber = '';
      let contactName = '';
      try {
        const contact = await msg.getContact();
        contactNumber = contact?.number || '';
        contactName = contact?.pushname || contact?.name || '';
      } catch (cErr) {
        // Continuar con fallback
      }

      // Resolver número telefónico real si el remitente o contacto es un LID (@lid o >= 14 dígitos)
      let realPhoneNumber = '';
      const isLid = (msg.from && msg.from.includes('@lid')) || (contactNumber && contactNumber.length >= 14);

      if (isLid) {
        try {
          // 1. Intentar con el método nativo de whatsapp-web.js: getContactLidAndPhone
          const lidResolvePromise = (async () => {
            if (typeof client.getContactLidAndPhone === 'function') {
              const res = await client.getContactLidAndPhone([msg.from]);
              if (res && res[0]?.pn) {
                return res[0].pn;
              }
            }
            // 2. Si no retornó, evaluar directamente en Puppeteer
            if (client.pupPage) {
              const evalRes = await client.pupPage.evaluate(async (jid) => {
                try {
                  if (window.WWebJS && typeof window.WWebJS.enforceLidAndPnRetrieval === 'function') {
                    const r = await window.WWebJS.enforceLidAndPnRetrieval(jid);
                    if (r?.phone?.user) return r.phone.user;
                    if (r?.phone?._serialized) return r.phone._serialized;
                  }
                  const widFactory = window.require('WAWebWidFactory');
                  const apiContact = window.require('WAWebApiContact');
                  const wid = widFactory.createWid(jid);
                  const pn = apiContact.getPhoneNumber(wid);
                  if (pn?.user) return pn.user;
                  if (pn?._serialized) return pn._serialized;
                } catch (e) {
                  return null;
                }
                return null;
              }, msg.from);
              if (evalRes) return evalRes;
            }
            return null;
          })();

          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
          const resolvedJid = await Promise.race([lidResolvePromise, timeoutPromise]);
          if (resolvedJid) {
            realPhoneNumber = String(resolvedJid).replace(/@c\.us|@s\.whatsapp\.net|@lid/g, '').split(':')[0];
            console.log(`[WhatsAppWeb] LID ${msg.from} resuelto a teléfono real: ${realPhoneNumber}`);
          }
        } catch (resolveErr) {
          console.warn('[WhatsAppWeb] Falló resolución de LID:', resolveErr.message);
        }
      }

      // Si tenemos teléfono real resuelto, lo usamos; de lo contrario el contactNumber no-LID o el JID
      let cleanFrom = realPhoneNumber || (contactNumber && !contactNumber.includes('@lid') && contactNumber.length < 14 ? contactNumber : '');
      if (!cleanFrom) {
        if (msg.fromMe && client.info?.wid?.user) {
          cleanFrom = client.info.wid.user;
        } else {
          cleanFrom = msg.from.replace(/@c\.us|@s\.whatsapp\.net|@lid/g, '').split(':')[0];
        }
      }

      const hasMedia = Boolean(msg.hasMedia || (msg.type && msg.type !== 'chat'));
      const mediaType = hasMedia ? (msg.type || 'media') : null;
      const messageText = msg.body || '';
      const messageId = msg.id?.id || `wweb_${Date.now()}`;

      if (!hasMedia && (!messageText || !messageText.trim())) return;

      const rawLid = msg.from.includes('@lid') ? msg.from.replace(/@lid/g, '').split(':')[0] : (contactNumber && contactNumber.length >= 14 ? contactNumber : '');
      console.log(`[WhatsAppWeb] Procesando mensaje de ${cleanFrom} (LID: ${rawLid || 'N/A'}, Nombre: ${contactName}, Tipo: ${msg.type || 'chat'}): "${messageText}"`);

      // Invocación al controlador unificado
      const { handleIncomingMessage } = require('../controllers/whatsappController');
      await handleIncomingMessage({
        from: cleanFrom,
        resolvedPhone: realPhoneNumber,
        lid: rawLid,
        rawSender: msg.from,
        branchId: idStr,
        messageText: messageText,
        messageId: messageId,
        contactName: contactName,
        gateway: 'whatsapp_web',
        hasMedia: hasMedia,
        mediaType: mediaType,
        replyCallback: async (replyText) => {
          console.log(`[WhatsAppWeb] Enviando respuesta a ${msg.from}...`);
          try {
            if (typeof msg.reply === 'function') {
              await msg.reply(replyText);
            } else {
              await client.sendMessage(msg.from, replyText);
            }
          } catch (replyErr) {
            console.warn('[WhatsAppWeb] Falló msg.reply, intentando con client.sendMessage:', replyErr.message);
            await client.sendMessage(msg.from, replyText);
          }
        }
      });

    } catch (msgErr) {
      console.error('[WhatsAppWeb] Error procesando mensaje entrante:', msgErr);
    }
  };

  // Escuchar tanto 'message' como 'message_create' con deduplicación por msg.id.id
  const processedWwebMsgs = new Set();
  const onAnyMessage = async (msg) => {
    const msgId = msg.id?.id;
    if (msgId && processedWwebMsgs.has(msgId)) return;
    if (msgId) {
      processedWwebMsgs.add(msgId);
      setTimeout(() => processedWwebMsgs.delete(msgId), 30000);
    }
    await handleIncomingMsg(msg);
  };

  client.on('message', onAnyMessage);
  client.on('message_create', onAnyMessage);

  // Iniciar cliente de WhatsApp
  client.initialize().catch(err => {
    console.error(`[WhatsAppWeb] Error inicializando cliente para sucursal ${idStr}:`, err.message);
    session.status = 'error';
    session.lastError = err.message;
  });

  return { status: 'initializing', qrImage: null, connectedPhone: '' };
};

/**
 * Desconecta la sesión activa de WhatsApp Web de una sucursal.
 * @param {string} branchId 
 */
const disconnectSession = async (branchId) => {
  const idStr = branchId.toString();
  const session = sessions.get(idStr);

  if (session && session.client) {
    try {
      await session.client.logout().catch(() => {});
      await session.client.destroy().catch(() => {});
    } catch (e) {
      console.warn(`[WhatsAppWeb] Error cerrando sesión de ${idStr}:`, e.message);
    }
  }

  sessions.delete(idStr);

  try {
    await Branch.findByIdAndUpdate(branchId, {
      whatsappConnected: false,
      whatsappPhoneNumber: ''
    });
  } catch (dbErr) {
    console.error('[WhatsAppWeb] Error actualizando desconexión en BD:', dbErr);
  }

  return { success: true, message: 'Sesión de WhatsApp Web desconectada' };
};

/**
 * Auto-restaura las sesiones de sucursales conectadas previamente al reiniciar el servidor.
 */
const autoReconnectBranches = async () => {
  try {
    const branches = await Branch.find({ whatsappConnected: true, gatewayType: 'whatsapp_web' });
    for (const br of branches) {
      console.log(`[WhatsAppWeb] Auto-restaurando sesión para la sucursal: ${br._id} (${br.name})`);
      initSession(br._id).catch(e => console.warn(`[WhatsAppWeb] Error auto-reconectando ${br._id}:`, e.message));
    }
  } catch (err) {
    console.error('[WhatsAppWeb] Error en auto-reconexión de sucursales:', err.message);
  }
};

module.exports = {
  initSession,
  getSessionStatus,
  disconnectSession,
  autoReconnectBranches
};
