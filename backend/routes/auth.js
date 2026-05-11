// routes/auth.js
// Authentication: signup, login, get current user

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = require('../middleware/auth');

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

function sendTokenResponse(user, statusCode, res) {
  const token = generateToken(user._id);
  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:             user._id,
      name:           user.name,
      email:          user.email,
      deliveredCount: user.deliveredCount,
      donatedCount:   user.donatedCount,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }
      const user = await User.create({ name, email, password });
      return sendTokenResponse(user, 201, res);
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      return sendTokenResponse(user, 200, res);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
router.get('/me', protect, async function (req, res) {
  try {
    const user = await User.findById(req.user.id);
    return res.json({
      success: true,
      user: {
        id:             user._id,
        name:           user.name,
        email:          user.email,
        deliveredCount: user.deliveredCount,
        donatedCount:   user.donatedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;