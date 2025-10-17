const mongoose = require('mongoose');

const PaymentSettingsSchema = new mongoose.Schema(
  {
    upiQrImage: { type: String, default: '' },
    upiId: { type: String, default: '' },
    beneficiaryName: { type: String, default: '' },
 flare-verse
    instructions: { type: String, default: '' },

    instructions: { type: String, default: 'Scan QR and pay. Enter UTR/Txn ID on next step.' },
 main
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
