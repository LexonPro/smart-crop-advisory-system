from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import joblib
import numpy as np
import os

app = FastAPI(title="Smart Crop Advisor API")

# =========================
# 🌐 CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 🚨 VALIDATION HANDLER
# =========================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Invalid input. Please check values."
        }
    )

# =========================
# 📦 LOAD MODEL
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "models", "model.pkl")

model = None
try:
    model = joblib.load(model_path)
    print("✅ Model loaded successfully")
except Exception as e:
    print("❌ Model load failed:", e)

# =========================
# 📊 INPUT MODEL
# =========================
class CropInput(BaseModel):
    N: float = Field(..., ge=0, le=150)
    P: float = Field(..., ge=0, le=150)
    K: float = Field(..., ge=0, le=150)
    temperature: float = Field(..., ge=0, le=60)
    humidity: float = Field(..., ge=0, le=100)
    ph: float = Field(..., ge=0, le=14)
    rainfall: float = Field(..., ge=0, le=300)

    @validator("*", pre=True)
    def no_empty(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            raise ValueError("Field cannot be empty")
        return float(v)

# =========================
# 🏠 ROOT (for UptimeRobot)
# =========================
@app.get("/")
def home():
    return {"status": "ok", "message": "Backend running 🚀"}

# =========================
# 🌾 PREDICT
# =========================
@app.post("/predict")
def predict(data: CropInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # Optional logic
        if data.ph > 9:
            return {
                "recommended_crop": "Soil too alkaline",
                "status": "warning"
            }

        if data.ph < 4:
            return {
                "recommended_crop": "Soil too acidic",
                "status": "warning"
            }

        features = np.array([[
            data.N,
            data.P,
            data.K,
            data.temperature,
            data.humidity,
            data.ph,
            data.rainfall
        ]])

       probabilities = model.predict_proba(features)[0]
classes = model.classes_
top3_indices = np.argsort(probabilities)[::-1][:3]

top3 = [
    {
        "crop": str(classes[i]),
        "confidence": round(float(probabilities[i]), 4)
    }
    for i in top3_indices
]

return {
    "top_predictions": top3,
    "status": "success"
}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# 🌱 FERTILIZER
# =========================
@app.post("/fertilizer")
def fertilizer(data: dict):
    crop = str(data.get("crop", "")).strip().lower()

    if not crop:
        raise HTTPException(status_code=400, detail="Crop name required")

    fertilizer_map = {
        "rice": "Urea + DAP",
        "wheat": "Urea + Potash",
        "maize": "Balanced NPK",
        "cotton": "High Nitrogen"
    }

    return {
        "recommended_fertilizer": fertilizer_map.get(crop, "General NPK"),
        "status": "success"
    }

# =========================
# 💧 WATER
# =========================
@app.post("/water")
def water(data: dict):
    rainfall = data.get("rainfall")

    if rainfall is None:
        raise HTTPException(status_code=400, detail="Rainfall required")

    try:
        rainfall = float(rainfall)
    except:
        raise HTTPException(status_code=400, detail="Invalid rainfall")

    if rainfall > 200:
        advice = "No irrigation needed"
    elif rainfall < 100:
        advice = "Irrigate soon"
    else:
        advice = "Moderate irrigation"

    return {"water_advice": advice, "status": "success"}

# =========================
# 🚀 RUN FOR RENDER
# =========================
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)