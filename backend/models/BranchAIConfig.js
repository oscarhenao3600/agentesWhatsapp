const mongoose = require('mongoose');

const branchAIConfigSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    unique: true
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
  timestamps: true
});

module.exports = mongoose.model('BranchAIConfig', branchAIConfigSchema);
