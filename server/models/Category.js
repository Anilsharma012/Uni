const mongoose = require('mongoose');
const slugify = require('slugify');

function buildSlug(name) {
  return slugify(String(name || ''), { lower: true, strict: true });
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.pre('save', function (next) {
  if (this.name) {
    this.slug = buildSlug(this.name);
  }
  next();
});

CategorySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  if (typeof update.name === 'string') {
    update.slug = buildSlug(update.name);
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('Category', CategorySchema);
