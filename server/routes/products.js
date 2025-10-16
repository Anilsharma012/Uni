const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authOptional, requireAuth, requireAdmin } = require('../middleware/auth');

// List products: supports active, category, q
router.get('/', authOptional, async (req, res) => {
  try {
    const { active, category, q, limit = 50, page = 1 } = req.query;
    const filter = {};
    // By default, only return active products. Allow overriding with active=false or active=all
    if (typeof active === 'undefined') {
      filter.active = true;
    } else if (String(active).toLowerCase() === 'false' || String(active) === '0') {
      filter.active = false;
    } // when active is 'all', do not set filter.active

    if (category) filter.category = category;
    if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { category: new RegExp(q, 'i') }];

    const l = Math.min(200, Number(limit) || 50);
    const p = Math.max(1, Number(page) || 1);
    const docs = await Product.find(filter).skip((p - 1) * l).limit(l).lean();
    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get by id or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let doc = null;
    if (/^[0-9a-fA-F]{24}$/.test(idOrSlug)) doc = await Product.findById(idOrSlug).lean();
    if (!doc) doc = await Product.findOne({ slug: idOrSlug }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Create product (admin) — supports Admin UI payload mapping
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const title = body.title || body.name;
    const price = typeof body.price !== 'undefined' ? Number(body.price) : undefined;
    if (!title || typeof price === 'undefined') return res.status(400).json({ ok: false, message: 'Missing fields' });

    const payload = {
      title,
      price,
      category: body.category || undefined,
      stock: typeof body.stock !== 'undefined' ? Number(body.stock) : 0,
      description: body.description || undefined,
      images: Array.isArray(body.images)
        ? body.images
        : body.image_url
        ? [body.image_url]
        : [],
      attributes: body.attributes || {},
      active: typeof body.active === 'boolean' ? body.active : true,
    };

    const doc = await Product.create(payload);
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update product (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates = {};
    if (typeof body.name !== 'undefined') updates.title = body.name;
    if (typeof body.title !== 'undefined') updates.title = body.title;
    if (typeof body.description !== 'undefined') updates.description = body.description;
    if (typeof body.price !== 'undefined') updates.price = Number(body.price);
    if (typeof body.category !== 'undefined') updates.category = body.category;
    if (typeof body.stock !== 'undefined') updates.stock = Number(body.stock);
    if (typeof body.active !== 'undefined') updates.active = !!body.active;
    if (typeof body.image_url !== 'undefined') updates.images = [body.image_url];
    if (Array.isArray(body.images)) updates.images = body.images;

    const doc = await Product.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Soft delete
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Product.findByIdAndUpdate(id, { active: false }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
