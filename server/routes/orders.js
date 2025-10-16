const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authOptional, requireAuth, requireAdmin } = require('../middleware/auth');

// Create order
router.post('/', authOptional, async (req, res) => {
  try {
    const { customer, items, payment, name, phone, address, total } = req.body || {};
    const orderItems = items || [];
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) return res.status(400).json({ ok: false, message: 'No items' });

    // compute total server-side if missing
    let computed = 0;
    for (const it of orderItems) {
      const price = Number(it.price || 0);
      const qty = Number(it.qty || 0);
      computed += price * qty;
    }

    const finalTotal = typeof total === 'number' && total > 0 ? total : computed;

    const o = new Order({
      userId: req.user ? req.user._id : undefined,
      name: name || customer?.name,
      phone: phone || customer?.phone,
      address: address || customer?.address,
      payment: payment || 'COD',
      items: orderItems,
      total: finalTotal,
      status: payment === 'COD' ? 'pending' : 'paid',
    });

    await o.save();
    return res.json({ ok: true, data: o });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// List orders for current user (mine=1)
router.get('/', authOptional, async (req, res) => {
  try {
    const { mine } = req.query;
    if (mine && String(mine) === '1') {
      if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
      const docs = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, data: docs });
    }

    // admin list
    if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, message: 'Forbidden' });
    const docs = await Order.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get one order
router.get('/:id', authOptional, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Order.findById(id).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    // owner or admin
    if (req.user && (String(req.user._id) === String(doc.userId) || req.user.role === 'admin')) {
      return res.json({ ok: true, data: doc });
    }
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update status (admin only)
router.put('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, message: 'Missing status' });
    const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: 'Invalid status' });
    const doc = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Alternate update route to support Admin UI (PUT /api/orders/:id { status })
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, message: 'Missing status' });
    // Map common aliases from UI
    const map = { processing: 'paid', completed: 'delivered' };
    status = map[status] || status;
    const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: 'Invalid status' });
    const doc = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
