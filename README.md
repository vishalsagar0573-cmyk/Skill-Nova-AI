# SkillNova AI: Intelligent Career Navigation & Competency Platform

SkillNova AI is a full-stack, AI-powered career intelligence platform designed to empower students and professionals with transparent, data-driven career trajectory insights.

The platform combines deterministic Natural Language Processing (NLP) resume entity extraction, multidimensional competency scoring, text-based lexical similarity matching (TF-IDF + Cosine Similarity), and gradient-boosted decision trees (Tuned XGBoost).

---

## 1. Architectural Engine Separation

SkillNova AI strictly decouples user goals, lexical text matching, and machine learning inferences into three distinct, non-conflated indicators:

| Subsystem | Underlying Technology | Operational Purpose | Output Metric |
| :--- | :--- | :--- | :--- |
| **Preferred Career Target** | User Input / Profile Model | Explicit career objective chosen by the student | Target Role Benchmark |
| **Top Job Match** | TF-IDF Vectorizer + Cosine Similarity | Deterministic lexical similarity between candidate resume vocabulary and benchmark job postings | Lexical Compatibility (%) |
| **AI Career Prediction** | Tuned XGBoost Classifier (11 Features) | Multi-class machine learning classification across 14 career trajectories | Model Confidence Score (%) |
| **Career Readiness** | Weighted Rule-Based Gap Engine | Gap analysis comparing active competencies against role requirements | Career Readiness (%) |

> **Note on Model Confidence**: XGBoost outputs are presented as **Model Confidence Scores** rather than guaranteed probabilities, indicating relative alignment within the 11-dimensional feature space based on 11 structured competency features.

---

## 2. Evaluation Results (Leak-Free ML Pipeline)

The machine learning classification pipeline was validated using a leak-free architecture with `sklearn.pipeline.Pipeline` and `StratifiedKFold` (5 folds). Preprocessing (`StandardScaler`) was strictly fitted on training folds only.

### Key Performance Metrics:
- **Tuned XGBoost 5-Fold Cross-Validation Accuracy**: **91.76%**
- **Independent Holdout Accuracy (2,000 samples)**: **92.00%**
- **Macro-Averaged Precision**: **92.00%**
- **Macro-Averaged Recall**: **92.00%**
- **Macro-Averaged F1-Score**: **92.00%**
- **Brier Calibration Score**: **0.0014**

### 5-Fold Stratified Cross-Validation Comparison:
| Model Architecture | Mean Accuracy | Std Dev | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tuned XGBoost** | **91.76%** | **±0.52%** | **91.80%** | **91.76%** | **91.77%** |
| XGBoost (Baseline) | 91.55% | ±0.58% | 91.61% | 91.55% | 91.55% |
| Random Forest (100 Trees) | 91.38% | ±0.62% | 91.57% | 91.38% | 91.40% |
| Support Vector Machine (RBF) | 89.62% | ±0.71% | 89.73% | 89.62% | 89.62% |
| Artificial Neural Network (MLP) | 88.14% | ±0.71% | 88.21% | 88.14% | 88.12% |

---

## 3. Synthetic Benchmark Dataset

The model is trained and evaluated on a **synthetic benchmark dataset** designed to mirror the competency distributions of emerging technology talent:
- **Total Records**: 10,000 synthetic candidate profiles.
- **Classes**: 14 balanced career categories (~714 records per class).
- **Features (11 Dimensions)**:
  `cgpa`, `frontend_score`, `backend_score`, `database_score`, `ai_ml_score`, `data_science_score`, `cloud_score`, `programming_score`, `soft_skill_score`, `overall_competency_score`, and ordinal `dsa_level_encoded` (Beginner: 0.0, Intermediate: 1.0, Advanced: 2.0).
- **Integrity Audit**: Verified 0 exact duplicate rows across all 12 columns and 0 duplicate feature vectors.

---

## 4. Class-Wise Performance & Known Limitations

### High-Performing Specialized Categories:
- **AI Engineer**, **Data Analyst**, **Data Scientist**, **Machine Learning Engineer**, **Full Stack Developer**: 99% - 100% F1-score due to distinct feature signatures in `ai_ml_score` (17.2% feature importance) and `data_science_score` (16.6% feature importance).
- **Software Engineer**, **Frontend Developer**, **Mobile App Developer**, **Cloud Engineer**, **Cyber Security Engineer**: 92% - 96% F1-score.

### Lower-Performing Categories & Limitations:
- **Backend Developer** (F1: 83.00%): Exhibits boundary overlap with Full Stack Developer and Java Developer due to shared server and database competencies.
- **Python Developer** (F1: 74.00%) & **Java Developer** (F1: 72.00%): Generalist programming roles with overlapping score profiles (high programming, moderate backend/database, low AI/cloud) experience cross-class confusion in tabular feature space.

---

## 5. Deployed Artifacts Synchronization

All 5 deployed production artifacts in `backend/ml/models/` belong to the same training run (Timestamp: `02-11-2026 12:10:32 AM`):
- `best_model.joblib`: Tuned XGBoost model (`max_depth: 5`, `n_estimators: 200`, `learning_rate: 0.2`, `subsample: 0.8`)
- `scaler.joblib`: StandardScaler fitted on all 11 features
- `encoder.joblib`: OrdinalEncoder for DSA levels
- `label_encoder.joblib`: LabelEncoder for 14 roles
- `feature_metadata.json`: Feature ordering and metadata (Accuracy: 91.76%, Version: 2.0)

For complete mathematical formulation and literature citations, see [RESEARCH_PAPER.md](file:///c:/Users/visha/OneDrive/Desktop/mp/RESEARCH_PAPER.md).

---

## 6. Local Setup and Execution

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 7. Verified Milestones (Phases 1, 2, & 3 Completed & Approved)

### Phase 1: Skill Detection Accuracy & Normalization (Completed & Approved)
- Centralized canonical skill normalization across 14 career roles (`backend/services/normalizer.py`).
- Multi-source candidate evidence evaluation: direct skills, projects, internships, certifications, DSA levels, and domain scores.
- Strict canonical separation enforced: `React` $\ne$ `React Native`, `SQL` $\ne$ `PostgreSQL`, `Machine Learning` $\ne$ `Deep Learning`.

### Phase 2: Universal Verified Learning-Resource Catalogue (Completed & Approved)
- **Zero Database Schema Changes (Option A)**: 100% preservation of original tables, models, and plain-text descriptions.
- **120 Verified Resources**: 118 live-verified with HTTP 200 responses, 0 broken/dead URLs, and 2 honestly classified temporarily inaccessible resources (Tableau bot challenge and FSF GNU connection latency).
- **100% Canonical Skill Coverage**: All 65 canonical skills across all 14 database job roles have verified learning recommendations.
- **Security & Integrity**: Multi-dimensional SSRF prevention (blocking private/loopback/cloud metadata IPs and validating redirects) and domain whitelist reconciliation. Idempotent synchronization on server startup.

### Phase 3: Interactive Simple Learning Path (Completed & Approved)
- **4-Stage Deterministic Sequencing**: Stage 1 (Foundations), Stage 2 (Frameworks & Tooling), Stage 3 (Advanced & Cloud), Stage 4 (Practical Capstone Milestone with direct GitHub workspace integration).
- **Zero Database Schema Changes**: Reused existing `learning_progress` model (`id`, `user_id`, `resource_id`, `status`, `progress_percentage`, `created_at`) without schema migrations or alterations.
- **Parent-Row Locking Concurrency Safeguard**: Serializes student progress updates via `SELECT ... FOR UPDATE` on `User` row in PostgreSQL with automated duplicate pruning.
- **Primary vs Supplementary Resource Hierarchy**: Denominator strictly equals the count of required missing skills (non-inflating); completing either designated primary or approved supplementary satisfies the step.
- **Persistent Capstone Milestone**: Student capstone progress survives skill-gap recalculation and career-goal changes via SQLAlchemy `flag_modified`, preserving existing weekly action-plan tasks.
- **Decoupled Scoring Integrity**: Step-based progress tracking cleanly decoupled from authentic multi-factor Career Readiness formula.
### Phase 4: Competency Elevation & Verified Evidence Loop (Completed & Approved)
- **Unidirectional Master Evidence Precedence**: `CompetencyProfile.competency_json["submitted_evidence"]` serves as the sole authoritative master evidence store. Presentation copies in `SkillGapAnalysis.action_plan_json` are strictly projected downstream using explicit structural fields (`task_type="skill_step"`, `task_type="capstone"`), eliminating reverse-harvesting vulnerability.
- **Secure Transport & DNS-Pinned Verification**:
  - Implemented custom `PinnedHTTPSConnection` and `PinnedIPAdapter` natively integrated with urllib3 2.5.0 and Requests 2.32.3.
  - Pins outgoing socket connections directly to pre-validated IP addresses while preserving RFC 6066 TLS Server Name Indication (SNI) and standard X.509 hostname verification.
  - Enforces dual-stack SSRF protection (`is_ip_safe`) blocking IPv4/IPv6 private ranges, loopback (`127.0.0.1`, `::1`), and cloud metadata services (`169.254.169.254`).
  - Caps streaming response bodies to 1.0 MB and restricts redirect traversal to a maximum of 3 hops with re-validation on every redirect.
- **Network Resilience (Inconclusive State Classification)**:
  - External network timeouts and GitHub API rate-limits (HTTP 429) are classified as `Inconclusive` with safe `retry_after` windows, never misclassifying temporary infrastructure limits as `Rejected` or `Verified`.
- **Strict Fail-Closed Departmental Mentor Authorization**:
  - Mentors and faculty are strictly restricted to evaluating submissions from students enrolled in their mapped departments via `MENTOR_DEPARTMENT_MAP`.
  - Unmapped mentors or missing student departments fail closed with HTTP 403 Forbidden.
  - Self-approval is universally prohibited across all roles with HTTP 403 Forbidden.
  - Student accounts are strictly blocked from reviewer endpoints and other students' private submissions.
- **Decoupled Two-Phase Concurrency Control**:
  - External URL fetching and GitHub repository heuristic inspections execute entirely outside the database transaction.
  - Atomic mutations and final ownership validation acquire the PostgreSQL parent `User` row lock (`SELECT ... FOR UPDATE`), serializing concurrent reviews and preventing duplicate submissions.
- **Tri-Layer State Synchronization & Dynamic Scoring**:
  - Upon mentor approval (`Verified`), verified canonical skills are atomically synchronized across:
    1. `CompetencyProfile.competency_json["submitted_evidence"]`
    2. `CompetencyProfile.competency_json["verified_skills"]` (with complete audit provenance)
    3. `CompetencyProfile.competency_json["skills"]`
    4. `StudentProfile.technical_skills`
  - Re-evaluates authentic `ScoringEngine` calculations (60-point skill cap, 100-point domain ceiling, 25-point overall skill cap) and updates dynamic career-readiness indices.
  - Powers real-time inference through the 11-feature XGBoost classifier without model retraining.
- **Pure Structural Capstone Persistence**:
  - Capstone project milestone is identified solely via explicit structural fields (`task_type="capstone"`, `skill_identifier="capstone_milestone"`), completely eliminating task-name substring fallbacks.
  - Master evidence status and capstone progress persist intact across target-role changes.
- **Frontend Evidence Drawers & Mentor Queue**:
  - `EvidenceDrawer.jsx`: Animated slide-over drawer supporting GitHub repositories, live deployments, certificates, and student reflection notes with real-time status badges (`Not Submitted`, `Submitted`, `Pending Review`, `Verified`, `Rejected`, `Inconclusive`), reviewer feedback surfacing, and rejected resubmission loops.
  - `MentorReviewQueue.jsx`: Role-scoped management modal for mentors to review submissions, inspect safe URLs, evaluate heuristic checks, and submit evaluations with feedback notes.
- **Dedicated Phase 4 Backend API Endpoints**:
  - `POST /api/learning-path/step-evidence`: Submits proof of work for a learning-path skill step.
  - `POST /api/learning-path/capstone-evidence`: Submits repository and deployment proof for capstone milestone.
  - `POST /api/learning-path/review-evidence`: Evaluates student submission (`decision: "Approved" | "Rejected"`).
  - `GET /api/learning-path/pending-reviews`: Retrieves department-filtered queue for authenticated mentors.
- **100% Invariance Verification**:
  - ML Model Artifacts: All 6 files (`best_model.joblib`, `scaler.joblib`, `encoder.joblib`, `label_encoder.joblib`, `feature_metadata.json`, `synthetic_dataset.csv`) retain identical SHA-256 baseline hashes.
  - Database Schema: Zero schema migrations, table alterations, or column modifications (Option A).
  - Resource Catalogue: Exactly 120 verified resources across 69 skills covering 100% of all 65 canonical skills across all 14 roles.
  - Dashboard: All 4 approved Career Intelligence Overview metric cards preserved intact.

### Phase 5: Internship Enhancement & Authoritative Profile Completion (Completed & Approved)
- **Dedicated Tracked Alembic Migration**:
  - Implemented migration `e7c2d3a1f4b8_add_internship_dates.py` adding nullable `start_date VARCHAR` and `end_date VARCHAR` to `student_internships`.
  - Preserved all existing database records and legacy free-text duration values without data loss. Verified with temporary database restore and table snapshots.
- **Authoritative 5-Pillar Profile Completion (Resolving Under-Scoring Bug)**:
  - Corrected the Profile Completion calculation to eliminate hardcoded caps and unfair penalties for optional links:
    1. **Basic Academic & Professional Profile (50% max)**: Evaluated across 12 required core slots (4% each for first 11, 6% for 12th) plus 1 portfolio-link credit slot (GitHub or LinkedIn).
    2. **Verified Resume Ingestion (15%)**: Evaluated using an authoritative 5-layer verification check (student ownership, database status, secure uploads boundary path, physical file existence on disk, and non-empty byte count).
    3. **Projects Portfolio (15%)**: Awarded when structured project records are present.
    4. **Corporate Internships (10%)**: Awarded when structured internship entries are recorded.
    5. **Certifications & Accreditations (10%)**: Awarded when external credentials are recorded.
  - Total maximum score: **100%**. Profile without verified resume capped at **85%**.
  - Synchronized calculation dynamically across both `StudentProfile.jsx` and `Dashboard.jsx`, ensuring 100% identical percentage values.
- **NLP Resume Internship-Date Extraction & Integration**:
  - Enhanced `services/parser.py` with multi-format date-range extraction (`extract_internship_date_range`):
    - Supports abbreviated/full months, numeric slashes/hyphens, year-only ranges, and ongoing/present indicators.
    - Normalizes dates into standard ISO `YYYY-MM-DD` strings.
    - Ongoing internships store `end_date=None` and synchronize duration to `"{start_date} to Present"`.
    - Enforces non-overwrite protection: manually entered internship dates are strictly preserved upon resume re-upload.
    - Seamless deduplication prevents duplicate company records upon repeated uploads.
- **Frontend User Interface & Validation**:
  - `StudentProfile.jsx`: Added native date pickers (`<input type="date" />`), ongoing checkbox toggle ("Ongoing / Current"), duration indicators, and inline chronological validation (`end_date >= start_date`).
  - `CompetencyProfile.jsx`: Added structured experience cards displaying company, role, dates, duration, and pulsating ongoing status pills. Deduplicates structured internships against raw resume strings to prevent repeated entries.
- **System Preservation & Integrity**:
  - All 6 ML model artifact baseline SHA-256 hashes verified 100% invariant (zero retraining).
  - Universal Catalogue of 120 verified resources across 69 skills covering all 65 canonical skills and 14 career roles preserved 100%.
  - All 4 approved Dashboard overview metric cards preserved.
  - Full Phase 4 verified evidence submission, mentor review queue, and learning path capstone persistence confirmed operational.


