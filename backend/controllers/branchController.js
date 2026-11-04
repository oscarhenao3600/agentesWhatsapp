const fs = require('fs');
const path = require('path');
const Branch = require('../models/Branch');
const BranchAIConfig = require('../models/BranchAIConfig');
const Business = require('../models/Business');
const { encrypt, isEncrypted } = require('../utils/encryption');

const knowledgeFilesRoot = path.join(__dirname, '../.wwebjs_auth/knowledge_files');
if (!fs.existsSync(knowledgeFilesRoot)) {
  fs.mkdirSync(knowledgeFilesRoot, { recursive: true });
}

const sanitizeKnowledgeSources = (sources = []) => {
  return (sources || []).map(src => {
    const obj = src.toObject ? src.toObject() : { ...src };
    delete obj.fileDataBase64;
    return obj;
  });
};

/**
 * Parsea peticiones multipart/form-data de forma nativa en Node.js sin dependencias externas
 */
const parseMultipartFile = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return resolve(null);
    }
    const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const boundaryBuf = Buffer.from(boundary);
        let pos = buffer.indexOf(boundaryBuf);
        while (pos !== -1) {
          const nextPos = buffer.indexOf(boundaryBuf, pos + boundaryBuf.length);
          if (nextPos === -1) break;
          const part = buffer.subarray(pos + boundaryBuf.length, nextPos);
          const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
          if (headerEnd !== -1) {
            const headerStr = part.subarray(0, headerEnd).toString('utf-8');
            const fnMatch = headerStr.match(/filename="([^"]+)"/i);
            if (fnMatch && fnMatch[1]) {
              const fileName = fnMatch[1];
              const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
              const mimeType = ctMatch ? ctMatch[1].trim() : 'application/pdf';
              let bodyBuf = part.subarray(headerEnd + 4);
              if (bodyBuf.length >= 2 && bodyBuf[bodyBuf.length - 2] === 13 && bodyBuf[bodyBuf.length - 1] === 10) {
                bodyBuf = bodyBuf.subarray(0, bodyBuf.length - 2);
              }
              return resolve({ fileName, mimeType, fileBuffer: bodyBuf });
            }
          }
          pos = nextPos;
        }
        resolve(null);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
};

// Auxiliar para validar que el usuario sea Admin o dueño del negocio
const validateBusinessAccess = async (user, businessId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const business = await Business.findById(businessId);
  if (!business) return false;
  return business.owner.toString() === user._id.toString();
};

// Auxiliar para validar que el usuario sea Admin o dueño de la sucursal
const validateBranchAccess = async (user, branchId) => {
  if (!user) return false;
  const branch = await Branch.findById(branchId);
  if (!branch) return false;
  if (user.role === 'admin') return true;
  return validateBusinessAccess(user, branch.business);
};

exports.createBranch = async (req, res) => {
  try {
    const { businessId, name, phone, whatsappNumberId, whatsappVerifyToken, accessToken, basePrompt, businessType } = req.body;

    const hasAccess = await validateBusinessAccess(req.user, businessId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para crear sucursales en este negocio' });
    }

    const branch = new Branch({
      business: businessId,
      name,
      phone,
      whatsappNumberId,
      whatsappVerifyToken,
      accessToken
    });

    await branch.save();

    // Crear configuración de IA por defecto para la sucursal
    const aiConfig = new BranchAIConfig({
      branch: branch._id,
      basePrompt: basePrompt || `Eres un asistente virtual para ${name}.`,
      businessType: businessType || 'other'
    });

    await aiConfig.save();

    res.status(201).json({ branch, aiConfig });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getBusinessBranches = async (req, res) => {
  try {
    const hasAccess = await validateBusinessAccess(req.user, req.params.businessId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para ver las sucursales de este negocio' });
    }

    const branches = await Branch.find({ business: req.params.businessId });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBranchDetails = async (req, res) => {
  try {
    const hasAccess = await validateBranchAccess(req.user, req.params.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para ver esta sucursal' });
    }

    const branch = await Branch.findById(req.params.id);
    const aiConfig = await BranchAIConfig.findOne({ branch: req.params.id });
    const aiConfigObj = aiConfig ? aiConfig.toJSON() : null;
    if (aiConfigObj && Array.isArray(aiConfigObj.knowledgeSources)) {
      aiConfigObj.knowledgeSources = sanitizeKnowledgeSources(aiConfigObj.knowledgeSources);
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ branch, aiConfig: aiConfigObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ALLOWED_AI_CONFIG_FIELDS = [
  'aiProvider',
  'aiModel',
  'apiKey',
  'temperature',
  'additionalParams',
  'businessType',
  'personality',
  'menuContent',
  'basePrompt',
  'welcomeMessage',
  'branchAdminPhone',
  'postOrderPauseMinutes',
  'gatewayType',
  'testMode',
  'testPhoneNumber',
  'conciseMode',
  'maxOutputTokens',
  'calendarSyncEnabled',
  'googleCalendarId',
  'googleServiceAccountEmail',
  'googleCredentialsJson',
  'isActive'
];

exports.updateBranchAI = async (req, res) => {
  try {
    const hasAccess = await validateBranchAccess(req.user, req.params.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para modificar esta sucursal' });
    }

    const updateFields = {};
    for (const key of ALLOWED_AI_CONFIG_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key) && req.body[key] !== undefined) {
        let val = req.body[key];
        if (key === 'apiKey' && typeof val === 'string' && val.trim().length > 0 && val.trim().length < 20) {
          val = ''; // Ignorar contraseñas cortas autocompletadas por el navegador
        }
        if ((key === 'apiKey' || key === 'googleCredentialsJson') && val && typeof val === 'string' && !isEncrypted(val)) {
          val = encrypt(val);
        }
        if (key === 'basePrompt' && (!val || !String(val).trim())) {
          continue; // Evitar sobreescribir el prompt base con vacío en guardados parciales
        }
        updateFields[key] = val;
      }
    }

    const aiConfig = await BranchAIConfig.findOneAndUpdate(
      { branch: req.params.id },
      {
        $set: updateFields,
        $setOnInsert: { branch: req.params.id }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (req.body.gatewayType && ['baileys', 'whatsapp_web', 'meta'].includes(req.body.gatewayType)) {
      await Branch.findByIdAndUpdate(req.params.id, { gatewayType: req.body.gatewayType });
    }

    const aiConfigObj = aiConfig.toJSON();
    if (Array.isArray(aiConfigObj.knowledgeSources)) {
      aiConfigObj.knowledgeSources = sanitizeKnowledgeSources(aiConfigObj.knowledgeSources);
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json(aiConfigObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.testCalendarConfig = async (req, res) => {
  try {
    const branchId = req.params.id;
    const hasAccess = await validateBranchAccess(req.user, branchId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'No tienes permisos sobre esta sucursal' });
    }

    const { testCalendarConnection } = require('../services/googleCalendarService');
    let aiConfig = await BranchAIConfig.findOne({ branch: branchId });

    // Permite probar con datos enviados directamente en el body (antes de guardar) o los guardados en BD
    const testConfig = {
      googleCalendarId: req.body.googleCalendarId || aiConfig?.googleCalendarId || 'primary',
      googleCredentialsJson: req.body.googleCredentialsJson || aiConfig?.googleCredentialsJson
    };

    // Guardar automáticamente el ID y las credenciales proporcionadas en la BD de forma atómica
    const calUpdate = { calendarSyncEnabled: true };
    if (req.body.googleCalendarId) {
      calUpdate.googleCalendarId = req.body.googleCalendarId.trim();
    }
    if (req.body.googleCredentialsJson) {
      calUpdate.googleCredentialsJson = isEncrypted(req.body.googleCredentialsJson)
        ? req.body.googleCredentialsJson
        : encrypt(req.body.googleCredentialsJson);
      try {
        const parsed = JSON.parse(req.body.googleCredentialsJson);
        if (parsed.client_email) {
          calUpdate.googleServiceAccountEmail = parsed.client_email;
        }
      } catch (e) {}
    }

    await BranchAIConfig.findOneAndUpdate(
      { branch: branchId },
      { $set: calUpdate, $setOnInsert: { branch: branchId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!testConfig.googleCredentialsJson) {
      return res.status(400).json({
        success: false,
        error: 'Se guardó el ID del calendario, pero debes ingresar o cargar el archivo JSON de credenciales de la Cuenta de Servicio de Google para probar la conexión.'
      });
    }

    const result = await testCalendarConnection(testConfig);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      const Business = require('../models/Business');
      const businesses = await Business.find({ owner: req.user._id });
      const businessIds = businesses.map(b => b._id);
      query = { business: { $in: businessIds } };
    }
    const branches = await Branch.find(query).populate('business', 'name');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branchId = req.params.id;
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    // Verificar permisos: Admin o el dueño del negocio al que pertenece la sucursal
    const Business = require('../models/Business');
    const business = await Business.findById(branch.business);
    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado para esta sucursal' });
    }

    if (req.user.role !== 'admin' && business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar esta sucursal' });
    }

    // Si el usuario NO es admin, verificar comisiones pendientes de pago
    if (req.user.role !== 'admin') {
      const Order = require('../models/Order');
      const pendingOrders = await Order.findOne({
        branch: branchId,
        commissionStatus: 'pending'
      });

      if (pendingOrders) {
        return res.status(400).json({
          message: 'No se puede eliminar la sucursal hasta estar al día con los pagos de dicha sucursal'
        });
      }
    }

    // Eliminar configuración de IA asociada
    const BranchAIConfig = require('../models/BranchAIConfig');
    await BranchAIConfig.deleteOne({ branch: branchId });

    // Eliminar la sucursal
    await Branch.findByIdAndDelete(branchId);

    res.json({ message: 'Sucursal eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener documentos y enlaces de la Base de Conocimiento (RAG) de una sucursal
// @route   GET /api/branch/:id/sources
// @access  Private
exports.getKnowledgeSources = async (req, res) => {
  try {
    const branchId = req.params.id;
    const hasAccess = await validateBranchAccess(req.user, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const aiConfig = await BranchAIConfig.findOne({ branch: branchId });
    if (!aiConfig) {
      return res.json([]);
    }

    res.json(sanitizeKnowledgeSources(aiConfig.knowledgeSources));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Subir un documento (PDF, TXT, CSV, Imagen, etc.) a la Base de Conocimiento y habilitarlo para envío por WhatsApp
// @route   POST /api/branch/:id/upload
// @access  Private
exports.uploadKnowledgeFile = async (req, res) => {
  try {
    const branchId = req.params.id;
    const hasAccess = await validateBranchAccess(req.user, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    let { fileName, mimeType, size, fileDataBase64, alias } = req.body || {};
    let fileBuffer = null;
    let cleanBase64 = '';

    // Soportar tanto carga JSON (Base64) como multipart/form-data (FormData)
    if (fileName && fileDataBase64) {
      cleanBase64 = String(fileDataBase64).replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    } else if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      const parsedMultipart = await parseMultipartFile(req);
      if (parsedMultipart && parsedMultipart.fileBuffer) {
        fileName = parsedMultipart.fileName;
        mimeType = parsedMultipart.mimeType;
        fileBuffer = parsedMultipart.fileBuffer;
        cleanBase64 = fileBuffer.toString('base64');
      }
    }

    if (!fileName || !fileBuffer) {
      return res.status(400).json({
        message: 'Debes proporcionar un archivo válido para cargar en la sucursal.'
      });
    }

    const branchFolder = path.join(knowledgeFilesRoot, branchId.toString());
    if (!fs.existsSync(branchFolder)) {
      fs.mkdirSync(branchFolder, { recursive: true });
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u017F ]/g, '_');
    const sourceId = `doc-${Date.now()}`;
    const storedFileName = `${sourceId}_${safeFileName}`;
    const fullFilePath = path.join(branchFolder, storedFileName);

    fs.writeFileSync(fullFilePath, fileBuffer);

    // Si es un archivo de texto plano (.txt, .csv, .md), extraer su contenido para inyectarlo también al contexto RAG
    let extractedText = '';
    const lowerName = safeFileName.toLowerCase();
    if (
      (mimeType && (mimeType.includes('text/') || mimeType.includes('csv') || mimeType.includes('json'))) ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.md')
    ) {
      extractedText = fileBuffer.toString('utf-8').substring(0, 15000);
    }

    let aiConfig = await BranchAIConfig.findOne({ branch: branchId });
    if (!aiConfig) {
      aiConfig = new BranchAIConfig({
        branch: branchId,
        basePrompt: 'Eres un asistente virtual amable.'
      });
    }

    const readableSize = size || `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`;
    const newSource = {
      id: sourceId,
      type: 'file',
      name: fileName.trim(),
      alias: (alias || fileName.replace(/\.[^/.]+$/, '')).trim(),
      mimeType: mimeType || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      size: readableSize,
      filePath: fullFilePath,
      fileDataBase64: fileBuffer.length <= 12 * 1024 * 1024 ? cleanBase64 : '',
      extractedText,
      status: 'active',
      uploadedAt: new Date()
    };

    // Si ya había un documento con exactamente el mismo nombre, reemplazarlo para evitar duplicados confusos
    aiConfig.knowledgeSources = (aiConfig.knowledgeSources || []).filter(
      s => !(s.type === 'file' && s.name.toLowerCase() === fileName.trim().toLowerCase())
    );
    aiConfig.knowledgeSources.push(newSource);
    await aiConfig.save();

    const responseItem = { ...newSource };
    delete responseItem.fileDataBase64;

    res.status(201).json(responseItem);
  } catch (error) {
    console.error('[KnowledgeUpload] Error guardando documento:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Añadir una URL a la Base de Conocimiento (RAG)
// @route   POST /api/branch/:id/url
// @access  Private
exports.addKnowledgeUrl = async (req, res) => {
  try {
    const branchId = req.params.id;
    const hasAccess = await validateBranchAccess(req.user, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const { url, alias } = req.body || {};
    if (!url || !url.trim()) {
      return res.status(400).json({ message: 'La URL es obligatoria' });
    }

    let aiConfig = await BranchAIConfig.findOne({ branch: branchId });
    if (!aiConfig) {
      aiConfig = new BranchAIConfig({
        branch: branchId,
        basePrompt: 'Eres un asistente virtual amable.'
      });
    }

    const sourceId = `url-${Date.now()}`;
    const newSource = {
      id: sourceId,
      type: 'url',
      name: url.trim(),
      alias: (alias || url).trim(),
      mimeType: 'text/uri-list',
      size: 'Enlace Web',
      status: 'active',
      uploadedAt: new Date()
    };

    aiConfig.knowledgeSources.push(newSource);
    await aiConfig.save();

    res.status(201).json(newSource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Eliminar un documento o enlace de la Base de Conocimiento (RAG)
// @route   DELETE /api/branch/:id/sources/:sourceId
// @access  Private
exports.deleteKnowledgeSource = async (req, res) => {
  try {
    const { id: branchId, sourceId } = req.params;
    const hasAccess = await validateBranchAccess(req.user, branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos sobre esta sucursal' });
    }

    const aiConfig = await BranchAIConfig.findOne({ branch: branchId });
    if (!aiConfig) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }

    const target = (aiConfig.knowledgeSources || []).find(s => s.id === sourceId);
    if (target && target.filePath && fs.existsSync(target.filePath)) {
      try {
        fs.unlinkSync(target.filePath);
      } catch (unlinkErr) {
        console.warn('[KnowledgeDelete] No se pudo borrar archivo físico:', unlinkErr.message);
      }
    }

    aiConfig.knowledgeSources = (aiConfig.knowledgeSources || []).filter(s => s.id !== sourceId);
    await aiConfig.save();

    res.json({ success: true, sources: sanitizeKnowledgeSources(aiConfig.knowledgeSources) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
