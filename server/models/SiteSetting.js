const mongoose = require('mongoose');

const PaymentSettingsSchema = new mongoose.Schema(
  {
    razorpayEnabled: { type: Boolean, default: true },
    razorpayKeyId: { type: String, default: 'rzp_test_FUSION123456789' },
    razorpayKeySecret: { type: String, default: 'test_secret_FUSION987654321' },
    manualPaymentEnabled: { type: Boolean, default: true },
    manualPaymentInstructions: {
      type: String,
      default:
        'Bank Transfer (Account Name: UNI10 Pvt Ltd, Account No: 1234567890, IFSC: HDFC0001234) or UPI: uni10@upi. Share payment confirmation at payments@uni10.in.',
    },
    manualPaymentContact: { type: String, default: 'payments@uni10.in' },
  },
  { _id: false },
);

const ShiprocketSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    email: { type: String, default: 'logistics@uni10.in' },
    password: { type: String, default: 'Test@1234' },
    apiKey: { type: String, default: 'ship_test_key_123456' },
    secret: { type: String, default: 'ship_test_secret_abcdef' },
    channelId: { type: String, default: 'TEST_CHANNEL_001' },
  },
  { _id: false },
);

const SiteSettingSchema = new mongoose.Schema(
  {
    domain: { type: String, default: 'www.uni10.in' },
    payment: { type: PaymentSettingsSchema, default: () => ({}) },
    shipping: {
      type: new mongoose.Schema(
        {
          shiprocket: { type: ShiprocketSettingsSchema, default: () => ({}) },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SiteSetting', SiteSettingSchema);
