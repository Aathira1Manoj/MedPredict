import { useState, useEffect, useRef } from "react";

const API_BASE = "https://medipredict-9st2.onrender.com";

// Convert snake_case pkl column → readable label: "joint_pain" → "Joint pain"
const pklToLabel = (col) =>
  col.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

// Title-case disease names: first letter upper, rest lower
// e.g. "DIABETES TYPE 2" → "Diabetes type 2"
const toSentenceCase = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;

// Strip <think>...</think> blocks and leftover XML-like tags / stray symbols
const cleanMealPlan = (text) => {
  if (!text) return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")  // remove think blocks
    .replace(/<[^>]+>/g, "")                     // remove any remaining tags
    .replace(/\*{2,}/g, "")                      // remove ** bold markers
    .replace(/#{1,6}\s?/g, "")                   // remove markdown headings
    .replace(/^\s*[-–—]\s/gm, "• ")              // normalise dashes to bullet
    .replace(/\n{3,}/g, "\n\n")                  // collapse excess blank lines
    .trim();
};

// Fallback static list (used only if /symptoms endpoint missing)
const FALLBACK_SYMPTOMS = [
  { id: "itching", label: "Itching" },
  { id: "skin_rash", label: "Skin rash" },
  { id: "nodal_skin_eruptions", label: "Skin eruptions" },
  { id: "continuous_sneezing", label: "Sneezing" },
  { id: "shivering", label: "Shivering" },
  { id: "chills", label: "Chills" },
  { id: "joint_pain", label: "Joint pain" },
  { id: "stomach_pain", label: "Stomach pain" },
  { id: "acidity", label: "Acidity" },
  { id: "ulcers_on_tongue", label: "Mouth ulcers" },
  { id: "vomiting", label: "Vomiting" },
  { id: "burning_micturition", label: "Burning urination" },
  { id: "fatigue", label: "Fatigue" },
  { id: "weight_gain", label: "Weight gain" },
  { id: "anxiety", label: "Anxiety" },
  { id: "cold_hands_and_feets", label: "Cold hands/feet" },
  { id: "mood_swings", label: "Mood swings" },
  { id: "weight_loss", label: "Weight loss" },
  { id: "restlessness", label: "Restlessness" },
  { id: "lethargy", label: "Lethargy" },
  { id: "cough", label: "Cough" },
  { id: "high_fever", label: "High fever" },
  { id: "sunken_eyes", label: "Sunken eyes" },
  { id: "breathlessness", label: "Breathlessness" },
  { id: "sweating", label: "Sweating" },
  { id: "dehydration", label: "Dehydration" },
  { id: "indigestion", label: "Indigestion" },
  { id: "headache", label: "Headache" },
  { id: "yellowish_skin", label: "Yellowish Skin" },
  { id: "dark_urine", label: "Dark Urine" },
  { id: "nausea", label: "Nausea" },
  { id: "loss_of_appetite", label: "Loss of Appetite" },
  { id: "pain_behind_the_eyes", label: "Eye Pain" },
  { id: "back_pain", label: "Back Pain" },
  { id: "constipation", label: "Constipation" },
  { id: "abdominal_pain", label: "Abdominal Pain" },
  { id: "diarrhoea", label: "Diarrhoea" },
  { id: "mild_fever", label: "Mild Fever" },
  { id: "yellow_urine", label: "Yellow Urine" },
  { id: "yellowing_of_eyes", label: "Yellow Eyes" },
  { id: "acute_liver_failure", label: "Liver Issues" },
  { id: "fluid_overload", label: "Fluid Overload" },
  { id: "swelling_of_stomach", label: "Stomach Swelling" },
  { id: "swelled_lymph_nodes", label: "Swollen Lymph Nodes" },
  { id: "malaise", label: "Malaise" },
  { id: "blurred_and_distorted_vision", label: "Blurred Vision" },
  { id: "phlegm", label: "Phlegm" },
  { id: "throat_irritation", label: "Sore Throat" },
  { id: "redness_of_eyes", label: "Red Eyes" },
  { id: "sinus_pressure", label: "Sinus Pressure" },
  { id: "runny_nose", label: "Runny Nose" },
  { id: "congestion", label: "Congestion" },
  { id: "chest_pain", label: "Chest Pain" },
  { id: "weakness_in_limbs", label: "Weak Limbs" },
  { id: "fast_heart_rate", label: "Fast Heart Rate" },
  { id: "pain_during_bowel_movements", label: "Bowel Pain" },
  { id: "pain_in_anal_region", label: "Anal Pain" },
  { id: "bloody_stool", label: "Bloody Stool" },
  { id: "irritation_in_anus", label: "Anal Irritation" },
  { id: "neck_pain", label: "Neck Pain" },
  { id: "dizziness", label: "Dizziness" },
  { id: "cramps", label: "Cramps" },
  { id: "bruising", label: "Bruising" },
  { id: "obesity", label: "Obesity" },
  { id: "swollen_legs", label: "Swollen Legs" },
  { id: "puffy_face_and_eyes", label: "Puffy Face" },
  { id: "enlarged_thyroid", label: "Thyroid Issues" },
  { id: "brittle_nails", label: "Brittle Nails" },
  { id: "swollen_extremeties", label: "Swollen Limbs" },
  { id: "excessive_hunger", label: "Excessive Hunger" },
  { id: "extra_marital_contacts", label: "Risk Contacts" },
  { id: "drying_and_tingling_lips", label: "Dry Lips" },
  { id: "slurred_speech", label: "Slurred Speech" },
  { id: "knee_pain", label: "Knee Pain" },
  { id: "hip_joint_pain", label: "Hip Pain" },
  { id: "muscle_weakness", label: "Muscle Weakness" },
  { id: "stiff_neck", label: "Stiff Neck" },
  { id: "swelling_joints", label: "Swollen Joints" },
  { id: "movement_stiffness", label: "Stiffness" },
  { id: "spinning_movements", label: "Vertigo" },
  { id: "loss_of_balance", label: "Balance Loss" },
  { id: "loss_of_smell", label: "Loss of Smell" },
  { id: "bladder_discomfort", label: "Bladder Pain" },
  { id: "foul_smell_of_urine", label: "Urine Odor" },
  { id: "continuous_feel_of_urine", label: "Frequent Urination" },
  { id: "passage_of_gases", label: "Gas" },
  { id: "internal_itching", label: "Internal Itching" },
  { id: "toxic_look_(typhos)", label: "Toxic Appearance" },
  { id: "depression", label: "Depression" },
  { id: "irritability", label: "Irritability" },
  { id: "muscle_pain", label: "Muscle Pain" },
  { id: "altered_sensorium", label: "Mental Fog" },
  { id: "red_spots_over_body", label: "Red Spots" },
  { id: "belly_pain", label: "Belly Pain" },
  { id: "abnormal_menstruation", label: "Menstrual Issues" },
  { id: "dischromic_patches", label: "Skin Patches" },
  { id: "watering_from_eyes", label: "Watery Eyes" },
  { id: "increased_appetite", label: "Increased Appetite" },
  { id: "polyuria", label: "Polyuria" },
  { id: "family_history", label: "Family History" },
  { id: "mucoid_sputum", label: "Mucoid Sputum" },
  { id: "rusty_sputum", label: "Rusty Sputum" },
  { id: "lack_of_concentration", label: "Poor Concentration" },
  { id: "visual_disturbances", label: "Visual Issues" },
  { id: "receiving_blood_transfusion", label: "Blood Transfusion" },
  { id: "receiving_unsterile_injections", label: "Unsterile Injections" },
  { id: "coma", label: "Coma Risk" },
  { id: "stomach_bleeding", label: "Stomach Bleeding" },
  { id: "distention_of_abdomen", label: "Abdominal Distention" },
  { id: "history_of_alcohol_consumption", label: "Alcohol History" },
  { id: "fluid_overload.1", label: "Fluid Retention" },
  { id: "blood_in_sputum", label: "Blood in Sputum" },
  { id: "prominent_veins_on_calf", label: "Calf Veins" },
  { id: "palpitations", label: "Palpitations" },
  { id: "painful_walking", label: "Painful Walking" },
  { id: "pus_filled_pimples", label: "Pus Pimples" },
  { id: "blackheads", label: "Blackheads" },
  { id: "scurring", label: "Scarring" },
  { id: "skin_peeling", label: "Skin Peeling" },
  { id: "silver_like_dusting", label: "Skin Dusting" },
  { id: "small_dents_in_nails", label: "Nail dents" },
  { id: "inflammatory_nails", label: "Inflamed nails" },
  { id: "blister", label: "Blisters" },
  { id: "red_sore_around_nose", label: "Nose sores" },
  { id: "yellow_crust_ooze", label: "Yellow crust" },
];

// Steps: Details → Symptoms → Results
const STEPS = ["Details", "Symptoms", "Results"];

const confidenceColor = (val) => {
  if (val >= 0.7) return "#10b981";
  if (val >= 0.4) return "#f59e0b";
  return "#ef4444";
};

function AnimatedPercent({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Math.round(value * 100);
    if (start === end) return;
    const inc = Math.ceil(end / 40);
    const timer = setInterval(() => {
      start += inc;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 18);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}%</>;
}

function CircleProgress({ value, color = "#06b6d4", size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => { setTimeout(() => setOffset(circ * (1 - value)), 100); }, [value, circ]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.32, fontWeight: 900, color: color, lineHeight: 1,
      }}>+</div>
    </div>
  );
}

function StepBar({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: i < step ? "#06b6d4" : i === step ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "#e2e8f0",
              color: i <= step ? "#fff" : "#94a3b8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              boxShadow: i === step ? "0 0 0 4px #06b6d422" : "none",
              transition: "all 0.3s",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === step ? "#0e7490" : "#94a3b8", fontWeight: i === step ? 700 : 400, letterSpacing: 0.3 }}>{s.toUpperCase()}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 48, height: 2, margin: "0 4px", marginBottom: 16, background: i < step ? "#06b6d4" : "#e2e8f0", transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Colored Meal Plan renderer ────────────────────────────────────
const MEAL_LABELS = [
  { pattern: /^(breakfast[:.]?)/i, color: "#f59e0b", bg: "#fffbeb", icon: "🌅", label: "Breakfast" },
  { pattern: /^(lunch[:.]?)/i, color: "#10b981", bg: "#f0fdf4", icon: "☀️", label: "Lunch" },
  { pattern: /^(dinner[:.]?)/i, color: "#6366f1", bg: "#f5f3ff", icon: "🌙", label: "Dinner" },
  { pattern: /^(snacks?[:.]?)/i, color: "#ec4899", bg: "#fdf2f8", icon: "🍎", label: "Snack" },
  { pattern: /^(morning snack[:.]?)/i, color: "#f59e0b", bg: "#fffbeb", icon: "🌤️", label: "Morning Snack" },
  { pattern: /^(evening snack[:.]?)/i, color: "#8b5cf6", bg: "#f5f3ff", icon: "🌆", label: "Evening Snack" },
  { pattern: /^(mid-?day|midday[:.]?)/i, color: "#10b981", bg: "#f0fdf4", icon: "🌞", label: "Midday" },
  { pattern: /^(avoid[:.]?|foods? to avoid[:.]?)/i, color: "#ef4444", bg: "#fef2f2", icon: "🚫", label: "Avoid" },
  { pattern: /^(tips?[:.]?|general tips?[:.]?)/i, color: "#0891b2", bg: "#f0fdff", icon: "💡", label: "Tips" },
  { pattern: /^(hydration[:.]?|water[:.]?)/i, color: "#3b82f6", bg: "#eff6ff", icon: "💧", label: "Hydration" },
  { pattern: /^(note[:.]?|important[:.]?)/i, color: "#f97316", bg: "#fff7ed", icon: "📌", label: "Note" },
  { pattern: /^(supplements?[:.]?)/i, color: "#a855f7", bg: "#faf5ff", icon: "💊", label: "Supplement" },
  { pattern: /^(day \d+[:.]?)/i, color: "#0891b2", bg: "#f0fdff", icon: "📅", label: "Day" },
  { pattern: /^(week \d+[:.]?)/i, color: "#6366f1", bg: "#f5f3ff", icon: "📆", label: "Week" },
];

function ColoredMealPlan({ text }) {
  if (!text) return <p style={{ color: "#94a3b8", fontSize: 14 }}>No meal plan available.</p>;

  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

        // Check if line starts with a meal label keyword
        let matched = null;
        for (const m of MEAL_LABELS) {
          if (m.pattern.test(line)) { matched = m; break; }
        }

        if (matched) {
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: matched.bg, borderRadius: 12,
              padding: "10px 14px", marginTop: 6,
              border: `1px solid ${matched.color}30`,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>{matched.icon}</span>
              <div>
                <span style={{ fontWeight: 800, color: matched.color, fontSize: 14 }}>
                  {line.replace(matched.pattern, (w) => w.toUpperCase())}
                </span>
              </div>
            </div>
          );
        }

        // Bullet lines
        if (line.trim().startsWith("•")) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 6px" }}>
              <span style={{ color: "#06b6d4", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
              <span style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{line.trim().slice(1).trim()}</span>
            </div>
          );
        }

        return (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "#334155", padding: "1px 6px" }}>{line}</p>
        );
      })}
    </div>
  );
}

// ── Login / Register Page ─────────────────────────────────────────
function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    if (!email || !password) { setError("Email and password required."); return; }
    if (mode === "register" && !name) { setError("Name required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    if (mode === "register") {
      const users = JSON.parse(localStorage.getItem("medi_users") || "{}");
      if (users[email]) { setError("Email already registered."); return; }
      users[email] = { name, password };
      localStorage.setItem("medi_users", JSON.stringify(users));
      onLogin({ name, email });
    } else {
      const users = JSON.parse(localStorage.getItem("medi_users") || "{}");
      const u = users[email];
      if (!u || u.password !== password) { setError("Invalid email or password."); return; }
      onLogin({ name: u.name, email });
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "linear-gradient(160deg,#ecfeff 0%,#e0f2fe 55%,#f0fdf4 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } ::-webkit-scrollbar{width:8px;height:8px} ::-webkit-scrollbar-track{background:#f0fdff;border-radius:99px} ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#06b6d4,#3b82f6);border-radius:99px;border:2px solid #f0fdff} ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#0891b2,#1d4ed8)} *{scrollbar-width:thin;scrollbar-color:#06b6d4 #f0fdff}`}</style>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 40px", background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e0f7fa",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>+</div>
          <span style={{ fontSize: 21, fontWeight: 800, background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediPredict</span>
        </div>
        <button onClick={onBack} style={{ padding: "8px 18px", borderRadius: 20, border: "1.5px solid #b2ebf2", background: "#fff", color: "#0891b2", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Home</button>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 420, animation: "fadeIn 0.5s ease both" }}>
          {/* Toggle */}
          <div style={{ display: "flex", background: "#e0f7fa", borderRadius: 16, padding: 4, marginBottom: 32 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "11px", borderRadius: 13, border: "none", cursor: "pointer",
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "#0891b2" : "#64748b",
                fontWeight: mode === m ? 700 : 500, fontSize: 14,
                boxShadow: mode === m ? "0 2px 8px #06b6d420" : "none",
                transition: "all 0.15s",
              }}>{m === "login" ? "Sign In" : "Create Account"}</button>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 24, padding: "36px 32px", border: "1px solid #e0f7fa", boxShadow: "0 8px 40px #06b6d415" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              {mode === "login" ? "Welcome back 👋" : "Create your account"}
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>
              {mode === "login" ? "Sign in to view your prediction history." : "Join MediPredict to save your results."}
            </p>

            {mode === "register" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  style={{ width: "100%", padding: "12px 15px", borderRadius: 12, border: "1.5px solid #b2ebf2", fontSize: 14, outline: "none", background: "#fff", color: "#0f172a" }} />
              </div>
            )}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email"
                style={{ width: "100%", padding: "12px 15px", borderRadius: 12, border: "1.5px solid #b2ebf2", fontSize: 14, outline: "none", background: "#fff", color: "#0f172a" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" type="password"
                style={{ width: "100%", padding: "12px 15px", borderRadius: 12, border: "1.5px solid #b2ebf2", fontSize: 14, outline: "none", background: "#fff", color: "#0f172a" }} />
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}

            <button onClick={handleSubmit} style={{
              width: "100%", padding: "14px", borderRadius: 22, border: "none",
              background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
              boxShadow: "0 5px 20px #06b6d438",
            }}>{mode === "login" ? "Sign In →" : "Create Account →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Prediction History Page ────────────────────────────────────────
function HistoryPage({ user, history, onBack, onLogout }) {
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "linear-gradient(160deg,#ecfeff 0%,#e0f2fe 55%,#f0fdf4 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } ::-webkit-scrollbar{width:8px;height:8px} ::-webkit-scrollbar-track{background:#f0fdff;border-radius:99px} ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#06b6d4,#3b82f6);border-radius:99px;border:2px solid #f0fdff} ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#0891b2,#1d4ed8)} *{scrollbar-width:thin;scrollbar-color:#06b6d4 #f0fdff}
        @media (max-width: 700px) {
          .hist-nav { padding: 12px 16px !important; }
          .hist-nav-name { display: none !important; }
          .hist-content { padding: 24px 14px 40px !important; }
          .hist-title { font-size: 22px !important; }
          .hist-grid { grid-template-columns: 1fr !important; }
          .hist-card { padding: 16px !important; gap: 12px !important; }
          .hist-card-conf { width: 44px !important; height: 44px !important; font-size: 12px !important; }
          .hist-card-badge { align-self: flex-start !important; margin-top: 6px !important; }
        }
      `}</style>
      <nav className="hist-nav" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 40px", background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e0f7fa",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>+</div>
          <span style={{ fontSize: 21, fontWeight: 800, background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediPredict</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{user?.name?.[0]?.toUpperCase()}</div>
          <span className="hist-nav-name" style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>{user?.name}</span>
          <button onClick={onBack} style={{ padding: "7px 14px", borderRadius: 18, border: "1.5px solid #b2ebf2", background: "#fff", color: "#0891b2", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>← Home</button>
          <button onClick={onLogout} style={{ padding: "7px 14px", borderRadius: 18, border: "none", background: "#fee2e2", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Logout</button>
        </div>
      </nav>

      <div className="hist-content" style={{ width: "100%", padding: "40px 48px 60px", animation: "fadeIn 0.5s ease both" }}>
        <h2 className="hist-title" style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>My Predictions</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>Your saved prediction history — most recent first.</p>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 22, border: "1px solid #e0f7fa" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🩺</div>
            <p style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>No predictions yet.</p>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Complete a symptom check to see history here.</p>
            <button onClick={onBack} style={{ marginTop: 24, padding: "12px 28px", borderRadius: 22, border: "none", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Start a Check →</button>
          </div>
        ) : (
          <div className="hist-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {history.map((h) => (
              <div key={h.id} className="hist-card" style={{
                background: "#fff", borderRadius: 18, padding: "20px 24px",
                border: "1px solid #e0f7fa", boxShadow: "0 3px 16px #06b6d410",
                display: "flex", alignItems: "flex-start", gap: 16,
              }}>
                <div className="hist-card-conf" style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 14, lineHeight: 1,
                  textAlign: "center",
                }}>{h.confidence}%</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{h.topDisease}</div>
                    <div className="hist-card-badge" style={{
                      padding: "4px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: h.confidence >= 70 ? "#dcfce7" : h.confidence >= 40 ? "#fef9c3" : "#fee2e2",
                      color: h.confidence >= 70 ? "#15803d" : h.confidence >= 40 ? "#92400e" : "#b91c1c",
                    }}>{h.confidence >= 70 ? "High" : h.confidence >= 40 ? "Med" : "Low"}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{h.date} · Age {h.age} · {h.sex}</div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {h.symptoms.slice(0, 5).map(s => (
                      <span key={s} style={{ padding: "3px 9px", borderRadius: 8, background: "#e0f7fa", color: "#0891b2", fontSize: 11, fontWeight: 600 }}>{s}</span>
                    ))}
                    {h.symptoms.length > 5 && <span style={{ padding: "3px 9px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontSize: 11 }}>+{h.symptoms.length - 5}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── About Page ────────────────────────────────────────────────────
function AboutPage({ onBack, user, onLogout }) {
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "linear-gradient(160deg,#ecfeff 0%,#e0f2fe 55%,#f0fdf4 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; min-height: 100vh; } @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } ::-webkit-scrollbar{width:8px} ::-webkit-scrollbar-track{background:#f0fdff;border-radius:99px} ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#06b6d4,#3b82f6);border-radius:99px;border:2px solid #f0fdff} *{scrollbar-width:thin;scrollbar-color:#06b6d4 #f0fdff}
        @media (max-width: 700px) {
          .about-nav { padding: 14px 18px !important; }
          .about-content { padding: 28px 16px 60px !important; }
          .about-title { font-size: 28px !important; }
          .about-subtitle { font-size: 14px !important; }
          .about-aim-card { padding: 24px 18px !important; }
          .about-feat-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .about-feat-card { padding: 18px 14px !important; }
          .about-header { margin-bottom: 30px !important; }
        }
        @media (max-width: 420px) {
          .about-feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <nav className="about-nav" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 40px", background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e0f7fa",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>+</div>
          <span style={{ fontSize: 21, fontWeight: 800, background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediPredict</span>
        </div>
        <button onClick={onBack} style={{ padding: "8px 18px", borderRadius: 20, border: "1.5px solid #b2ebf2", background: "#fff", color: "#0891b2", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Home</button>
      </nav>

      <div className="about-content" style={{ width: "100%", padding: "56px 48px 80px", animation: "fadeIn 0.5s ease both" }}>
        {/* Header */}
        <div className="about-header" style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 20, background: "#e0f7fa",
            color: "#0891b2", fontSize: 12, fontWeight: 600, marginBottom: 18,
            border: "1px solid #b2ebf2",
          }}>About This Project</div>
          <h1 className="about-title" style={{ fontSize: 42, fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: 14 }}>
            What is{" "}
            <span style={{ background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MediPredict?
            </span>
          </h1>
          <p className="about-subtitle" style={{ fontSize: 16, color: "#64748b", maxWidth: 600, margin: "0 auto", lineHeight: 1.75 }}>
            An intelligent web application combining Machine Learning and Generative AI for health awareness and dietary guidance.
          </p>
        </div>

        {/* Main description card */}
        <div className="about-aim-card" style={{
          background: "#fff", borderRadius: 24, padding: "44px 48px",
          border: "1px solid #e0f7fa", boxShadow: "0 8px 40px #06b6d415", marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, flexShrink: 0 }}>🎯</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Project Aim</h2>
          </div>
          <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.9 }}>
            The aim of this project is to develop an intelligent and interactive web application that predicts possible diseases based on user-input symptoms using Machine Learning models and then provides health-focused food recipes or meal suggestions generated via Generative AI. This dual-function system not only supports early-stage medical awareness but also guides users on suitable diets through AI-generated recipes, improving both health literacy and well-being.
          </p>
        </div>

        {/* Feature grid */}
        <div className="about-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 }}>
          {[
            { icon: "🤖", title: "Machine Learning", color: "#06b6d4", bg: "#f0fdff", desc: "CatBoost model trained on thousands of real symptom-disease cases for high-accuracy predictions." },
            { icon: "🍽️", title: "Generative AI Recipes", color: "#3b82f6", bg: "#eff6ff", desc: "AI-powered meal plans and food recommendations tailored to each predicted condition." },
            { icon: "🩺", title: "Early Awareness", color: "#10b981", bg: "#f0fdf4", desc: "Supports early-stage medical awareness by surfacing likely conditions from user-reported symptoms." },
            { icon: "📊", title: "Health Literacy", color: "#8b5cf6", bg: "#f5f3ff", desc: "Improves overall health literacy and well-being through actionable diet and lifestyle guidance." },
          ].map(({ icon, title, color, bg, desc }) => (
            <div key={title} className="about-feat-card" style={{
              background: bg, borderRadius: 20, padding: "28px 28px",
              border: `1px solid ${color}25`, boxShadow: "0 2px 16px #06b6d410",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          background: "linear-gradient(135deg,#fff7ed,#fef2f2)", borderRadius: 18,
          padding: "24px 28px", border: "1px solid #fed7aa",
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: 13, color: "#92400e", lineHeight: 1.7, margin: 0 }}>
            MediPredict is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for any medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── FAQ Chatbot ────────────────────────────────────────────────────
// FAQ_CONTENT and ChatBot component removed — chatbot lives only on landing page

const FAQ_CONTENT_UNUSED = `
MediPredict – Frequently Asked Questions

GENERAL
Q: What is MediPredict?
A: MediPredict is an AI-powered health awareness web app. You enter your symptoms, age, sex, and region, and the app predicts the most likely diseases using a CatBoost machine learning model. It also generates a personalised meal plan and diet guidance based on your predicted condition.

Q: Is MediPredict a replacement for a doctor?
A: No. MediPredict is strictly for health awareness and educational purposes. It does not diagnose diseases. Always consult a qualified doctor or healthcare professional for any medical concern, diagnosis, or treatment.

Q: Is MediPredict free to use?
A: Yes, MediPredict is completely free to use.

PREDICTIONS
Q: How does the disease prediction work?
A: You select your symptoms from a list, provide your age, sex, and region. The app feeds this into a trained CatBoost classifier which outputs the top 3 most likely diseases along with a confidence score for each.

Q: What does the confidence score mean?
A: The confidence score is a percentage showing how strongly the model associates your selected symptoms with a given disease. A higher score means a stronger match. A low score does not mean the condition is unlikely. Always consult a doctor.

Q: Why does the app show 3 diseases instead of one?
A: Many diseases share overlapping symptoms. Showing top 3 results gives a more realistic picture of possibilities.

Q: Can I get better predictions by selecting more symptoms?
A: Yes. Selecting more symptoms that you are actually experiencing improves prediction accuracy. Do not select symptoms you do not have.

Q: What is About This Condition on the results page?
A: After prediction, the app generates a short plain-language summary of the top predicted disease — what it is, common causes, and one key thing to know. This is AI-generated for awareness only.

DIET AND MEAL PLANS
Q: Where do the diet recommendations come from?
A: Diet items are sourced from a curated medical dataset linked to each disease. The AI then adapts these into a structured meal plan tailored to your region and diet preference.

Q: Can I choose a vegetarian or non-vegetarian meal plan?
A: Yes. On the Details page (Step 1), you can select Vegetarian or Non-Vegetarian. The meal plan will be adapted accordingly.

Q: The meal plan includes foods I am allergic to. What should I do?
A: The meal plan is AI-generated and does not account for individual allergies. Always review recommendations with a doctor or dietitian before making dietary changes.

Q: Why does the meal plan mention regional foods like Kerala-style breakfast?
A: The app uses your selected region to tailor meal suggestions to local cuisine.

SYMPTOMS
Q: How many symptoms can I select?
A: There is no hard limit. Selecting at least 3 to 5 symptoms typically gives more meaningful results.

Q: What if my symptom is not in the list?
A: Select the closest alternatives and consult a doctor for a proper assessment.

Q: Should I select symptoms that appeared in the past or only current ones?
A: Select only symptoms you are currently experiencing or have had very recently within the past few days.

ACCOUNT AND HISTORY
Q: Do I need an account to use MediPredict?
A: No. You can use the app and get predictions without creating an account.

Q: What is the benefit of logging in?
A: Logged-in users can save prediction history including diseases predicted, confidence scores, and symptoms submitted.

Q: Is my health data stored securely?
A: Prediction history is stored locally in your browser session. No personal health data is sent to any external server beyond what is needed for the prediction API call.

TECHNICAL
Q: Which machine learning model powers MediPredict?
A: MediPredict uses a CatBoost Classifier trained on a symptom-disease dataset.

Q: Which AI model generates the meal plans and summaries?
A: Meal plans and disease summaries are generated by a Groq-hosted large language model (Qwen 32B), using clinically sourced diet data as grounding context.

Q: Why does the meal plan sometimes take a few seconds to load?
A: The app makes a live API call to generate your personalised meal plan. This typically takes 3 to 8 seconds depending on server load.

Q: Does MediPredict work on mobile?
A: Yes. MediPredict is fully responsive and works on mobile browsers as well as desktop.
`;

export default function MediPredict() {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("25");
  const [sex, setSex] = useState("Male");
  const [region, setRegion] = useState("Kerala, India");
  const [dietPref, setDietPref] = useState("Vegetarian");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [showLanding, setShowLanding] = useState(true);
  const [page, setPage] = useState("home"); // "home" | "login" | "history" | "about"
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("medi_user")); } catch { return null; }
  });
  const [predictionHistory, setPredictionHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("medi_history")) || []; } catch { return []; }
  });
  const [symptomList, setSymptomList] = useState(FALLBACK_SYMPTOMS);
  const resultRef = useRef(null);

  const saveHistory = (entry) => {
    const updated = [entry, ...predictionHistory].slice(0, 50);
    setPredictionHistory(updated);
    localStorage.setItem("medi_history", JSON.stringify(updated));
  };
  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem("medi_user", JSON.stringify(userData));
  };
  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem("medi_user");
    setPage("home");
    setShowLanding(true);
  };

  // Fetch symptom columns from backend (GET /symptoms returns { symptoms: ["itching", ...] })
  useEffect(() => {
    fetch(`${API_BASE}/symptoms`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.symptoms) && data.symptoms.length > 0) {
          setSymptomList(data.symptoms.map(col => ({ id: col, label: pklToLabel(col) })));
        }
      })
      .catch(() => { /* silently use fallback */ });
  }, []);

  const filteredSymptoms = symptomList
    .filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  const toggleSymptom = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handlePredict = async () => {
    if (selected.length === 0) { setError("Please select at least one symptom."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selected, age: parseInt(age), gender: sex.toLowerCase(), region, diet_preference: dietPref }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data);
      setStep(2);
      if (user) {
        saveHistory({
          id: Date.now(),
          date: new Date().toLocaleString(),
          age, sex,
          symptoms: selected.map(id => symptomList.find(s => s.id === id)?.label || id),
          topDisease: toSentenceCase(data.predictions[0].disease),
          confidence: Math.round(data.predictions[0].confidence * 100),
        });
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Could not reach the prediction server. Make sure the backend is running on port 8000.");
    } finally { setLoading(false); }
  };

  // ── Chatbot State ──────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { role: "bot", text: "👋 Hi! I'm MediPredict's assistant. Ask me anything about how MediPredict works, or try one of the quick questions below!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const FAQ_CHIPS = [
    "How accurate is MediPredict?",
    "Is my data private?",
    "How many symptoms should I pick?",
    "Can it replace a doctor?",
    "What regions are supported?",
    "How does the diet plan work?",
  ];

  const sendChat = async (msg) => {
    const text = (msg || chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMsgs(prev => [...prev, { role: "user", text }]);
    setChatLoading(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chatMsgs
              .filter(m => m.role !== "bot" || m.text !== chatMsgs[0].text) // skip initial greeting
              .filter(m => m.role === "user" || m.role === "bot")
              .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
            { role: "user", content: text }
          ]
        })
      });
      const data = await res.json();
      let reply = data.reply || "Sorry, I couldn't get a response. Please try again.";
      reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<[^>]+>/g, "").replace(/\*{1,}/g, "").trim();
      setChatMsgs(prev => [...prev, { role: "bot", text: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "bot", text: "Network error. Please check your connection and try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  // ── Landing Page ──────────────────────────────────────────────────
  if (showLanding) return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "linear-gradient(160deg,#ecfeff 0%,#e0f2fe 55%,#f0fdf4 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxSizing: "border-box",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatUp { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 #06b6d455; } 50% { box-shadow: 0 0 0 10px #06b6d400; } }
        @keyframes msgIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes typing { 0%,80%,100% { transform:scale(0); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }
        .landing-hero { animation: fadeIn 0.7s ease both; }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px #06b6d425 !important; }
        .feat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .chat-fab { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both, pulse 2.5s ease-in-out 1s infinite; transition: transform 0.2s; }
        .chat-fab:hover { transform: scale(1.1) !important; }
        .chat-window { animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        .chat-msg { animation: msgIn 0.25s ease both; }
        .dot1 { animation: typing 1.2s ease-in-out infinite; }
        .dot2 { animation: typing 1.2s ease-in-out 0.2s infinite; }
        .dot3 { animation: typing 1.2s ease-in-out 0.4s infinite; }
        .chat-send:hover { background: linear-gradient(135deg,#0891b2,#1d4ed8) !important; transform: scale(1.05); }
        .chat-send { transition: transform 0.15s, background 0.15s; }
        .faq-chip:hover { background: #e0f7fa !important; border-color: #06b6d4 !important; transform: translateY(-1px); }
        .faq-chip { transition: all 0.15s; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f0fdff; border-radius: 99px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#06b6d4,#3b82f6); border-radius: 99px; border: 2px solid #f0fdff; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg,#0891b2,#1d4ed8); }
        ::-webkit-scrollbar-corner { background: transparent; }
        * { scrollbar-width: thin; scrollbar-color: #06b6d4 #f0fdff; }
        @media (max-width: 700px) {
          .hero-row { flex-direction: column !important; padding: 32px 18px 24px !important; }
          .hero-visual { display: none !important; }
          .hero-title { font-size: 38px !important; }
          .hero-desc { font-size: 15px !important; }
          .hero-btns { flex-direction: column !important; gap: 10px !important; }
          .hero-btns button { width: 100% !important; }
          .stats-row { gap: 24px !important; }
          .feat-strip { padding: 0 16px 48px !important; gap: 12px !important; }
          .nav-links { display: none !important; }
          .nav-bar { padding: 14px 18px !important; }
          .mobile-tab-bar { display: flex !important; }
        }
        .mobile-tab-bar { display: none; }
      `}</style>

      {/* Nav */}
      <nav className="nav-bar" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 40px", background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e0f7fa",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 18,
          }}>+</div>
          <span style={{ fontSize: 21, fontWeight: 800, background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediPredict</span>
        </div>
        <div className="nav-links" style={{ display: "flex", gap: 28 }}>
          {["Home", "Predictions", "About"].map(n => (
            <a key={n} href="#" onClick={e => {
              e.preventDefault();
              if (n === "Predictions") {
                if (user) { setShowLanding(false); setPage("history"); }
                else { setShowLanding(false); setPage("login"); }
              } else if (n === "About") {
                setPage("about"); setShowLanding(false);
              }
            }} style={{ color: "#475569", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>{n}</a>
          ))}
        </div>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14,
            }}>{user.name?.[0]?.toUpperCase()}</div>
            <button onClick={logoutUser} style={{
              padding: "8px 18px", borderRadius: 20, border: "1.5px solid #b2ebf2",
              background: "#fff", color: "#0891b2", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Logout</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowLanding(false); setPage("login"); }} style={{
              padding: "10px 20px", borderRadius: 24, border: "1.5px solid #b2ebf2",
              background: "#fff", color: "#0891b2", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Login</button>
            <button onClick={() => { setPage("home"); setShowLanding(false); }} style={{
              padding: "10px 22px", borderRadius: 24, border: "none",
              background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <div className="hero-row landing-hero" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "72px 72px 56px", maxWidth: 1280, margin: "0 auto",
        gap: 40,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 20, background: "#e0f7fa",
            color: "#0891b2", fontSize: 12, fontWeight: 600, marginBottom: 22,
            border: "1px solid #b2ebf2",
          }}>
            AI-Powered Disease Detection
          </div>
          <h1 className="hero-title" style={{
            fontSize: 58, fontWeight: 900, lineHeight: 1.08, marginBottom: 20, color: "#0f172a",
          }}>
            HOW ARE YOU<br />
            <span style={{ background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              FEELING TODAY?
            </span>
          </h1>
          <p className="hero-desc" style={{ fontSize: 17, color: "#64748b", marginBottom: 36, maxWidth: 460, lineHeight: 1.7 }}>
            Tell us your symptoms and our AI will predict the most likely conditions — along with personalised diet and meal recommendations.
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: 14 }}>
            <button onClick={() => { setPage("home"); setShowLanding(false); }} style={{
              padding: "15px 34px", borderRadius: 30, border: "none",
              background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
              boxShadow: "0 8px 28px #06b6d445",
            }}>GET STARTED →</button>
            <button onClick={() => { setPage("about"); setShowLanding(false); }} style={{
              padding: "15px 34px", borderRadius: 30,
              border: "2px solid #b2ebf2", background: "rgba(255,255,255,0.85)",
              color: "#0891b2", fontWeight: 700, fontSize: 16, cursor: "pointer",
            }}>LEARN MORE</button>
          </div>
          <div className="stats-row" style={{ display: "flex", gap: 36, marginTop: 48 }}>
            {[["95%", "Accuracy Rate"], ["100+", "Diseases"], ["Instant", "Results"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0891b2" }}>{n}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual */}
        <div className="hero-visual" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "relative", width: 320, height: 320 }}>
            <div style={{
              position: "absolute", inset: "18%", borderRadius: "50%",
              background: "conic-gradient(from 0deg,#06b6d4,#3b82f6,#8b5cf6,#06b6d4)",
              boxShadow: "0 0 60px #06b6d455",
              animation: "spin 14s linear infinite",
            }}>
              <div style={{
                position: "absolute", inset: 4, borderRadius: "50%",
                background: "linear-gradient(135deg,#e0f7fa,#bfdbfe)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 52, color: "#0891b2", fontWeight: 900,
              }}>+</div>
            </div>
            {[
              { label: "Fever", top: "6%", left: "-8%" },
              { label: "AI Model", top: "4%", right: "-10%" },
              { label: "Diagnosis", bottom: "6%", left: "-4%" },
              { label: "Diet Plan", bottom: "4%", right: "-6%" },
            ].map(({ label, ...pos }) => (
              <div key={label} style={{
                position: "absolute", ...pos,
                background: "rgba(255,255,255,0.92)", borderRadius: 12,
                padding: "8px 14px", fontSize: 12, fontWeight: 600,
                color: "#0891b2", border: "1px solid #b2ebf2",
                boxShadow: "0 4px 16px #06b6d420", backdropFilter: "blur(8px)",
                animation: "floatUp 3s ease-in-out infinite",
              }}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div className="feat-strip" style={{
        display: "flex", justifyContent: "center", gap: 20,
        padding: "0 40px 72px", flexWrap: "wrap", maxWidth: 1280, margin: "0 auto",
      }}>
        {[
          { icon: "AI", title: "CatBoost AI", desc: "Trained on thousands of real cases" },
          { icon: "D", title: "Diet Plans", desc: "Clinically-sourced meal advice" },
          { icon: "F", title: "Instant Results", desc: "Predictions in milliseconds" },
          { icon: "P", title: "Private & Safe", desc: "No data stored or shared" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="feat-card" style={{
            background: "rgba(255,255,255,0.85)", borderRadius: 20,
            padding: "22px 26px", minWidth: 190, flex: "1 1 190px", maxWidth: 260,
            border: "1px solid #e0f7fa", backdropFilter: "blur(8px)",
            boxShadow: "0 2px 16px #06b6d412",
            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, marginBottom: 12,
              background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 13,
            }}>{icon}</div>
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4, fontSize: 14 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Mobile bottom tab bar */}
      <div className="mobile-tab-bar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(255,255,255,0.97)", borderTop: "1px solid #e0f7fa",
        backdropFilter: "blur(12px)", padding: "10px 0 14px",
        justifyContent: "space-around", alignItems: "center",
      }}>
        {[
          { label: "Home", icon: "🏠", action: () => { } },
          { label: "About", icon: "ℹ️", action: () => { setPage("about"); setShowLanding(false); } },
          { label: user ? "History" : "Login", icon: "👤", action: () => user ? (setPage("history"), setShowLanding(false)) : (setPage("login"), setShowLanding(false)) },
        ].map(({ label, icon, action }) => (
          <button key={label} onClick={action} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "4px 12px",
          }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#0891b2" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Chatbot FAB ─────────────────────────────────────────── */}
      <button
        className="chat-fab"
        onClick={() => setChatOpen(o => !o)}
        style={{
          position: "fixed", bottom: 88, right: 28, zIndex: 300,
          width: 58, height: 58, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
          color: "#fff", fontSize: 26, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 28px #06b6d455",
        }}
        title="Ask MediPredict Assistant"
      >
        {chatOpen ? "✕" : "🩺"}
      </button>

      {/* ── Chatbot Window ──────────────────────────────────────── */}
      {chatOpen && (
        <div className="chat-window" style={{
          position: "fixed", bottom: 158, right: 24, zIndex: 299,
          width: 360, maxWidth: "calc(100vw - 32px)",
          borderRadius: 24, overflow: "hidden",
          background: "#fff", boxShadow: "0 16px 64px #06b6d435, 0 2px 16px #0003",
          border: "1px solid #e0f7fa", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🩺</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>MediPredict Assistant</div>
              <div style={{ color: "#bae6fd", fontSize: 11, marginTop: 1 }}>Ask me anything about MediPredict</div>
            </div>
            <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex",
            flexDirection: "column", gap: 10, maxHeight: 340, minHeight: 200,
            background: "linear-gradient(180deg,#f0fdff 0%,#fff 100%)",
          }}>
            {chatMsgs.map((m, i) => (
              <div key={i} className="chat-msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "bot" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>🩺</div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "#fff",
                  color: m.role === "user" ? "#fff" : "#1e293b",
                  fontSize: 13, lineHeight: 1.6,
                  boxShadow: m.role === "user" ? "0 3px 12px #06b6d435" : "0 2px 10px #0000000d",
                  border: m.role === "bot" ? "1px solid #e0f7fa" : "none",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🩺</div>
                <div style={{ background: "#fff", border: "1px solid #e0f7fa", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center", boxShadow: "0 2px 10px #0000000d" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`dot${i + 1}`} style={{ width: 7, height: 7, borderRadius: "50%", background: "#06b6d4" }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* FAQ chips */}
          {chatMsgs.length <= 2 && (
            <div style={{ padding: "8px 14px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FAQ_CHIPS.map(q => (
                <button key={q} className="faq-chip" onClick={() => sendChat(q)} style={{
                  padding: "5px 11px", borderRadius: 12, border: "1px solid #b2ebf2",
                  background: "#f0fdff", color: "#0891b2", fontSize: 11, fontWeight: 600,
                  cursor: "pointer",
                }}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "12px 14px 16px", display: "flex", gap: 8 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Ask about MediPredict..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 14,
                border: "1.5px solid #e0f7fa", outline: "none",
                fontSize: 13, color: "#1e293b", background: "#f8fafc",
                fontFamily: "inherit",
              }}
            />
            <button
              className="chat-send"
              onClick={() => sendChat()}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                width: 40, height: 40, borderRadius: 13, border: "none",
                background: chatLoading || !chatInput.trim() ? "#e0f7fa" : "linear-gradient(135deg,#06b6d4,#3b82f6)",
                color: chatLoading || !chatInput.trim() ? "#94a3b8" : "#fff",
                fontSize: 18, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >➤</button>
          </div>
        </div>
      )}

    </div>
  );
  if (!showLanding && page === "about") {
    return <AboutPage onBack={() => { setShowLanding(true); setPage("home"); }} user={user} onLogout={logoutUser} />;
  }

  // ── Login Page ────────────────────────────────────────────────────
  if (!showLanding && page === "login") {
    return <LoginPage onLogin={(u) => { loginUser(u); setPage("home"); setShowLanding(false); }} onBack={() => { setShowLanding(true); setPage("home"); }} />;
  }

  // ── History Page ──────────────────────────────────────────────────
  if (!showLanding && page === "history") {
    return <HistoryPage user={user} history={predictionHistory} onBack={() => setShowLanding(true)} onLogout={logoutUser} />;
  }

  // ── App Shell ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "linear-gradient(160deg,#f0fdff 0%,#e0f2fe 60%,#f0fdf4 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { width: 100%; min-height: 100vh; }
        .chip-btn { transition: all 0.15s; }
        .chip-btn:hover { transform: scale(1.03); }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .action-btn { transition: all 0.15s; }
        input[type=number] { background: #ffffff !important; color: #0f172a !important; color-scheme: light; }
        .age-slider { -webkit-appearance: none; appearance: none; height: 6px; background: transparent; outline: none; }
        .age-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#06b6d4,#3b82f6); cursor: pointer; box-shadow: 0 2px 8px #06b6d450, 0 0 0 3px #fff, 0 0 0 5px #06b6d430; transition: transform 0.15s; }
        .age-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .age-slider::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#06b6d4,#3b82f6); cursor: pointer; border: none; box-shadow: 0 2px 8px #06b6d450; }
        .age-slider::-webkit-slider-runnable-track { background: transparent; }
        .age-slider::-moz-range-track { background: transparent; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f0fdff; border-radius: 99px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#06b6d4,#3b82f6); border-radius: 99px; border: 2px solid #f0fdff; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg,#0891b2,#1d4ed8); }
        ::-webkit-scrollbar-corner { background: transparent; }
        * { scrollbar-width: thin; scrollbar-color: #06b6d4 #f0fdff; }
        @media (max-width: 600px) {
          .app-nav { padding: 12px 16px !important; }
          .app-content { padding: 24px 14px 40px !important; }
          .step-grid { max-height: none !important; }
          .pred-grid { grid-template-columns: 1fr !important; }
          .result-banner { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; padding: 20px 18px !important; }
          .result-banner-text { font-size: 20px !important; }
          .details-card { padding: 22px 16px !important; }
          .detail-nav-btns { flex-direction: column !important; }
        }
      `}</style>

      {/* Nav */}
      <nav className="app-nav" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 36px", background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #e0f7fa",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 16,
          }}>+</div>
          <span style={{ fontSize: 19, fontWeight: 800, background: "linear-gradient(90deg,#0891b2,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediPredict</span>
        </div>
        <button onClick={() => setShowLanding(true)} style={{
          padding: "7px 18px", borderRadius: 18, border: "1.5px solid #b2ebf2",
          background: "transparent", color: "#0891b2", fontWeight: 600,
          fontSize: 13, cursor: "pointer",
        }}>← Home</button>
      </nav>

      <div className="app-content" style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 56px" }}>
        <StepBar step={step} />

        {/* ── STEP 0: Details ── */}
        {step === 0 && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Tell Us About Yourself
            </h2>
            <p style={{ textAlign: "center", color: "#64748b", marginBottom: 32, fontSize: 14 }}>
              This helps our AI give more accurate predictions
            </p>

            <div className="details-card" style={{
              background: "#fff", borderRadius: 22, padding: "32px 28px",
              border: "1px solid #e0f7fa", boxShadow: "0 6px 32px #06b6d412",
            }}>
              {/* Age */}
              <div style={{ marginBottom: 30 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>Age</label>
                  <div style={{
                    minWidth: 52, textAlign: "center",
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    color: "#fff", fontWeight: 800, fontSize: 16,
                    borderRadius: 12, padding: "4px 14px",
                    boxShadow: "0 2px 10px #06b6d440",
                  }}>{age || 25}</div>
                </div>
                <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
                  {/* Track background */}
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 6,
                    background: "#e0f7fa", borderRadius: 6,
                  }} />
                  {/* Filled track */}
                  <div style={{
                    position: "absolute", left: 0, height: 6,
                    width: `${((Number(age || 25) - 1) / 119) * 100}%`,
                    background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                    borderRadius: 6, transition: "width 0.1s",
                    pointerEvents: "none",
                  }} />
                  <input
                    type="range"
                    min={1} max={120} step={1}
                    value={age || 25}
                    onChange={e => setAge(e.target.value)}
                    style={{ position: "relative", width: "100%", margin: 0, cursor: "pointer" }}
                    className="age-slider"
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>1</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>120</span>
                </div>
              </div>

              {/* Sex */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>Sex</label>
                  <div style={{
                    minWidth: 52, textAlign: "center",
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    color: "#fff", fontWeight: 800, fontSize: 14,
                    borderRadius: 12, padding: "4px 14px",
                    boxShadow: "0 2px 10px #06b6d440",
                  }}>{sex}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {["Male", "Female"].map(g => (
                    <button key={g} onClick={() => setSex(g)} style={{
                      flex: 1, padding: "13px 0", borderRadius: 13,
                      border: sex === g ? "2px solid #06b6d4" : "1.5px solid #e2e8f0",
                      background: sex === g ? "linear-gradient(135deg,#e0f7fa,#bfdbfe)" : "#fff",
                      color: sex === g ? "#0891b2" : "#64748b",
                      fontWeight: sex === g ? 700 : 400,
                      cursor: "pointer", transition: "all 0.15s", fontSize: 14,
                    }}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Region */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>Region</label>
                  <div style={{
                    textAlign: "center",
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    color: "#fff", fontWeight: 800, fontSize: 12,
                    borderRadius: 12, padding: "4px 14px",
                    boxShadow: "0 2px 10px #06b6d440",
                  }}>🌍</div>
                </div>
                <select
                  value={region} onChange={e => setRegion(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 13,
                    border: "1.5px solid #b2ebf2", fontSize: 14,
                    color: "#0f172a", background: "#fff", outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {[
                    "Kerala, India", "Tamil Nadu, India", "Karnataka, India",
                    "Maharashtra, India", "Rajasthan, India", "Punjab, India",
                    "West Bengal, India", "Andhra Pradesh, India", "Gujarat, India",
                    "North India (General)", "South India (General)", "East India (General)", "West India (General)",
                    "Sri Lanka", "Bangladesh", "Pakistan", "Nepal",
                    "United States", "United Kingdom", "Canada", "Australia",
                    "Middle East", "Southeast Asia", "Other",
                  ].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Diet Preference */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <label style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>Diet Preference</label>
                  <div style={{
                    textAlign: "center",
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    color: "#fff", fontWeight: 800, fontSize: 12,
                    borderRadius: 12, padding: "4px 14px",
                    boxShadow: "0 2px 10px #06b6d440",
                  }}>{dietPref === "Vegetarian" ? "🥦" : "🍗"}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {["Vegetarian", "Non-Vegetarian"].map(d => (
                    <button key={d} onClick={() => setDietPref(d)} style={{
                      flex: 1, padding: "13px 0", borderRadius: 13,
                      border: dietPref === d ? "2px solid #06b6d4" : "1.5px solid #e2e8f0",
                      background: dietPref === d ? "linear-gradient(135deg,#e0f7fa,#bfdbfe)" : "#fff",
                      color: dietPref === d ? "#0891b2" : "#64748b",
                      fontWeight: dietPref === d ? 700 : 400,
                      cursor: "pointer", transition: "all 0.15s", fontSize: 13,
                    }}>{d === "Vegetarian" ? "🥦 Vegetarian" : "🍗 Non-Veg"}</button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p style={{ textAlign: "center", color: "#ef4444", marginTop: 10, fontSize: 13 }}>{error}</p>}

            <div style={{ marginTop: 24 }}>
              <button
                className="action-btn"
                onClick={() => {
                  if (!age || isNaN(age) || +age < 1 || +age > 120) { setError("Please select a valid age (1–120)."); return; }
                  setError(""); setStep(1);
                }}
                style={{
                  width: "100%", padding: "14px", borderRadius: 24, border: "none",
                  background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                  color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                  boxShadow: "0 5px 20px #06b6d438",
                }}
              >Continue to Symptoms →</button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Symptoms ── */}
        {step === 1 && (
          <div>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Select Your Symptoms
            </h2>
            <p style={{ textAlign: "center", color: "#64748b", marginBottom: 24, fontSize: 14 }}>
              Tap all symptoms you're currently experiencing
            </p>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 18 }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#94a3b8", fontSize: 15, pointerEvents: "none",
              }}>&#128269;</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search symptoms..."
                style={{
                  width: "100%", padding: "13px 16px 13px 42px",
                  borderRadius: 14, border: "1.5px solid #b2ebf2",
                  fontSize: 14, outline: "none", background: "#fff",
                  color: "#0f172a",
                  boxShadow: "0 2px 12px #06b6d412",
                }}
              />
            </div>

            {/* Symptom grid */}
            <div className="step-grid" style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              maxHeight: 440, overflowY: "auto", padding: "2px 1px",
            }}>
              {filteredSymptoms.map(sym => {
                const isSelected = selected.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    className="chip-btn"
                    onClick={() => toggleSymptom(sym.id)}
                    style={{
                      padding: "9px 14px", borderRadius: 12,
                      border: isSelected ? "2px solid #06b6d4" : "1.5px solid #e2e8f0",
                      background: isSelected ? "linear-gradient(135deg,#e0f7fa,#b2ebf2)" : "#fff",
                      color: isSelected ? "#0e7490" : "#475569",
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: 13, cursor: "pointer",
                      boxShadow: isSelected ? "0 2px 10px #06b6d428" : "none",
                    }}
                  >{sym.label}</button>
                );
              })}
            </div>

            {/* Selected tags */}
            {selected.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 7, letterSpacing: 0.5 }}>
                  SELECTED ({selected.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {selected.map(id => {
                    const sym = symptomList.find(s => s.id === id);
                    return (
                      <span key={id} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 11px", borderRadius: 18,
                        background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                        color: "#fff", fontSize: 12, fontWeight: 600,
                      }}>
                        {sym?.label}
                        <span onClick={() => toggleSymptom(id)} style={{ cursor: "pointer", opacity: 0.75, fontSize: 14, lineHeight: 1 }}>×</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p style={{ textAlign: "center", color: "#ef4444", marginTop: 8, fontSize: 13 }}>{error}</p>}

            <div className="detail-nav-btns" style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button className="action-btn" onClick={() => { setError(""); setStep(0); }} style={{
                flex: 1, padding: "13px", borderRadius: 22,
                border: "1.5px solid #b2ebf2", background: "#fff",
                color: "#0891b2", fontWeight: 700, cursor: "pointer", fontSize: 14,
              }}>← Back</button>
              <button
                className="action-btn"
                onClick={handlePredict}
                disabled={loading}
                style={{
                  flex: 2, padding: "13px", borderRadius: 22, border: "none",
                  background: selected.length > 0 ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "#e2e8f0",
                  color: selected.length > 0 ? "#fff" : "#94a3b8",
                  fontWeight: 700, fontSize: 15,
                  cursor: loading || selected.length === 0 ? "not-allowed" : "pointer",
                  boxShadow: selected.length > 0 ? "0 5px 20px #06b6d438" : "none",
                }}
              >
                {loading ? "Analysing..." : `Get Prediction (${selected.length} symptom${selected.length !== 1 ? "s" : ""}) →`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Results ── */}
        {step === 2 && result && (
          <div ref={resultRef}>

            {/* ── HERO: Top condition large + prominent ── */}
            <div className="result-banner" style={{
              background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 60%,#8b5cf6 100%)",
              borderRadius: 26, padding: "36px 36px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 30, color: "#fff",
              boxShadow: "0 8px 40px #06b6d450", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", right: 40, bottom: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <CircleProgress value={result.predictions[0].confidence} color="#fff" size={110} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 8, letterSpacing: 1.5 }}>MOST LIKELY CONDITION</div>
                <div className="result-banner-text" style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, lineHeight: 1.15 }}>{toSentenceCase(result.predictions[0].disease)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 28, fontWeight: 900 }}><AnimatedPercent value={result.predictions[0].confidence} /></div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>confidence score</div>
                </div>
              </div>
            </div>

            {/* ── Disease Summary card ── */}
            {result.disease_summary && (
              <div style={{
                background: "#fff", borderRadius: 20, border: "1px solid #e0f7fa",
                padding: "20px 24px", marginBottom: 20,
                boxShadow: "0 4px 20px #06b6d412",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>ℹ️</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1 }}>ABOUT THIS CONDITION</div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: "#334155", margin: 0 }}>{cleanMealPlan(result.disease_summary)}</p>
              </div>
            )}

            {/* ── Other predictions — compact horizontal row ── */}
            {result.predictions.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 10 }}>OTHER POSSIBILITIES</div>
                <div className="pred-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {result.predictions.slice(1).map((pred, i) => (
                    <div key={i} style={{
                      background: "#fff", borderRadius: 14, padding: "14px 16px",
                      border: "1px solid #e0f7fa", display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: "#f0fdff", border: "2px solid #b2ebf2",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color: confidenceColor(pred.confidence),
                      }}>{Math.round(pred.confidence * 100)}%</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{toSentenceCase(pred.disease)}</div>
                        <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, marginTop: 6, overflow: "hidden", width: 80 }}>
                          <div style={{ height: "100%", borderRadius: 4, background: confidenceColor(pred.confidence), width: `${Math.round(pred.confidence * 100)}%`, transition: "width 1s ease" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Combined Diet + Meal Plan card ── */}
            <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e0f7fa", overflow: "hidden", boxShadow: "0 4px 24px #06b6d415", marginBottom: 20 }}>

              {/* Diet tags header */}
              <div style={{ padding: "22px 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🥗</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Diet & Meal Plan</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>For {toSentenceCase(result.diet_recommendations.disease)}</div>
                  </div>
                </div>
              </div>

              {/* Recommended foods */}
              {result.diet_recommendations.sourced_from_csv.length > 0 && (
                <div style={{ padding: "14px 24px", borderBottom: "1px solid #f0fdff" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1, marginBottom: 10 }}>RECOMMENDED FOODS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {result.diet_recommendations.sourced_from_csv.map(item => (
                      <span key={item} style={{
                        padding: "6px 14px", borderRadius: 20,
                        background: "linear-gradient(135deg,#e0f7fa,#bfdbfe)",
                        color: "#0891b2", fontWeight: 600, fontSize: 12,
                        border: "1px solid #b2ebf2",
                      }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Meal plan with colored meal labels */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1, marginBottom: 14 }}>AI-GENERATED MEAL PLAN</div>
                <ColoredMealPlan text={cleanMealPlan(result.diet_recommendations.meal_plan)} />
              </div>
            </div>

            {/* Actions */}
            <div className="detail-nav-btns" style={{ display: "flex", gap: 10 }}>
              <button className="action-btn" onClick={() => { setStep(0); setResult(null); setSelected([]); setAge("25"); setSearch(""); setSex("Male"); setRegion("Kerala, India"); setDietPref("Vegetarian"); }} style={{
                flex: 1, padding: "13px", borderRadius: 22, border: "1.5px solid #b2ebf2",
                background: "#fff", color: "#0891b2", fontWeight: 700, cursor: "pointer", fontSize: 13,
              }}>Start Over</button>
              <button className="action-btn" onClick={() => setStep(1)} style={{
                flex: 1, padding: "13px", borderRadius: 22, border: "none",
                background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
                boxShadow: "0 4px 16px #06b6d438",
              }}>Refine Symptoms</button>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 20 }}>
              MediPredict is not a substitute for professional medical advice. Always consult a qualified healthcare professional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
