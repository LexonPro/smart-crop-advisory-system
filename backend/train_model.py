import pandas as pd
import numpy as np
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# =========================
# 📂 LOAD DATA
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, "models", "Crop_recommendation.csv")

df = pd.read_csv(csv_path)

# =========================
# 🧹 CLEAN DATA
# =========================
df = df.dropna()

# =========================
# 🎯 FEATURES & LABEL
# =========================
X = df[['N','P','K','temperature','humidity','ph','rainfall']]
y = df['label']

# =========================
# 🔀 SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# =========================
# 🤖 MODEL (HIGH ACCURACY)
# =========================
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    random_state=42
)

model.fit(X_train, y_train)

# =========================
# 📊 EVALUATE
# =========================
y_pred = model.predict(X_test)

acc = accuracy_score(y_test, y_pred)
print("🔥 Accuracy:", acc)

# =========================
# 💾 SAVE MODEL
# =========================
model_path = os.path.join(BASE_DIR, "models", "model.pkl")
joblib.dump(model, model_path)

print("✅ Model saved successfully")