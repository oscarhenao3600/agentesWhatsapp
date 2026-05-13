const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  customerNumber: {
    type: String,
    required: true
  },
  customerName: String,
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  summary: String, // Resumen de la conversación para contexto largo
  emotionalState: {
    type: String,
    default: 'neutral'
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para búsqueda rápida por sucursal y cliente
conversationSchema.index({ branch: 1, customerNumber: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
