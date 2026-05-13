const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerName: String,
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: {
      type: Number,
      default: 1
    },
    price: Number,
    total: Number
  }],
  subtotal: Number,
  deliveryFee: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryAddress: String,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
