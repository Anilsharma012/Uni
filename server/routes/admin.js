const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats/overview?range=7d|30d|90d
router.get('/stats/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const range = String(req.query.range || '30d').toLowerCase();
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    // Totals
    const [totalRevenueAgg, totalOrders, totalUsers] = await Promise.all([
      Order.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } }]),
      Order.countDocuments(),
      User.countDocuments(),
    ]);
    const totals = {
      revenue: (totalRevenueAgg[0]?.total || 0),
      orders: totalOrders || 0,
      users: totalUsers || 0,
    };

    // Last month and previous month comparisons (calendar months)
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const lastMonthEnd = new Date(firstOfThisMonth.getTime() - 1);
    const prevMonthEnd = new Date(firstOfLastMonth.getTime() - 1);

    const [lastMonthAgg, prevMonthAgg, lastMonthOrdersCount, prevMonthOrdersCount] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: firstOfLastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: firstOfPrevMonth, $lte: prevMonthEnd } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: firstOfLastMonth, $lte: lastMonthEnd } }),
      Order.countDocuments({ createdAt: { $gte: firstOfPrevMonth, $lte: prevMonthEnd } }),
    ]);

    const lastMonth = { revenue: lastMonthAgg[0]?.total || 0, orders: lastMonthOrdersCount || 0 };
    const prevMonth = { revenue: prevMonthAgg[0]?.total || 0, orders: prevMonthOrdersCount || 0 };

    // Series for selected range (daily revenue and orders)
    const seriesAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $ifNull: ['$total', 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates with zeros
    const fillSeries = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const found = seriesAgg.find((d) => d._id === key);
      fillSeries.push({ date: key, revenue: found?.revenue || 0, orders: found?.orders || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return res.json({ ok: true, data: { totals, lastMonth, prevMonth, series: fillSeries } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// GET /api/admin/orders/:id -> enriched order detail
router.get('/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Order.findById(id).lean();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });

    const address = doc.address || '';
    const detail = {
      id: String(doc._id),
      createdAt: doc.createdAt,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
      totals: { total: Number(doc.total || 0) },
      shipping: {
        name: doc.name || '',
        phone: doc.phone || '',
        address1: address,
        address2: '',
        city: doc.city || '',
        state: doc.state || '',
        pincode: doc.pincode || '',
      },
      items: Array.isArray(doc.items)
        ? doc.items.map((it) => ({
            productId: it.id || it.productId || '',
            title: it.title || it.name || 'Item',
            image: it.image || '',
            price: Number(it.price || 0),
            qty: Number(it.qty || 0),
            variant: it.variant || null,
          }))
        : [],
    };

    return res.json({ ok: true, data: detail });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
