# ai-service/main.py
# FastAPI microservice for food waste prediction
# Start: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import numpy as np

from model.predictor import (
    build_features,
    train_model,
    predict_waste,
    save_model,
    load_model,
)

# ─────────────────────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Food Waste Prediction API",
    description="ML microservice for predicting daily food waste using Random Forest regression",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# Pydantic Models (Input/Output schemas)
# ─────────────────────────────────────────────────────────────

class DayStats(BaseModel):
    """Stats for a single day"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    foodPrepared: float = Field(default=0, ge=0)
    foodDelivered: float = Field(default=0, ge=0)
    foodWasted: float = Field(default=0, ge=0)
    dayOfWeek: Optional[int] = Field(default=None, ge=0, le=6)
    month: Optional[int] = Field(default=None, ge=1, le=12)


class PredictionRequest(BaseModel):
    """Payload from Node.js backend"""
    historicalData: List[DayStats] = Field(
        ..., description="Last 7 days of stats"
    )
    sameDayLastYear: Optional[DayStats] = Field(
        default=None, description="Stats from the same day last year"
    )
    today: str = Field(..., description="Today's date in YYYY-MM-DD format")


class PredictionResponse(BaseModel):
    """AI prediction response"""
    predicted_waste: float
    confidence: str    # 'high' | 'medium' | 'low'
    model_used: str
    message: str


class TrainRequest(BaseModel):
    """Training data payload"""
    trainingData: List[DayStats]


# ─────────────────────────────────────────────────────────────
# Global model state
# ─────────────────────────────────────────────────────────────
_model = None

@app.on_event("startup")
async def startup_event():
    """Try to load a pre-trained model on startup"""
    global _model
    _model = load_model()
    if _model:
        logger.info("✅ Pre-trained model loaded")
    else:
        logger.info("ℹ️  No pre-trained model found. Will train on first prediction.")


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Food Waste Prediction AI",
        "model_loaded": _model is not None,
    }


@app.post("/predict-waste", response_model=PredictionResponse)
async def predict_food_waste(payload: PredictionRequest):
    """
    Predict food waste for today based on historical data.

    Input:
    - historicalData: last 7 days of stats
    - sameDayLastYear: optional same-day stats from last year
    - today: target date string

    Output:
    - predicted_waste: estimated kg/units of waste
    """
    global _model

    historical_raw = [d.dict() for d in payload.historicalData]
    same_day_raw = payload.sameDayLastYear.dict() if payload.sameDayLastYear else None
    today_str = payload.today

    try:
        # ── Train model if not loaded or we have new data ──
        confidence = "low"
        model_used = "fallback_average"

        if len(historical_raw) >= 3:
            # Train (or retrain) on available historical data
            trained_model = train_model(historical_raw)

            if trained_model is not None:
                _model = trained_model
                save_model(_model)
                model_used = "random_forest" if len(historical_raw) >= 7 else "linear_regression"
                confidence = "high" if len(historical_raw) >= 7 else "medium"

        # ── Build features for today ──
        features = build_features(historical_raw, same_day_raw, today_str)

        # ── Run prediction ──
        if _model is not None:
            prediction = predict_waste(_model, features)
        else:
            # Fallback: simple 7-day average
            wastes = [d.get('foodWasted', 0) or 0 for d in historical_raw]
            prediction = float(np.mean(wastes)) if wastes else 0.0
            model_used = "fallback_average"
            confidence = "low"

        logger.info(
            f"Prediction for {today_str}: {prediction:.2f} | "
            f"model={model_used} | confidence={confidence}"
        )

        return PredictionResponse(
            predicted_waste=round(prediction, 2),
            confidence=confidence,
            model_used=model_used,
            message=f"Predicted food waste for {today_str} is approximately {prediction:.1f} units.",
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/train")
async def train_model_endpoint(payload: TrainRequest):
    """
    Manually trigger model training with provided data.
    Useful for retraining with full historical dataset.
    """
    global _model

    training_raw = [d.dict() for d in payload.trainingData]

    if len(training_raw) < 2:
        raise HTTPException(status_code=400, detail="At least 2 data points required for training.")

    try:
        trained = train_model(training_raw)
        if trained:
            _model = trained
            save_model(_model)
            return {
                "success": True,
                "message": f"Model trained on {len(training_raw)} records.",
                "samples": len(training_raw),
            }
        raise HTTPException(status_code=500, detail="Training failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info")
async def model_info():
    """Return info about the currently loaded model"""
    return {
        "model_loaded": _model is not None,
        "model_type": str(type(_model).__name__) if _model else None,
    }