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
  shortId: {
    type: String,
    index: true
  },
  botPausedUntil: {
    type: Date,
    default: null
  },
  pauseReason: {
    type: String,
    enum: ['none', 'reservation_active', 'order_active', 'manual'],
    default: 'none'
  },
  pendingAdminQueries: [{
    question: String,
    askedAt: {
      type: Date,
      default: Date.now
    },
    answeredAt: Date,
    answer: String
  }],
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
  },
  commissionStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Generar shortId de 4 caracteres automáticamente si no existe
conversationSchema.pre('save', function(next) {
  if (!this.shortId && this._id) {
    this.shortId = this._id.toString().slice(-4).toUpperCase();
  }
  next();
});

// Índice para búsqueda rápida por sucursal y cliente
conversationSchema.index({ branch: 1, customerNumber: 1 });
conversationSchema.index({ branch: 1, shortId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
