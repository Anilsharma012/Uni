const express = require('express');
const Category = require('../../models/Category');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

function buildFilter(query) {
  const filter = {};
  if (typeof query.active !== 'undefined') {
    const activeValue = String(query.active).toLowerCase();
    if (['true', '1'].includes(activeValue)) filter.active = true;
    else if (['false', '0'].includes(activeValue)) filter.active = false;
  }
  if (query.q) {
    const regex = new RegExp(String(query.q).trim(), 'i');
    filter.$or = [{ name: regex }, { slug: regex }];
  }
  return filter;
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filter = buildFilter(req.query || {});
    const categories = await Category.find(filter).sort({ name: 1 }).lean();
    return res.json({ ok: true, data: categories });
  } catch (error) {
    console.error('GET /api/admin/categories failed', error);
    return res.status(500).json({ ok: false, message: 'Failed to load categories' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ ok: false, message: 'Name is required' });

    const category = await Category.create({ name });
    return res.status(201).json({ ok: true, data: category });
  } catch (error) {
    console.error('POST /api/admin/categories failed', error);
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Category already exists' });
    }
    return res.status(500).json({ ok: false, message: 'Failed to create category' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (typeof req.body?.name !== 'undefined') {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ ok: false, message: 'Name is required' });
      updates.name = name;
    }
    if (typeof req.body?.active !== 'undefined') {
      updates.active = !!req.body.active;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ ok: false, message: 'No updates provided' });
    }

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    }).lean();

    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }

    return res.json({ ok: true, data: category });
  } catch (error) {
    console.error('PATCH /api/admin/categories/:id failed', error);
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: 'Category already exists' });
    }
    return res.status(500).json({ ok: false, message: 'Failed to update category' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id).lean();
    if (!category) {
      return res.status(404).json({ ok: false, message: 'Category not found' });
    }
    return res.json({ ok: true, data: category });
  } catch (error) {
    console.error('DELETE /api/admin/categories/:id failed', error);
    return res.status(500).json({ ok: false, message: 'Failed to delete category' });
  }
});

module.exports = router;
