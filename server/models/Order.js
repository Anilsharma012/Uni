const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  id: String,
  title: String,
  price: Number,
  qty: Number,
  image: String,
  variant: Object,
});

const UPIPaymentSchema = new mongoose.Schema({
  transactionId: { type: String },
  payerName: { type: String },
  paidAmount: { type: Number },
}, { _id: false });

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    phone: { type: String },
    address: { type: String },
    paymentMethod: { type: String, enum: ['COD', 'UPI'], default: 'COD' },
    items: { type: [OrderItemSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'cod_pending', 'pending_verification', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    upi: { type: UPIPaymentSchema, default: () => ({}) },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', OrderSchema);
