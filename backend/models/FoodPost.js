// models/FoodPost.js
// Food donation posts - core entity of the platform

const mongoose = require('mongoose');

const FoodPostSchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [100, 'Food name cannot exceed 100 characters'],
    },
    quantity: {
      type: String,
      required: [true, 'Quantity is required'],
      trim: true,
      // e.g. "10 kg", "50 plates", "5 boxes"
    },
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    imageUrl: {
      type: String,
      default: null, // Optional image upload
    },
    imagePublicId: {
      type: String,
      default: null, // Cloudinary public ID for deletion
    },
    // Lifecycle status of the food post
    status: {
      type: String,
      enum: ['available', 'picked', 'delivered', 'expired'],
      default: 'available',
    },
    // Who posted this food donation
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Who picked this food for delivery
    pickedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Timestamps for each status change
    pickedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by status and deadline
FoodPostSchema.index({ status: 1, deadline: 1 });
FoodPostSchema.index({ createdBy: 1 });
FoodPostSchema.index({ pickedBy: 1 });

// Virtual to check if post is expired (deadline passed and not delivered)
FoodPostSchema.virtual('isExpired').get(function () {
  return this.status !== 'delivered' && new Date() > this.deadline;
});

module.exports = mongoose.model('FoodPost', FoodPostSchema);