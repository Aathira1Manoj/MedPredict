# 🏥 MediPredict – Disease Prediction System with Chatbot

MediPredict is a full-stack AI-powered healthcare application that predicts diseases based on user symptoms and provides intelligent chatbot assistance for better understanding and guidance.

---

## 🚀 Live Demo  
- 🌐 Frontend: https://med-predict-two.vercel.app/  
- ⚙️ Backend API: https://medipredict-9st2.onrender.com  

---

## 📌 Features  
- 🧠 Disease Prediction  
  - Predicts possible diseases based on user-input symptoms  
  - Uses machine learning models for accurate classification  
- 🤖 AI Chatbot  
  - Provides interactive health-related responses  
  - Enhances user understanding of predicted conditions  
- ⚡ FastAPI Backend  
  - High-performance REST APIs  
  - Handles model inference and data processing  
- 🎨 React Frontend  
  - Clean and responsive UI  
  - User-friendly input forms and result display  
- ☁️ Deployment  
  - Frontend hosted on Vercel  
  - Backend deployed on Render  

---

## 🏗️ Tech Stack  
**Frontend**  
- React.js  
- HTML, CSS, JavaScript  

**Backend**  
- FastAPI  
- Python  

**Machine Learning**  
- Scikit-learn / ML models  
- Pandas, NumPy  

**Deployment**  
- Vercel (Frontend)  
- Render (Backend)  

---

## 📂 Project Structure  

```
MedPredict/  
│  
├── data  
│  └── FAQ.txt  
│  └── diets_cleaned.csv  
├── frontend_react/  
│  ├── src/  
│    └── App.jsx  
├── output  
│  └── catboost_disease_model.cbm  
│  └── disease_map.pkl  
│  └── feature_cols.pkl  
│  └── label_encoder.pkl  
│  └── symptom_cols.pkl  
├── main.py  
├── requirements.txt  
└── README.md  
```

---

## ⚙️ Installation & Setup  
1️⃣ **Clone the Repository**  
```
git clone https://github.com/Aathira1Manoj/MedPredict.git  
cd MedPredict
```

---

2️⃣ **Backend Setup (FastAPI)**  
```
cd backend  

# Create virtual environment
python -m venv venv

# Activate environment
venv\Scripts\activate   # Windows
source venv/bin/activate # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

Backend runs on:  
```
http://127.0.0.1:8000
```

---

3️⃣ **Frontend Setup (React)**
```
cd frontend

# Install dependencies
npm install

# Run app
npm start
```

Frontend runs on:  
```
http://localhost:3000
```

---

## 🧪 How It Works
1. User enters symptoms in the UI
2. Data is sent to FastAPI backend
3. ML model predicts the disease
4. Chatbot provides additional insights
5. Results displayed on frontend

---

## 📊 Future Improvements
- 🔍 Add more diseases and datasets
- 📱 Mobile-friendly UI enhancements
- 🧬 Integration with real medical APIs
- 📈 Model performance optimization
- 🔐 User authentication system

---

## ⚠️ Disclaimer

This project is for educational purposes only.  
It is **not a substitute for professional medical advice**.

## 👩‍💻 Author

**Aathira Manoj**  
- GitHub: https://github.com/Aathira1Manoj
