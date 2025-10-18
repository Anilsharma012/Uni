const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// List categories
router.get('/', async (_req, res) => {
  try {
    const docs = await Category.find({ active: true }).sort({ name: 1 }).lean();
    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Create category (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, active } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, message: 'Missing name' });
    if (!name.trim()) return res.status(400).json({ ok: false, message: 'Name cannot be empty' });

    const trimmedName = name.trim();
    const existingCategory = await Category.findOne({ name: trimmedName });
    if (existingCategory) {
      return res.status(400).json({ ok: false, message: 'Category already exists' });
    }

    const doc = await Category.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      active: typeof active === 'boolean' ? active : true
    });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error('Category create error:', e.message, e);
    return res.status(500).json({ ok: false, message: e.message || 'Server error' });
  }
});

// Update category (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const doc = await Category.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete/Deactivate (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Category.findByIdAndUpdate(id, { active: false }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
