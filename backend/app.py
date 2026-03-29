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
# 🚨 GLOBAL VALIDATION ERROR HANDLER
# Returns clear alert messages for missing/out-of-range fields
# =========================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = []
    for error in exc.errors():
        field = error["loc"][-1]  # Get field name
        err_type = error["type"]

        field_labels = {
            "N": "Nitrogen (N)",
            "P": "Phosphorus (P)",
            "K": "Potassium (K)",
            "temperature": "Temperature",
            "humidity": "Humidity",
            "ph": "pH",
            "rainfall": "Rainfall"
        }
        label = field_labels.get(str(field), str(field))

        field_ranges = {
            "N": "0–150",
            "P": "0–150",
            "K": "0–150",
            "temperature": "0–60 °C",
            "humidity": "0–100 %",
            "ph": "0–14",
            "rainfall": "0–300 mm"
        }

        if err_type in ("missing", "value_error.missing"):
            errors.append(f"⚠️ '{label}' cannot be empty. Please enter a value.")
        elif err_type in ("value_error", "type_error", "type_error.float"):
            errors.append(f"⚠️ '{label}' must be a valid number.")
        elif "greater_than_equal" in err_type or "less_than_equal" in err_type or "range" in err_type:
            rng = field_ranges.get(str(field), "valid range")
            errors.append(f"⚠️ '{label}' is out of range. Allowed: {rng}.")
        else:
            # Fallback: show range hint
            rng = field_ranges.get(str(field), "")
            rng_hint = f" Allowed range: {rng}." if rng else ""
            errors.append(f"⚠️ Invalid value for '{label}'.{rng_hint}")

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "alerts": errors,
            "message": "Please fix the highlighted fields and try again."
        }
    )


# =========================
# 📦 LOAD MODEL
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "models", "model.pkl")

try:
    model = joblib.load(model_path)
    print("✅ Model loaded successfully")
except Exception as e:
    print("❌ Model load failed:", e)
    model = None


# =========================
# 📊 STRICT INPUT MODEL
# =========================
class CropInput(BaseModel):
    N: float = Field(..., ge=0, le=150, description="Nitrogen content (0–150)")
    P: float = Field(..., ge=0, le=150, description="Phosphorus content (0–150)")
    K: float = Field(..., ge=0, le=150, description="Potassium content (0–150)")
    temperature: float = Field(..., ge=0, le=60, description="Temperature in °C (0–60)")
    humidity: float = Field(..., ge=0, le=100, description="Humidity % (0–100)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH (0–14)")
    rainfall: float = Field(..., ge=0, le=300, description="Rainfall in mm (0–300)")

    # Block empty strings and None before type coercion
    @validator("N", "P", "K", "temperature", "humidity", "ph", "rainfall", pre=True)
    def no_empty_or_none(cls, v, field):
        field_labels = {
            "N": "Nitrogen (N)",
            "P": "Phosphorus (P)",
            "K": "Potassium (K)",
            "temperature": "Temperature",
            "humidity": "Humidity",
            "ph": "pH",
            "rainfall": "Rainfall"
        }
        label = field_labels.get(field.name, field.name)

        if v is None or (isinstance(v, str) and v.strip() == ""):
            raise ValueError(f"'{label}' cannot be empty. Please enter a value.")

        try:
            return float(v)
        except (ValueError, TypeError):
            raise ValueError(f"'{label}' must be a valid number.")

    class Config:
        # Extra fields not allowed
        extra = "forbid"


# =========================
# 🏠 ROOT
# =========================
@app.get("/")
def home():
    return {"message": "✅ Backend running"}


# =========================
# 🌾 PREDICT
# =========================
@app.post("/predict")
def predict(data: CropInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # Extra logical validation (real-world constraints)
        if data.ph > 9:
            return {
                "recommended_crop": "❌ Soil too alkaline",
                "advice": "Reduce pH using organic compost or sulfur",
                "status": "warning"
            }

        if data.ph < 4:
            return {
                "recommended_crop": "❌ Soil too acidic",
                "advice": "Add lime to increase pH",
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

        prediction = model.predict(features)[0]

        return {
            "recommended_crop": str(prediction),
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction Error: {str(e)}")


# =========================
# 🌱 FERTILIZER
# =========================
@app.post("/fertilizer")
def fertilizer(data: dict):
    crop = data.get("crop", "")

    # Empty check
    if not crop or not str(crop).strip():
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "alerts": ["⚠️ 'Crop name' cannot be empty. Please provide a crop name."]
            }
        )

    crop = crop.strip().lower()

    fertilizer_map = {
        "rice": "Urea + DAP in split doses",
        "wheat": "Urea + Potash in stages",
        "maize": "Balanced NPK fertilizer",
        "cotton": "High Nitrogen fertilizer"
    }

    return {
        "recommended_fertilizer": fertilizer_map.get(crop, "General fertilizer (NPK mix)"),
        "status": "success"
    }


# =========================
# 💧 WATER
# =========================
@app.post("/water")
def water(data: dict):
    rainfall = data.get("rainfall")

    # Empty check
    if rainfall is None or str(rainfall).strip() == "":
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "alerts": ["⚠️ 'Rainfall' cannot be empty. Please enter a value."]
            }
        )

    try:
        rainfall = float(rainfall)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "alerts": ["⚠️ 'Rainfall' must be a valid number."]
            }
        )

    # Range check
    if rainfall < 0 or rainfall > 300:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "alerts": ["⚠️ 'Rainfall' is out of range. Allowed: 0–300 mm."]
            }
        )

    if rainfall > 200:
        advice = "No irrigation needed"
    elif rainfall < 100:
        advice = "Irrigate within 2-3 days"
    else:
        advice = "Moderate irrigation required"

    return {"water_advice": advice, "status": "success"}