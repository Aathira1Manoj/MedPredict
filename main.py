import os
import uvicorn
import joblib
import numpy as np
import pandas as pd
import requests
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from catboost import CatBoostClassifier

# =========================================================
# Load Artifacts
# =========================================================

FEATURE_COLS = joblib.load("output/feature_cols.pkl")
SYMPTOM_COLS = joblib.load("output/symptom_cols.pkl")
DISEASE_MAP  = joblib.load("output/disease_map.pkl")

LABEL_ENC = None
if os.path.exists("output/label_encoder.pkl"):
    LABEL_ENC = joblib.load("output/label_encoder.pkl")

# =========================================================
# Load CatBoost Model
# =========================================================

MODEL_PATH = "output/catboost_disease_model.cbm"

model = CatBoostClassifier()
model.load_model(MODEL_PATH)

# =========================================================
# Load Diet CSV — indexed by disease_code for O(1) lookup
# =========================================================

DIETS_DF = pd.read_csv("data/diets_cleaned.csv")

# Build a dict: disease_code (int) -> list of diet strings (filtered "Not Specified")
DIET_LOOKUP: dict[int, dict] = {}

for _, row in DIETS_DF.iterrows():
    code = int(row["disease_code"])
    diets = [
        str(row[c]).strip()
        for c in ["diet_1", "diet_2", "diet_3", "diet_4", "diet_5"]
        if str(row[c]).strip().lower() not in ("not specified", "nan", "")
    ]
    disease_name = str(row["disease"]).strip()
    # If the same code appears multiple times, merge unique diet entries
    if code not in DIET_LOOKUP:
        DIET_LOOKUP[code] = {"disease": disease_name, "diets": set()}
    DIET_LOOKUP[code]["diets"].update(diets)

# Convert sets to sorted lists for deterministic output
for code in DIET_LOOKUP:
    DIET_LOOKUP[code]["diets"] = sorted(DIET_LOOKUP[code]["diets"])

# =========================================================
# FastAPI App
# =========================================================

app = FastAPI(title="Disease Prediction API + AI Meal Suggestion")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow frontend
    allow_credentials=True,
    allow_methods=["*"],   # allow OPTIONS, POST, GET
    allow_headers=["*"],
)

# =========================================================
# Request Schema
# =========================================================

class PatientData(BaseModel):
    symptoms: List[str]
    age: int
    gender: str
    region: str = "India"
    diet_preference: str = "Vegetarian"

# =========================================================
# Feature Engineering
# =========================================================

def build_feature_vector(symptoms, age, gender):
    sym_flags = {col: int(col in symptoms) for col in SYMPTOM_COLS}
    num_symptoms = sum(sym_flags.values())

    if age < 12:
        age_bin = 0
    elif age < 17:
        age_bin = 1
    elif age < 35:
        age_bin = 2
    elif age < 60:
        age_bin = 3
    else:
        age_bin = 4

    gender_enc = 1 if gender.lower() == "male" else 0

    weights = np.linspace(1, 2, len(SYMPTOM_COLS))
    sym_values = np.array([sym_flags[c] for c in SYMPTOM_COLS], dtype=float)
    severity = float(sym_values.dot(weights))

    age_x_symptoms = age * num_symptoms

    row = {
        **sym_flags,
        "num_symptoms": num_symptoms,
        "age_bin": age_bin,
        "gender_enc": gender_enc,
        "severity": severity,
        "age_x_symptoms": age_x_symptoms
    }

    return pd.DataFrame([row])[FEATURE_COLS]

# =========================================================
# Prediction Logic (Top-3)
# =========================================================

def predict_top3(model, X):
    probs = model.predict_proba(X)[0]
    top3_idx = np.argsort(probs)[-3:][::-1]

    results = []
    for idx in top3_idx:
        conf = float(probs[idx])
        disease_code = int(model.classes_[idx])
        disease_name = DISEASE_MAP.get(disease_code, f"Code {disease_code}")
        results.append({
            "disease": disease_name,
            "disease_code": disease_code,
            "confidence": round(conf, 4)
        })

    return results

# =========================================================
# Diet Lookup from CSV
# =========================================================

def get_csv_diets(disease_code: int) -> dict:
    """
    Returns {"disease": str, "diets": [str, ...]} from the CSV lookup.
    Falls back to empty list if code not found.
    """
    entry = DIET_LOOKUP.get(disease_code)
    if entry:
        return entry
    return {"disease": f"Code {disease_code}", "diets": []}

# =========================================================
# GROQ API CONFIG
# =========================================================

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "qwen/qwen3-32b"

def generate_disease_summary(disease: str) -> str:
    """
    Returns a short 2-3 sentence plain-language summary of the disease.
    """
    prompt = f"""
IMPORTANT:
- Do NOT include any reasoning
- Do NOT include <think> and </think> tags
- Only return final answer

In 2-3 concise sentences, explain what "{disease}" is in simple, patient-friendly language.
Cover: what it is, common causes or triggers, and one key thing the patient should know.
Do not use bullet points. Do not include headers. Plain paragraph only.
"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}]
    }
    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"].strip()
        print(f"[GROQ disease_summary] status={response.status_code} body={response.text[:300]}")
        return ""
    except Exception as e:
        print(f"[GROQ disease_summary] exception: {e}")
        return ""


def generate_meal_plan(disease: str, diet_items: list[str], region: str = "India", diet_preference: str = "Vegetarian") -> str:
    """
    LLM elaborates ONLY on the diet items already retrieved from the CSV.
    It does not invent new foods — it explains how to apply them across meals.

    """
    if diet_items:
        diet_list_str = "\n".join(f"- {d}" for d in diet_items)
        grounding_block = (
            f"The following diet recommendations are clinically sourced and MUST be used "
            f"as the basis for your response. Do not suggest foods outside this list:\n"
            f"{diet_list_str}"
        )
    else:
        grounding_block = (
            "No specific diet data is available for this condition. "
            "Provide only very general safe guidance and advise consulting a doctor."
        )

    prompt = f"""
    IMPORTANT:
    - Do NOT include any reasoning
    - Do NOT include <think> and </think> tags
    - Only return final answer
This is general health guidance, not medical advice.

Patient predicted condition: {disease}
Patient region: {region}
Patient diet preference: {diet_preference}

{grounding_block}

Using ONLY the diet items listed above, structure a practical daily meal plan tailored to the patient's region ({region}) and diet preference ({diet_preference}):
- Adapt meal names and food pairings to regional cuisine where applicable (e.g. Kerala-style breakfast, North Indian lunch)
- If diet preference is Vegetarian, exclude all meat, fish, and eggs
- If diet preference is Non-Vegetarian, you may include appropriate non-veg items from the list if present

Sections:
- Breakfast (use applicable items from the list)
- Lunch (use applicable items from the list)
- Dinner (use applicable items from the list)
- Foods to avoid (infer from the condition, keep it brief)
- Lifestyle tips (1-2 lines)

Do not add foods not mentioned in the list above. Keep it concise and safe.
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            print(f"[GROQ meal_plan] status={response.status_code} body={response.text[:300]}")
            return "Meal recommendation unavailable (LLM error)."
    except Exception as e:
        print(f"[GROQ meal_plan] exception: {e}")
        return "Meal recommendation unavailable (network error)."

# =========================================================
# Load FAQ
# =========================================================

FAQ_PATH = "data/FAQ.txt"
FAQ_CONTENT = ""
if os.path.exists(FAQ_PATH):
    with open(FAQ_PATH, "r", encoding="utf-8") as f:
        FAQ_CONTENT = f.read()
else:
    print(f"[WARNING] FAQ file not found at {FAQ_PATH}")

FAQ_SYSTEM_PROMPT = f"""You are a helpful and friendly assistant for MediPredict, an AI-powered disease prediction and diet recommendation web app.

Answer ONLY questions related to MediPredict using the FAQ knowledge base below. Be concise, warm, and clear.
If the question is unrelated to MediPredict or health tools, politely say you can only help with MediPredict-related questions.
Never give personal medical diagnoses. For any health concerns, always recommend consulting a qualified doctor.
Do NOT use markdown formatting, asterisks, bold, or bullet dashes in your responses. Write in plain, clean sentences only.

FAQ KNOWLEDGE BASE:
{FAQ_CONTENT}"""

# =========================================================
# Chat Schema
# =========================================================

class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# =========================================================
# Chat Endpoint
# =========================================================

@app.post("/chat")
def chat(data: ChatRequest):
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": FAQ_SYSTEM_PROMPT},
            *[{"role": m.role, "content": m.content} for m in data.messages]
        ]
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            reply = response.json()["choices"][0]["message"]["content"]
            # Strip think tags and markdown
            import re
            reply = re.sub(r"<think>[\s\S]*?</think>", "", reply, flags=re.IGNORECASE)
            reply = re.sub(r"<[^>]+>", "", reply)
            reply = re.sub(r"\*+", "", reply)
            reply = reply.strip()
            return {"reply": reply}
        print(f"[GROQ chat] status={response.status_code} body={response.text[:300]}")
        return {"reply": "Sorry, I couldn't process your question right now. Please try again."}
    except Exception as e:
        print(f"[GROQ chat] exception: {e}")
        return {"reply": "Network error. Please try again later."}

# =========================================================
# API Endpoint
# =========================================================
@app.get("/symptoms")
def get_symptoms():
    return {"symptoms": SYMPTOM_COLS}

@app.post("/predict")
def predict(data: PatientData):

    X = build_feature_vector(data.symptoms, data.age, data.gender)
    results = predict_top3(model, X)

    # Use top predicted disease for diet lookup + LLM elaboration
    top = results[0]
    top_disease_name = top["disease"]
    top_disease_code = top["disease_code"]

    # Step 1: Retrieve grounded diet data from CSV
    csv_diet_entry = get_csv_diets(top_disease_code)
    csv_diets = csv_diet_entry["diets"]

    # Step 2: Generate disease summary
    disease_summary = generate_disease_summary(top_disease_name)

    # Step 3: LLM elaborates ONLY on those CSV-sourced diet items
    meal_plan = generate_meal_plan(top_disease_name, csv_diets, data.region, data.diet_preference)

    return {
        "predictions": results,
        "disease_summary": disease_summary,
        "diet_recommendations": {
            "disease_code": top_disease_code,
            "disease": csv_diet_entry["disease"],
            "sourced_from_csv": csv_diets,       # raw CSV items (transparent)
            "meal_plan": meal_plan                # LLM elaboration on CSV items
        }
    }

# =========================================================
# Run Server
# =========================================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
