import numpy as np
import joblib
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import datetime
import random

from database import SessionLocal, engine, Base
from models import SensorReading

model = joblib.load("../ai-model/forecast_model.pkl")

# ---------------- APP ---------------- #

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

# ---------------- SENSOR STORE ---------------- #

# FIX: Removed duplicate definition (was declared twice before)
sensor_data_store = {
    "temperature": 27.0,
    "humidity": 65.0,
    "pressure": 1012.0,
    "soilMoisture": 45.0
}

sensor_history = []

# ---------------- HELPERS ---------------- #

def drift(value, minimum, maximum, step):
    value += random.uniform(-step, step)
    return round(max(minimum, min(maximum, value)), 2)

# ---------------- ROOT ---------------- #

@app.get("/")
def root():
    return {"message": "AI Environmental Backend Running"}

# ---------------- SENSOR DATA ---------------- #

# FIX: Removed the first incomplete duplicate of this route
@app.get("/sensor-data")
def get_sensor_data():

    API_KEY = "c62541aa91a69f49ee895798ff17d913"
    CITY = "Bangalore"

    url = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"

    # FIX: Added error handling for the external API call
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Weather API unavailable: {str(e)}")

    # FIX: Guard against missing keys in the API response
    if "weather" not in data or "main" not in data:
        raise HTTPException(status_code=502, detail="Unexpected response from Weather API")

    weather_main = data["weather"][0]["main"]

    # FIX: Drift soil moisture using the store value (was using random.uniform directly,
    # ignoring the drift function's continuity purpose)
    sensor_data_store["soilMoisture"] = drift(
        sensor_data_store["soilMoisture"],
        20,
        80,
        0.5
    )

    # FIX: Update the store with real API values so the DB save below is consistent
    sensor_data_store["temperature"] = data["main"]["temp"]
    sensor_data_store["humidity"] = data["main"]["humidity"]
    sensor_data_store["pressure"] = data["main"]["pressure"]

    sensor_data = {
        "temperature": sensor_data_store["temperature"],
        "humidity": sensor_data_store["humidity"],
        "pressure": sensor_data_store["pressure"],
        "soilMoisture": sensor_data_store["soilMoisture"],
        "weather": weather_main,
        "description": data["weather"][0]["description"],
        "clouds": data["clouds"]["all"],
        "windSpeed": data["wind"]["speed"]
    }

    # FIX: Use try/finally to ensure DB is always closed even if an error occurs
    db = SessionLocal()
    try:
        reading = SensorReading(
            # FIX: Was saving from sensor_data_store before it was updated with real values
            # Now saving from sensor_data which has the correct live values
            temperature=sensor_data["temperature"],
            humidity=sensor_data["humidity"],
            soil_moisture=sensor_data["soilMoisture"],
            pressure=sensor_data["pressure"]
        )
        db.add(reading)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

    sensor_history.append(sensor_data)

    # FIX: Added the missing return statement (original first route had no return)
    return sensor_data

# ---------------- AI PREDICTION ---------------- #

@app.get("/predict")
def predict():

    # FIX: Added guard — was crashing with IndexError if /predict was called
    # before /sensor-data had been hit even once
    if not sensor_history:
        raise HTTPException(
            status_code=400,
            detail="No sensor data available yet. Call /sensor-data first."
        )

    latest = sensor_history[-1]

    temperature = latest["temperature"]
    humidity = latest["humidity"]
    soil = latest["soilMoisture"]
    weather = latest["weather"]

    # SMART RAIN DETECTION
    rain_keywords = ["rain", "drizzle", "thunderstorm", "shower", "mist"]
    weather_lower = weather.lower()
    is_raining = any(word in weather_lower for word in rain_keywords)

    # RAIN PREDICTION
    if is_raining or humidity > 85:
        rain_prediction = "Heavy Rain Expected"
    elif humidity > 70:
        rain_prediction = "Possible Rain"
    else:
        rain_prediction = "No Rain Expected"

    # SOIL STATUS
    if soil < 30:
        soil_status = "Dry"
    elif soil < 60:
        soil_status = "Optimal"
    else:
        soil_status = "Wet"

    # IRRIGATION ADVICE
    if soil < 30:
        irrigation = "Irrigation strongly recommended"
    elif soil < 60:
        irrigation = "Moderate irrigation sufficient"
    else:
        irrigation = "No irrigation needed"

    return {
        "rainPrediction": rain_prediction,
        "soilStatus": soil_status,
        "irrigationAdvice": irrigation
    }

# ---------------- HISTORY ---------------- #

@app.get("/history")
def history():
    # FIX: Added try/finally so DB is always closed
    db = SessionLocal()
    try:
        readings = db.query(SensorReading).all()
        return readings
    finally:
        db.close()