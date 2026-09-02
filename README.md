# SkillNova AI: Implementation & Architecture Plan

## Architecture Overview
SkillNova AI is a full-stack AI-powered career guidance platform that analyzes a student's resume and profile details along with their preferred job role. It evaluates the match between the student's skills and potential career roles, recommends the top 3 suitable job roles with match percentages, identifies missing skills, and provides a personalized career and skill-development path.

### Tech Stack
* **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Framer Motion
* **Backend**: FastAPI (Python)
* **Database**: PostgreSQL with SQLAlchemy ORM
* **ML/NLP**: spaCy (NER for resume parsing), Scikit-Learn (TF-IDF & Cosine Similarity)

## Directory Structure Generated
```
/mp
│
├── frontend/                     # React + Vite Application
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css             # Base & Glassmorphism styles
│       ├── components/
│       │   └── Navbar.jsx
│       └── pages/
│           ├── Dashboard.jsx     # Analytics & Match results
│           └── ProfileForm.jsx   # Resume upload & Profile inputs
│
└── backend/                      # FastAPI Application
    ├── requirements.txt
    ├── main.py                   # API Entrypoint
    ├── database.py               # PostgreSQL DB Config
    ├── models/
    │   └── user.py               # DB Schemas
    └── services/
        └── matcher.py            # AI matching & TF-IDF Logic
```

## How to Run the Application Locally

### 1. Setup Backend (FastAPI + ML)
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
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

## Next Implementation Steps for You
1. **Resume Parser Implementation**: Integrate `spaCy` to extract entities directly from the uploaded file (PDF/DOC) in the `/api/resume/upload` route.
2. **Authentication Flow**: Implement the `passlib` & `python-jose` logic to secure routes.
3. **Connect Frontend to Backend**: Replace the mock data in the React frontend with `axios` calls to your running FastAPI backend.
