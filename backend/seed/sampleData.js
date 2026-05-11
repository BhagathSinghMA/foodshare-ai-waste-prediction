// seed/sampleData.js
// Run: node seed/sampleData.js
// Seeds MongoDB with sample users, food posts, and stats for testing

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Copy models directly for seeding ──
const UserSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  deliveredCount: { type: Number, default: 0 },
  donatedCount: { type: Number, default: 0 },
}, { timestamps: true });

const FoodPostSchema = new mongoose.Schema({
  foodName: String, quantity: String, address: String,
  phone: String, deadline: Date, imageUrl: String,
  status: { type: String, default: 'available' },
  createdBy: mongoose.Schema.Types.ObjectId,
  pickedBy: mongoose.Schema.Types.ObjectId,
  pickedAt: Date, deliveredAt: Date,
}, { timestamps: true });

const StatsSchema = new mongoose.Schema({
  date: String, foodPrepared: Number, foodDelivered: Number, foodWasted: Number,
  dayOfWeek: Number, month: Number,
});

const User = mongoose.model('User', UserSchema);
const FoodPost = mongoose.model('FoodPost', FoodPostSchema);
const Stats = mongoose.model('Stats', StatsSchema);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/food_waste_platform';

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB...');

  // Clear collections
  await User.deleteMany({});
  await FoodPost.deleteMany({});
  await Stats.deleteMany({});
  console.log('Cleared existing data.');

  // ── Create Users ──
  const salt = await bcrypt.genSalt(12);
  const hashedPw = await bcrypt.hash('password123', salt);

  const users = await User.insertMany([
    { name: 'Arjun Kumar', email: 'arjun@example.com', password: hashedPw, deliveredCount: 5, donatedCount: 3 },
    { name: 'Priya Sharma', email: 'priya@example.com', password: hashedPw, deliveredCount: 12, donatedCount: 8 },
    { name: 'Ravi Patel', email: 'ravi@example.com', password: hashedPw, deliveredCount: 2, donatedCount: 6 },
  ]);
  console.log(`Created ${users.length} users.`);

  // ── Create Food Posts ──
  const now = new Date();
  const future = (hours) => new Date(now.getTime() + hours * 3600000);
  const past = (hours) => new Date(now.getTime() - hours * 3600000);

  const foodPosts = await FoodPost.insertMany([
    {
      foodName: 'Biryani and Raita',
      quantity: '20 plates',
      address: '12, Anna Nagar, Chennai - 600040',
      phone: '+91 98765 43210',
      deadline: future(4),
      imageUrl: null,
      status: 'available',
      createdBy: users[0]._id,
    },
    {
      foodName: 'Dal Rice and Sabzi',
      quantity: '30 meals',
      address: '5, T. Nagar, Chennai - 600017',
      phone: '+91 87654 32109',
      deadline: future(6),
      imageUrl: null,
      status: 'available',
      createdBy: users[1]._id,
    },
    {
      foodName: 'Bread Loaves',
      quantity: '15 loaves',
      address: '8, Adyar, Chennai - 600020',
      phone: '+91 76543 21098',
      deadline: future(2),
      imageUrl: null,
      status: 'picked',
      createdBy: users[2]._id,
      pickedBy: users[0]._id,
      pickedAt: new Date(),
    },
    {
      foodName: 'Idli and Sambar',
      quantity: '50 portions',
      address: '22, Velachery, Chennai - 600042',
      phone: '+91 65432 10987',
      deadline: past(1),
      imageUrl: null,
      status: 'expired',
      createdBy: users[0]._id,
    },
    {
      foodName: 'Fresh Fruits Basket',
      quantity: '10 kg mix',
      address: '3, Nungambakkam, Chennai - 600034',
      phone: '+91 90000 11111',
      deadline: future(8),
      imageUrl: null,
      status: 'delivered',
      createdBy: users[1]._id,
      pickedBy: users[2]._id,
      pickedAt: past(3),
      deliveredAt: past(1),
    },
  ]);
  console.log(`Created ${foodPosts.length} food posts.`);

  // ── Create Stats (Last 30 days) ──
  const statsData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const month = d.getMonth() + 1;

    // Simulate realistic data with weekday/weekend variation
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 80 : 120;
    const foodPrepared = base + Math.floor(Math.random() * 40);
    const foodDelivered = Math.floor(foodPrepared * (0.6 + Math.random() * 0.3));
    const foodWasted = Math.max(0, foodPrepared - foodDelivered);

    statsData.push({ date: dateStr, foodPrepared, foodDelivered, foodWasted, dayOfWeek, month });
  }

  await Stats.insertMany(statsData);
  console.log(`Created ${statsData.length} daily stats records.`);

  console.log('\n✅ Seed complete!');
  console.log('Test credentials:');
  console.log('  Email: arjun@example.com | Password: password123');
  console.log('  Email: priya@example.com | Password: password123');

  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });