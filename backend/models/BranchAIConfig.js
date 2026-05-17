const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const branchAIConfigSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    unique: true
  },
  aiProvider: {
    type: String,
    enum: ['gemini', 'openai', 'deepseek'],
    default: 'gemini'
  },
  aiModel: {
    type: String,
    default: 'gemini-1.5-pro'
  },
  apiKey: {
    type: String,
    set: function(value) {
      // Solo encriptar si es un valor nuevo y no está ya encriptado (formato iv:encrypted)
      if (value && !value.includes(':')) {
        return encrypt(value);
      }
      return value;
    },
    get: function(value) {
      return decrypt(value);
    }
  },
  temperature: {
    type: Number,
    min: 0,
    max: 2,
    default: 0.7
  },
  additionalParams: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'hotel', 'retail', 'services', 'other'],
    default: 'other'
  },
  personality: {
    type: String,
    default: 'friendly' // friendly, professional, formal, casual
  },
  menuContent: {
    type: String, // Texto plano o JSON con el menú/catálogo
    default: ''
  },
  basePrompt: {
    type: String,
    required: [true, 'El prompt base para la IA es obligatorio']
  },
  welcomeMessage: {
    type: String,
    default: '¡Hola! ¿En qué puedo ayudarte hoy?'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true }, // Asegurar que los getters (decrypt) funcionen al enviar a JSON
  toObject: { getters: true }
});

module.exports = mongoose.model('BranchAIConfig', branchAIConfigSchema);
