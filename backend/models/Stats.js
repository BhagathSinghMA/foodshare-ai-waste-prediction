// models/Stats.js
// Daily stats for food preparation, delivery, and waste tracking
// Used as training data for the AI prediction model

const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema(
  {
    // Date stored as YYYY-MM-DD string for easy lookup
    date: {
      type: String,
      required: true,
      unique: true, // One stats record per day
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    foodPrepared: {
      type: Number,
      default: 0,
      min: 0,
    },
    foodDelivered: {
      type: Number,
      default: 0,
      min: 0,
    },
    // foodWasted = foodPrepared - foodDelivered (computed)
    foodWasted: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Day of week (0=Sunday ... 6=Saturday) - useful for ML features
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    // Month (1-12) - useful for seasonal ML features
    month: {
      type: Number,
      min: 1,
      max: 12,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-compute derived fields before saving
StatsSchema.pre('save', function (next) {
  this.foodWasted = Math.max(0, this.foodPrepared - this.foodDelivered);

  const dateObj = new Date(this.date);
  this.dayOfWeek = dateObj.getDay();
  this.month = dateObj.getMonth() + 1;

  next();
});

module.exports = mongoose.model('Stats', StatsSchema);