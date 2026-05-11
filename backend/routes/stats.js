// routes/stats.js
// Dashboard stats + AI prediction bridge

const express  = require('express');
const router   = express.Router();
const Stats    = require('../models/Stats');
const FoodPost = require('../models/FoodPost');
const protect  = require('../middleware/auth');
const aiService = require('../services/aiService');

// ─────────────────────────────────────────────────────────────
// GET /api/stats  — dashboard data + AI prediction
// ─────────────────────────────────────────────────────────────
router.get('/', protect, async function (req, res) {
  try {
    const today     = new Date();
    const todayStr  = today.toISOString().split('T')[0];
    const yesterday = new Date(today - 86400000);
    const yStr      = yesterday.toISOString().split('T')[0];

    const totalDonated   = await FoodPost.countDocuments({});
    const totalDelivered = await FoodPost.countDocuments({ status: 'delivered' });
    const totalExpired   = await FoodPost.countDocuments({ status: 'expired' });

    const yesterdayStats = await Stats.findOne({ date: yStr });

    // Last 7 days labels
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      last7.push(new Date(today - i * 86400000).toISOString().split('T')[0]);
    }
    const weeklyRecords = await Stats.find({ date: { $in: last7 } }).sort({ date: 1 });
    const weeklyChart = last7.map(function (date) {
      const found = weeklyRecords.find(function (s) { return s.date === date; });
      return found || { date, foodPrepared: 0, foodDelivered: 0, foodWasted: 0 };
    });

    // AI prediction
    let predictedWaste = null;
    try {
      const sameDayLY = new Date(today);
      sameDayLY.setFullYear(sameDayLY.getFullYear() - 1);
      const sameDayLYStr  = sameDayLY.toISOString().split('T')[0];
      const sameDayRecord = await Stats.findOne({ date: sameDayLYStr });

      const historicalData = weeklyRecords.map(function (s) {
        return {
          date:          s.date,
          foodPrepared:  s.foodPrepared,
          foodDelivered: s.foodDelivered,
          foodWasted:    s.foodWasted,
          dayOfWeek:     s.dayOfWeek,
          month:         s.month,
        };
      });

      predictedWaste = await aiService.predictWaste({
        historicalData,
        sameDayLastYear: sameDayRecord || null,
        today: todayStr,
      });
    } catch (aiErr) {
      console.warn('AI prediction unavailable:', aiErr.message);
      const avg = weeklyChart.reduce(function (sum, d) { return sum + (d.foodWasted || 0); }, 0) / weeklyChart.length;
      predictedWaste = Math.round(avg);
    }

    const recentPosts = await FoodPost.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('foodName status createdAt createdBy');

    return res.json({
      success: true,
      data: {
        summary: {
          totalDonated,
          totalDelivered,
          totalExpired,
          foodWastedYesterday:       yesterdayStats ? yesterdayStats.foodWasted    : 0,
          foodDistributedYesterday:  yesterdayStats ? yesterdayStats.foodDelivered : 0,
          predictedWasteToday:       predictedWaste,
        },
        weeklyChart,
        recentActivity: recentPosts,
      },
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/stats  — add or update a day's stats
// ─────────────────────────────────────────────────────────────
router.post('/', protect, async function (req, res) {
  try {
    const { date, foodPrepared, foodDelivered } = req.body;
    if (!date || foodPrepared === undefined) {
      return res.status(400).json({ success: false, message: 'date and foodPrepared are required.' });
    }
    const stats = await Stats.findOneAndUpdate(
      { date },
      { date, foodPrepared: parseInt(foodPrepared), foodDelivered: parseInt(foodDelivered) || 0 },
      { upsert: true, new: true, runValidators: true }
    );
    return res.status(201).json({ success: true, message: 'Stats saved.', data: stats });
  } catch (error) {
    console.error('Stats save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save stats.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/stats/history  — date-range history
// ─────────────────────────────────────────────────────────────
router.get('/history', protect, async function (req, res) {
  try {
    const days  = parseInt(req.query.days) || 30;
    const today = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      dates.push(new Date(today - i * 86400000).toISOString().split('T')[0]);
    }
    const records = await Stats.find({ date: { $in: dates } }).sort({ date: 1 });
    const history = dates.map(function (date) {
      const found = records.find(function (s) { return s.date === date; });
      return found || { date, foodPrepared: 0, foodDelivered: 0, foodWasted: 0 };
    });
    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

module.exports = router;