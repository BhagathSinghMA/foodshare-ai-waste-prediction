# ai-service/model/predictor.py
# Food waste prediction using Random Forest Regression
# Features: day of week, month, 7-day rolling waste avg, same-day-last-year waste

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_model.pkl')


def build_features(historical_data: list, same_day_last_year: dict, today_str: str) -> np.ndarray:
    """
    Build a feature vector for prediction.

    Features:
    1. day_of_week      (0-6)
    2. month            (1-12)
    3. avg_waste_7d     (average waste over last 7 days)
    4. avg_prepared_7d  (average food prepared last 7 days)
    5. avg_delivered_7d (average food delivered last 7 days)
    6. same_day_ly_waste (same weekday last year waste, or 0 if unavailable)
    7. waste_trend      (last day waste - first day waste)
    """
    today = pd.Timestamp(today_str)

    day_of_week = today.dayofweek          # Mon=0, Sun=6
    month = today.month

    # Compute 7-day rolling averages
    if historical_data:
        wastes = [d.get('foodWasted', 0) or 0 for d in historical_data]
        prepareds = [d.get('foodPrepared', 0) or 0 for d in historical_data]
        delivereds = [d.get('foodDelivered', 0) or 0 for d in historical_data]

        avg_waste = np.mean(wastes) if wastes else 0
        avg_prepared = np.mean(prepareds) if prepareds else 0
        avg_delivered = np.mean(delivereds) if delivereds else 0
        waste_trend = (wastes[-1] - wastes[0]) if len(wastes) > 1 else 0
    else:
        avg_waste = avg_prepared = avg_delivered = waste_trend = 0

    same_day_ly_waste = 0
    if same_day_last_year and isinstance(same_day_last_year, dict):
        same_day_ly_waste = same_day_last_year.get('foodWasted', 0) or 0

    features = np.array([[
        day_of_week,
        month,
        avg_waste,
        avg_prepared,
        avg_delivered,
        same_day_ly_waste,
        waste_trend,
    ]])

    return features


def train_model(training_data: list) -> Pipeline:
    """
    Train a RandomForest model on historical stats data.
    Each record must have: date, foodPrepared, foodDelivered, foodWasted
    """
    if len(training_data) < 3:
        logger.warning("Not enough training data. Using LinearRegression fallback.")
        return _train_linear_fallback(training_data)

    records = []
    for i, record in enumerate(training_data):
        # Use previous records as context window (up to 7 days)
        context_start = max(0, i - 7)
        context = training_data[context_start:i]

        date_str = record.get('date', '')
        same_day_ly = None  # Not available in simple training loop

        features = build_features(context, same_day_ly, date_str)
        target = record.get('foodWasted', 0) or 0

        records.append((features[0], target))

    if not records:
        return _train_linear_fallback(training_data)

    X = np.array([r[0] for r in records])
    y = np.array([r[1] for r in records])

    model = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(
            n_estimators=100,
            max_depth=6,
            min_samples_split=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    model.fit(X, y)
    logger.info(f"RandomForest model trained on {len(records)} samples")
    return model


def _train_linear_fallback(training_data: list) -> Pipeline:
    """Simple linear regression fallback when data is scarce."""
    if not training_data:
        return None

    wastes = [d.get('foodWasted', 0) or 0 for d in training_data]
    prepareds = [d.get('foodPrepared', 0) or 0 for d in training_data]

    X = np.array(prepareds).reshape(-1, 1)
    y = np.array(wastes)

    model = Pipeline([
        ('scaler', StandardScaler()),
        ('lr', LinearRegression()),
    ])
    model.fit(X, y)
    return model


def predict_waste(model: Pipeline, features: np.ndarray) -> float:
    """Run prediction and return a non-negative float."""
    if model is None:
        return 0.0

    prediction = model.predict(features)[0]
    return max(0.0, float(prediction))


def save_model(model: Pipeline, path: str = MODEL_PATH):
    """Persist trained model to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)
    logger.info(f"Model saved to {path}")


def load_model(path: str = MODEL_PATH):
    """Load model from disk. Returns None if not found."""
    if os.path.exists(path):
        logger.info(f"Loading model from {path}")
        return joblib.load(path)
    logger.warning("No saved model found.")
    return None