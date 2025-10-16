const express = require('express');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

const ALLOWED_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function normalizeSizes(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').toUpperCase().trim())
        .filter((item) => ALLOWED_SIZES.includes(item)),
    ),
  );
}

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const title = String(body.title || body.name || '').trim();
    const price = Number(body.price);
    if (!title) return res.status(400).json({ ok: false, message: 'Name is required' });
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ ok: false, message: 'Price must be greater than zero' });
    }

    const categoryId = body.categoryId || body.category_id || null;
    let categoryName = String(body.category || body.categoryName || '').trim();
    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId).lean();
      if (!categoryDoc) {
        return res.status(400).json({ ok: false, message: 'Category not found' });
      }
      categoryName = categoryDoc.name;
    }

    const payload = {
      title,
      price,
      category: categoryName || undefined,
      categoryId: categoryId || undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      stock: Number.isFinite(Number(body.stock)) ? Number(body.stock) : 0,
      image_url: typeof body.image_url === 'string' ? body.image_url : undefined,
      images: Array.isArray(body.images) ? body.images : undefined,
      sizes: normalizeSizes(body.sizes),
      attributes: body.attributes || {},
      active: typeof body.active === 'boolean' ? body.active : true,
    };

    // Ensure at least one image entry if image_url present
    if (!payload.images && payload.image_url) {
      payload.images = [payload.image_url];
    }

    const product = await Product.create(payload);
    return res.status(201).json({ ok: true, data: product });
  } catch (error) {
    console.error('POST /api/admin/products failed', error);
    return res.status(500).json({ ok: false, message: 'Failed to create product' });
  }
});

module.exports = router;
