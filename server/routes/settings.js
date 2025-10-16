const express = require('express');
const SiteSetting = require('../models/SiteSetting');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function ensureSettingsDoc() {
  let doc = await SiteSetting.findOne();
  if (!doc) {
    doc = await SiteSetting.create({});
  }
  return doc;
}

function toClient(doc) {
  const obj = doc.toObject({ versionKey: false });
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const doc = await ensureSettingsDoc();
    return res.json({ ok: true, data: toClient(doc) });
  } catch (error) {
    console.error('Failed to load settings', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const set = {};

    if (typeof body.domain === 'string') {
      const trimmed = body.domain.trim();
      if (trimmed) set.domain = trimmed;
    }

    if (body.payment && typeof body.payment === 'object') {
      const payment = body.payment;
      if (typeof payment.razorpayEnabled === 'boolean') set['payment.razorpayEnabled'] = payment.razorpayEnabled;
      if (typeof payment.razorpayKeyId === 'string') set['payment.razorpayKeyId'] = payment.razorpayKeyId.trim();
      if (typeof payment.razorpayKeySecret === 'string') set['payment.razorpayKeySecret'] = payment.razorpayKeySecret.trim();
      if (typeof payment.manualPaymentEnabled === 'boolean') set['payment.manualPaymentEnabled'] = payment.manualPaymentEnabled;
      if (typeof payment.manualPaymentInstructions === 'string') {
        set['payment.manualPaymentInstructions'] = payment.manualPaymentInstructions.trim();
      }
      if (typeof payment.manualPaymentContact === 'string') {
        set['payment.manualPaymentContact'] = payment.manualPaymentContact.trim();
      }
    }

    if (body.shipping && typeof body.shipping === 'object') {
      const shipping = body.shipping;
      if (shipping.shiprocket && typeof shipping.shiprocket === 'object') {
        const shiprocket = shipping.shiprocket;
        if (typeof shiprocket.enabled === 'boolean') set['shipping.shiprocket.enabled'] = shiprocket.enabled;
        if (typeof shiprocket.email === 'string') set['shipping.shiprocket.email'] = shiprocket.email.trim();
        if (typeof shiprocket.password === 'string') set['shipping.shiprocket.password'] = shiprocket.password; // keep exact value
        if (typeof shiprocket.apiKey === 'string') set['shipping.shiprocket.apiKey'] = shiprocket.apiKey.trim();
        if (typeof shiprocket.secret === 'string') set['shipping.shiprocket.secret'] = shiprocket.secret.trim();
        if (typeof shiprocket.channelId === 'string') set['shipping.shiprocket.channelId'] = shiprocket.channelId.trim();
      }
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({ ok: false, message: 'No valid fields supplied' });
    }

    const doc = await SiteSetting.findOneAndUpdate({}, { $set: set }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.json({ ok: true, data: toClient(doc) });
  } catch (error) {
    console.error('Failed to update settings', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
