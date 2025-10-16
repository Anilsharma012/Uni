const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const COOKIE_NAME = 'token';

function sendToken(res, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// Sign up
router.post('/signup', async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });
  try {
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ ok: false, message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const role = String(email).toLowerCase() === adminEmail && adminEmail ? 'admin' : 'user';
    const user = await User.create({ name, email: String(email).toLowerCase(), phone, passwordHash: hash, role });
    const token = sendToken(res, user);
    return res.json({ ok: true, user: user.toJSON(), token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });
  try {
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(400).json({ ok: false, message: 'Invalid credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(400).json({ ok: false, message: 'Invalid credentials' });
    const token = sendToken(res, user);
    return res.json({ ok: true, user: user.toJSON(), token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers && req.headers.authorization;
  const token = (req.cookies && req.cookies[COOKIE_NAME]) || (authHeader ? (authHeader.split(' ')[1] || null) : null) || req.query.token || null;
  if (!token) return res.json({ ok: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.json({ ok: false, message: 'Not authenticated' });
    return res.json({ ok: true, user: user });
  } catch (e) {
    return res.json({ ok: false, message: 'Not authenticated' });
  }
});

// Update profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const updates = {};
    const { name, phone } = req.body || {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    const doc = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    return res.json({ ok: true, user: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ ok: false, message: 'Missing fields' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    const ok = await user.verifyPassword(oldPassword);
    if (!ok) return res.status(400).json({ ok: false, message: 'Invalid password' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: list users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const docs = await User.find().select('-passwordHash').lean();
    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: delete user
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: update user role
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ ok: false, message: 'Invalid role' });
    const doc = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});

module.exports = router;
