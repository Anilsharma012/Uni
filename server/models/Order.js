const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  id: String,
  title: String,
  price: Number,
  qty: Number,
  image: String,
  variant: Object,
});

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    phone: { type: String },
    address: { type: String },
 flare-verse
    payment: { type: String, enum: ['COD', 'UPI'], default: 'COD' },
    items: { type: [OrderItemSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'cod_pending', 'pending_verification', 'verified', 'shipped', 'delivered', 'cancelled'], default: 'pending' },

    paymentMethod: { type: String, enum: ['COD', 'UPI', 'Card'], default: 'COD' },
    items: { type: [OrderItemSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['cod_pending', 'pending_verification', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'cod_pending' },
 main
    upi: {
      payerName: { type: String },
      txnId: { type: String },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', OrderSchema);
