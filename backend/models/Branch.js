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
    default: ''
  },
  whatsappVerifyToken: {
    type: String,
    default: ''
  },
  accessToken: {
    type: String,
    default: ''
  },
  gatewayType: {
    type: String,
    enum: ['whatsapp_web', 'meta'],
    default: 'whatsapp_web'
  },
  whatsappConnected: {
    type: Boolean,
    default: false
  },
  whatsappPhoneNumber: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);
