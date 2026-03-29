\# 🌾 AI-Based Smart Crop Advisory System



\## 📌 Overview



This project predicts the most suitable crop based on environmental conditions using Machine Learning.



\## 🚀 Features



\* Crop prediction using ML model

\* FastAPI backend

\* Simple frontend UI

\* Real-time prediction



\## 🛠 Tech Stack



\* Python, FastAPI

\* Scikit-learn

\* HTML, CSS, JavaScript



\## ⚙️ How to Run



\### Backend



cd backend

uvicorn app:app --reload



\### Frontend



Open frontend/index.html in browser



\## 📡 API Endpoint



POST /predict



Input:

{

"temperature": 30,

"humidity": 70,

"ph": 6.5,

"rainfall": 120

}



Output:

{

"recommended\_crop": "Rice"

}



\## 📈 Future Improvements



\* Real dataset integration

\* Weather API

\* Mobile app



