const mongoose = require('mongoose');
const slugify = require('slugify');

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

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    price: { type: Number, required: true },
    images: { type: [String], default: [] },
    image_url: { type: String },
    description: { type: String },
    category: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    sizes: {
      type: [String],
      enum: ALLOWED_SIZES,
      default: [],
      set: normalizeSizes,
    },
    stock: { type: Number, default: 0 },
    attributes: { type: Object, default: {} },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProductSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (!this.image_url && this.images && this.images.length) {
    this.image_url = this.images[0];
  }
  if (Array.isArray(this.sizes)) {
    this.sizes = this.sizes; // trigger setter for sanitization
  }
  next();
});

ProductSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && typeof update.title === 'string' && !update.slug) {
    update.slug = slugify(update.title, { lower: true, strict: true });
  }
  if (update && Array.isArray(update.sizes)) {
    update.sizes = ProductSchema.path('sizes').cast(update.sizes);
  }
  next();
});

// Helpful indexes for search/filter
ProductSchema.index({ title: 'text' });
ProductSchema.index({ category: 1, active: 1 });
ProductSchema.index({ categoryId: 1, active: 1 });

module.exports = mongoose.model('Product', ProductSchema);
