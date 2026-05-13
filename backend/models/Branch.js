const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  name: {
    type: String,
    required: [true, 'El nombre de la sucursal es obligatorio'],
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String
  },
  phone: {
    type: String,
    required: [true, 'El teléfono de contacto es obligatorio']
  },
  whatsappNumberId: {
    type: String,
    required: [true, 'El ID del número de WhatsApp (Meta) es obligatorio']
  },
  whatsappVerifyToken: {
    type: String,
    required: [true, 'El token de verificación para webhooks es obligatorio']
  },
  accessToken: {
    type: String,
    required: [true, 'El Token de Acceso de Meta es obligatorio']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);
