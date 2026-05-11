# 🌱 FoodShare — AI-Based Food Waste Prediction & Redistribution Platform

> Reduce waste. Feed communities. Powered by Machine Learning.

FoodShare is a full-stack mobile platform that connects food donors with
delivery volunteers using real-time coordination and AI-powered waste
prediction. Built with React Native, Node.js, and Python FastAPI.

---

## 🧠 How It Works

1. **Donor** posts surplus food with photo, quantity, address and deadline
2. **Volunteer** sees available food nearby and picks it up
3. **AI** predicts how much food will be wasted today based on historical data
4. **Dashboard** shows live stats, charts, and AI predictions

---

## 🏗️ Architecture

| Layer        | Technology                         |
| ------------ | ---------------------------------- |
| Mobile App   | React Native + Expo SDK 51         |
| Backend API  | Node.js + Express + MongoDB        |
| AI Service   | Python + FastAPI + scikit-learn    |
| Auth         | JWT + bcryptjs + Expo SecureStore  |
| Image Upload | Multer (local) / Cloudinary (prod) |

---

## ✨ Features

- 🔐 JWT authentication with secure token storage
- 🍱 Post food donations with image, quantity, deadline
- 🚴 Pick up and deliver food with one tap
- 📊 Dashboard with live charts (7-day trends)
- 🤖 AI predicts today's food waste (Random Forest ML)
- ⏰ Auto-expire posts past deadline (hourly cron job)
- 📱 Works on Android and iOS via Expo Go

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.9
- MongoDB (local or Atlas)
- Expo Go app on your phone

### 1. Clone the repo

\```bash
git clone https://github.com/YOUR_USERNAME/foodshare-ai-waste-prediction.git
cd foodshare-ai-waste-prediction
\```

### 2. Backend

\```bash
cd backend
cp .env.example .env # fill in your values
npm install
node seed/sampleData.js # seed sample data
npm run dev
\```

### 3. AI Service

\```bash
cd ai-service
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
\```

### 4. Frontend

\```bash
cd frontend
npm install

# Edit src/api/axios.js → set BASE_URL to your PC's LAN IP

npx expo start --clear
\```

---

## 🔑 Test Credentials (after seeding)

| Email             | Password    |
| ----------------- | ----------- |
| arjun@example.com | password123 |
| priya@example.com | password123 |

---

## 📡 API Endpoints

### Auth

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| POST   | /api/auth/signup | Register new user |
| POST   | /api/auth/login  | Login + get JWT   |
| GET    | /api/auth/me     | Get current user  |

### Food

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| POST   | /api/food             | Create food post |
| GET    | /api/food             | List food posts  |
| GET    | /api/food/my-orders   | My pickups       |
| POST   | /api/food/pick/:id    | Pick up food     |
| POST   | /api/food/deliver/:id | Mark delivered   |

### Stats + AI

| Method | Endpoint       | Description               |
| ------ | -------------- | ------------------------- |
| GET    | /api/stats     | Dashboard + AI prediction |
| POST   | /api/stats     | Add daily stats           |
| POST   | /predict-waste | AI waste prediction       |

---

## 🤖 AI Model

- **Algorithm**: Random Forest Regression (fallback: Linear Regression)
- **Features**: day of week, month, 7-day rolling averages, same-day last year
- **Framework**: scikit-learn + FastAPI
- **Auto-saves**: model persisted to disk after each training

---

## 📁 Project Structure

\```
foodshare-ai-waste-prediction/
├── backend/
│ ├── config/ # MongoDB connection
│ ├── middleware/ # JWT auth middleware
│ ├── models/ # User, FoodPost, Stats schemas
│ ├── routes/ # auth, food, stats endpoints
│ ├── services/ # AI service connector
│ ├── seed/ # Sample data seeder
│ └── server.js
├── ai-service/
│ ├── model/ # Random Forest predictor
│ ├── main.py # FastAPI app
│ └── requirements.txt
└── frontend/
├── src/
│ ├── api/ # Axios instance
│ ├── context/ # Auth context
│ ├── navigation/ # Stack + Tab navigators
│ ├── screens/ # All 6 screens
│ └── theme/ # Design tokens
└── App.js
\```

---

## 🌍 Environment Variables

\```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/food_waste_platform
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8000
\```

---

## 📸 Screenshots

![Available Food Page](https://raw.githubusercontent.com/BhagathSinghMA/foodshare-ai-waste-prediction/main/available%20food%20page.png)
![Available Food Page](https://github.com/BhagathSinghMA/foodshare-ai-waste-prediction/blob/main/donate%20food%20page.png)
![Available Food Page](https://github.com/BhagathSinghMA/foodshare-ai-waste-prediction/blob/main/homepage.png)
![Available Food Page](https://github.com/BhagathSinghMA/foodshare-ai-waste-prediction/blob/main/my%20deliveries%20page.png)
---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

MIT
