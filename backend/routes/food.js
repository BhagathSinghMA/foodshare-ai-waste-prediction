// routes/food.js
// Food post CRUD + pick/deliver lifecycle endpoints

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FoodPost = require('../models/FoodPost');
const User = require('../models/User');

// protect is a plain function exported as module.exports = protect
const protect = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────
// Multer - local disk storage
// ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ok = /jpeg|jpg|png|webp/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

// ─────────────────────────────────────────────────────────────
// POST /api/food  — create a new food donation post
// ─────────────────────────────────────────────────────────────
router.post('/', protect, upload.single('image'), async function (req, res) {
  try {
    const { foodName, quantity, address, phone, deadline } = req.body;

    if (!foodName || !quantity || !address || !phone || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: foodName, quantity, address, phone, deadline.',
      });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be a valid future date.',
      });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = req.protocol + '://' + req.get('host') + '/uploads/' + req.file.filename;
    }

    const foodPost = await FoodPost.create({
      foodName,
      quantity,
      address,
      phone,
      deadline: deadlineDate,
      imageUrl,
      createdBy: req.user.id,
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { donatedCount: 1 } });
    await foodPost.populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Food donation posted successfully!',
      data: foodPost,
    });
  } catch (error) {
    console.error('Create food post error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create food post.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/food  — list posts, auto-expire overdue ones first
// ─────────────────────────────────────────────────────────────
router.get('/', protect, async function (req, res) {
  try {
    // Auto-expire before returning list
    await FoodPost.updateMany(
      { status: { $in: ['available', 'picked'] }, deadline: { $lt: new Date() } },
      { status: 'expired' }
    );

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const posts = await FoodPost.find(filter)
      .populate('createdBy', 'name email')
      .populate('pickedBy',  'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FoodPost.countDocuments(filter);

    return res.json({ success: true, count: posts.length, total, page, data: posts });
  } catch (error) {
    console.error('Get food posts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch food posts.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/food/my-orders  — current user's picked + delivered
// ─────────────────────────────────────────────────────────────
router.get('/my-orders', protect, async function (req, res) {
  try {
    const orders = await FoodPost.find({
      pickedBy: req.user.id,
      status: { $in: ['picked', 'delivered'] },
    })
      .populate('createdBy', 'name email')
      .sort({ pickedAt: -1 });

    return res.json({
      success: true,
      picked:    orders.filter(function (o) { return o.status === 'picked'; }),
      delivered: orders.filter(function (o) { return o.status === 'delivered'; }),
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/food/pick/:id  — pick up food for delivery
// ─────────────────────────────────────────────────────────────
router.post('/pick/:id', protect, async function (req, res) {
  try {
    const foodPost = await FoodPost.findById(req.params.id);

    if (!foodPost) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }
    if (foodPost.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Cannot pick food with status: ' + foodPost.status,
      });
    }
    if (new Date() > foodPost.deadline) {
      foodPost.status = 'expired';
      await foodPost.save();
      return res.status(400).json({ success: false, message: 'This food post has expired.' });
    }

    foodPost.status   = 'picked';
    foodPost.pickedBy = req.user.id;
    foodPost.pickedAt = new Date();
    await foodPost.save();
    await foodPost.populate('createdBy', 'name email');
    await foodPost.populate('pickedBy',  'name email');

    return res.json({
      success: true,
      message: 'Food picked up! Please deliver as soon as possible.',
      data: foodPost,
    });
  } catch (error) {
    console.error('Pick food error:', error);
    return res.status(500).json({ success: false, message: 'Failed to pick food.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/food/deliver/:id  — mark picked food as delivered
// ─────────────────────────────────────────────────────────────
router.post('/deliver/:id', protect, async function (req, res) {
  try {
    const foodPost = await FoodPost.findById(req.params.id);

    if (!foodPost) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }
    if (foodPost.status !== 'picked') {
      return res.status(400).json({ success: false, message: 'Only picked food can be delivered.' });
    }
    if (foodPost.pickedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the delivery person can mark this delivered.' });
    }

    foodPost.status      = 'delivered';
    foodPost.deliveredAt = new Date();
    await foodPost.save();

    await User.findByIdAndUpdate(req.user.id, { $inc: { deliveredCount: 1 } });
    await foodPost.populate('createdBy', 'name email');
    await foodPost.populate('pickedBy',  'name email');

    return res.json({
      success: true,
      message: 'Food delivered! Thank you for reducing food waste.',
      data: foodPost,
    });
  } catch (error) {
    console.error('Deliver food error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as delivered.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/food/:id  — single food post
// ─────────────────────────────────────────────────────────────
router.get('/:id', protect, async function (req, res) {
  try {
    const foodPost = await FoodPost.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('pickedBy',  'name email');

    if (!foodPost) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }
    return res.json({ success: true, data: foodPost });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch food post.' });
  }
});

module.exports = router;