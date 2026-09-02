# SkillNova AI: Implementation & Architecture Plan

## Architecture Overview
SkillNova AI is a full-stack AI-powered career guidance platform that analyzes a student's resume and profile details along with their preferred job role. It evaluates the match between the student's skills and potential career roles, recommends the top 3 suitable job roles with match percentages, identifies missing skills, and provides a personalized career and skill-development path.

## 📌 Problem Statement

Students often have difficulty identifying which career or job role best matches their current skills.

A student may:

- Have technical skills but not know which job role suits them.
- Choose a preferred job role without knowing how well their profile matches it.
- Be unaware of the skills required for a particular career.
- Have difficulty identifying their skill gaps.
- Not know what skills they should learn next.

SkillNova AI addresses these challenges by analyzing the student's available information and providing personalized, data-driven career recommendations.

---

# 💡 Solution

SkillNova AI combines **resume analysis, student profile information, preferred career choices, Natural Language Processing (NLP), and Machine Learning-based text similarity** to generate personalized career recommendations.

The system provides:

### 🎯 Career Recommendations
Recommends the **Top 3 suitable job roles** based on the student's profile.

### 📊 Match Percentage
Shows how closely the student's current profile matches each recommended job role.

### 🔍 Skill Gap Analysis
Identifies skills that are missing or need improvement for the selected career path.

### 🛠️ Skill Recommendations
Suggests skills that the student should develop to improve their suitability for the desired career.

### 🛣️ Career Development Path
Provides a personalized skill-development path based on the student's current skills and identified gaps.

---

# ✨ Key Features

## 📄 Resume Analysis

Analyzes relevant information and skills from the student's resume and uses this information during career matching.

---

## 👤 Student Profile Analysis

Considers student-provided information along with resume information.

The profile can include:

- Student details
- Education
- Technical skills
- Interests
- Experience
- Preferred job role
- Other relevant career information

---

## 🎯 Preferred Job Role

Allows students to specify their preferred career or job role.

The preferred role is considered during the matching and skill-gap analysis process.

---

## 🏆 Top 3 Suitable Job Roles

The system identifies and ranks the **Top 3 suitable job roles** based on the student's available information.

Example:

| Rank | Job Role | Match |
|------|----------|-------|
| 🥇 1 | Machine Learning Engineer | 87% |
| 🥈 2 | Data Scientist | 82% |
| 🥉 3 | Data Analyst | 76% |

> The percentages above are example values only.

---

## 📊 Job Match Percentage

The platform calculates a match score between the student's profile and potential job roles.

The matching process can be represented as:

```text
Student Profile
       ↓
Skill / Information Analysis
       ↓
Job Role Requirements
       ↓
Text Vectorization
       ↓
Similarity Calculation
       ↓
Match Percentage

### Tech Stack
* **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Framer Motion
* **Backend**: FastAPI (Python)
* **Database**: PostgreSQL with SQLAlchemy ORM
* **ML/NLP**: spaCy (NER for resume parsing), Scikit-Learn (TF-IDF & Cosine Similarity)

## 📁 Project Structure

```text
SkillNova-AI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── ProfileForm.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── backend/
│   ├── models/
│   │   └── user.py
│   │
│   ├── services/
│   │   └── matcher.py
│   │
│   ├── main.py
│   ├── database.py
│   └── requirements.txt
│
├── test_predict.py
├── test_predict_lowercase.py
├── package-lock.json
└── README.md
## How to Run the Application Locally

 1. Setup Backend (FastAPI + ML)
### 1. Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```d
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will be available at `http://127.0.0.1:8000`. You can view the swagger UI at `http://127.0.0.1:8000/docs`.*

### 2. Setup Database (PostgreSQL)
1. Ensure PostgreSQL is installed on your Windows machine.
2. Create a new database named `skillnova`.
3. Update the `DATABASE_URL` in `backend/database.py` with your credentials:
   `postgresql://postgres:YOUR_PASSWORD@localhost/skillnova`

### 3. Setup Frontend (React + Vite)
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*
