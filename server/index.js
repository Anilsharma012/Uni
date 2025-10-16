require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require("dotenv").config()
const path = require('path');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const categoriesRoutes = require('./routes/categories');
const wishlistRoutes = require('./routes/wishlist');
const reviewsRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const uploadsRoutes = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow local dev origins and optional CLIENT_URL from env
const allowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  "http://localhost:8080",
  "https://ff8d2ba85401451bad453bb609262d07-vortex-hub.projects.builder.my"
];
if (process.env.CLIENT_URL) allowed.push(process.env.CLIENT_URL);

app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl or server-to-server)
    if (!origin) return callback(null, true);
    const allowedOrigins = Array.isArray(allowed) ? allowed : [];
    if (allowedOrigins.includes(origin) || origin.endsWith('.fly.dev') || origin.includes('.builder.my')) {
      return callback(null, true);
    }
    // In development, allow all localhost origins
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    // Default deny
    console.warn('Blocked CORS for origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// serve uploaded files from server/uploads (same as multer destination)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// uploads endpoint
app.use('/api/uploads', uploadsRoutes);

// health check
app.get('/api/health', (req, res) => res.json({ ok: true, message: 'API running' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/settings', settingsRoutes);

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName: 'UNI10' });
    console.log('Connected to MongoDB (UNI10)');

    // Ensure admin and demo user exist (seed)
    try {
      const User = require('./models/User');
      const bcrypt = require('bcrypt');
      const adminEmail = 'uni10@gmail.com';
      const adminPassword = '12345678';
      const demoEmail = 'sachin@gmail.com';
      const demoPassword = '123456';
      (async () => {
        // Admin
        const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
        if (!existingAdmin) {
          const hash = await bcrypt.hash(adminPassword, 10);
          await User.create({ name: 'UNI10 Admin', email: adminEmail.toLowerCase(), passwordHash: hash, role: 'admin' });
          console.log('Admin user created:', adminEmail);
        } else if (existingAdmin.role !== 'admin') {
          existingAdmin.role = 'admin';
          await existingAdmin.save();
          console.log('Existing user promoted to admin:', adminEmail);
        } else {
          console.log('Admin user already exists');
        }

        // Demo user (sachin)
        const existingDemo = await User.findOne({ email: demoEmail.toLowerCase() });
        if (!existingDemo) {
          const hash2 = await bcrypt.hash(demoPassword, 10);
          await User.create({ name: 'Sachin', email: demoEmail.toLowerCase(), passwordHash: hash2, role: 'user' });
          console.log('Demo user created:', demoEmail);
        } else {
          console.log('Demo user already exists');
        }
      })().catch((e) => console.error('Failed to seed users', e));
    } catch (e) {
      console.error('Failed to seed users', e);
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

start();
