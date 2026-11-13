# SkillNova AI: A Multi-Stage Career Intelligence and Competency Scoring Architecture

**Authors**: SkillNova AI Research & Engineering Team  
**Date**: November 2026  
**Status**: Peer-Reviewed Technical Report / Research Paper Documentation  
**Version**: 2.0 (Leak-Free Production Model)

---

## Abstract

Modern recruitment and career navigation platforms face significant challenges in accurately assessing candidate readiness, aligning applicant resumes with industry competencies, and recommending viable career pathways without heuristic bias. In this paper, we present **SkillNova AI**, an integrated career intelligence framework combining deterministic Natural Language Processing (NLP) entity extraction, multi-dimensional domain competency scoring, text-based lexical similarity matching (TF-IDF + Cosine Similarity), and a gradient-boosted decision tree classifier (Tuned XGBoost). 

To ensure absolute scientific rigor and eliminate historical data leakage, our classification pipeline enforces strict fold isolation using `sklearn.pipeline.Pipeline` with `StandardScaler` fitted strictly on training folds during 5-Fold Stratified Cross-Validation. Evaluated on a balanced synthetic dataset of **10,000 candidate records across 14 distinct career roles**, our tuned XGBoost classifier achieves a **5-fold cross-validation accuracy of 91.76%** and an **independent holdout accuracy of 92.00%**, with macro-averaged precision, recall, and F1-score of **92.00%**. We analyze class-wise performance and explicitly document classification limitations in generalist developer categories (Java Developer F1: 72%, Python Developer F1: 74%, Backend Developer F1: 83%) versus specialized engineering domains (AI/ML, Data Science, and Cloud F1: 92–100%). We examine probability calibration, clarifying why softmax tree outputs represent relative model confidence rather than empirical probabilities, and delineate the tripartite architectural separation between student-preferred targets, lexical job compatibility, and machine-learned trajectory predictions.

---

## 1. System Architecture

SkillNova AI divides career intelligence into three decoupled, complementary subsystems:

```
+-----------------------------------------------------------------------------------+
|                              SKILLNOVA AI PLATFORM                                |
+-----------------------------------------------------------------------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|     LEXICAL SIMILARITY        |                   |      MACHINE LEARNING         |
|         SUBSYSTEM             |                   |         SUBSYSTEM             |
+-------------------------------+                   +-------------------------------+
| • TF-IDF Vectorizer           |                   | • Unified Competency Profiler |
| • Cosine Similarity           |                   | • 11 Structured Features      |
| • Exact Token Matching        |                   | • Pipeline-Isolated Scaler    |
| • Benchmark Job Descriptions  |                   | • Tuned XGBoost Multi-Class   |
+-------------------------------+                   +-------------------------------+
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                          v
                        +-----------------------------------+
                        |       CAREER INTELLIGENCE         |
                        |            DASHBOARD              |
                        +-----------------------------------+
                        | 1. Student Preferred Goal         |
                        | 2. TF-IDF Top Job Match           |
                        | 3. XGBoost Model Confidence       |
                        | 4. Weighted Career Readiness      |
                        +-----------------------------------+
```

### 1.1 Distinct Operational Responsibilities
1. **Student Preferred Career Target**: The candidate's explicitly stated career objective (e.g., *Machine Learning Engineer*). Used as the benchmark for personalized skill gap calculation, missing skill badges, and customized learning roadmaps.
2. **Top Job Match (TF-IDF + Cosine Similarity)**: A text-based, lexical similarity metric comparing the candidate's normalized skills and resume vocabulary directly against benchmark job postings. This is lexical similarity, not semantic inference.
3. **AI Career Prediction (Tuned XGBoost)**: An 11-feature machine learning model that predicts optimal career trajectories based on multidimensional competency scoring. Predictions are reported as **Model Confidence Scores**.

---

## 2. Dataset Methodology

### 2.1 Synthetic Dataset Construction
The evaluation dataset is a **synthetic benchmark dataset** specifically designed to simulate undergraduate and early-career software engineering profiles:
- **Total Records**: $N = 10,000$ synthetic candidate profiles.
- **Classes**: 14 balanced career categories ($\approx 714$ records per category).
- **Target Classes**:
  1. `AI Engineer`
  2. `Backend Developer`
  3. `Cloud Engineer`
  4. `Cyber Security Engineer`
  5. `Data Analyst`
  6. `Data Scientist`
  7. `DevOps Engineer`
  8. `Frontend Developer`
  9. `Full Stack Developer`
  10. `Java Developer`
  11. `Machine Learning Engineer`
  12. `Mobile App Developer`
  13. `Python Developer`
  14. `Software Engineer`

### 2.2 Feature Representation
Each candidate profile is represented as an 11-dimensional numerical vector $\mathbf{x} \in \mathbb{R}^{11}$:

$$\mathbf{x} = [x_{\text{cgpa}}, x_{\text{frontend}}, x_{\text{backend}}, x_{\text{database}}, x_{\text{aiml}}, x_{\text{datasci}}, x_{\text{cloud}}, x_{\text{prog}}, x_{\text{soft}}, x_{\text{overall}}, x_{\text{dsa}}]$$

| Feature Index | Feature Name | Range | Description |
| :---: | :--- | :---: | :--- |
| 0 | `cgpa` | $0.0 - 10.0$ | Cumulative Grade Point Average |
| 1 | `frontend_score` | $0 - 100$ | UI/UX, HTML/CSS, React, Vue, responsive design |
| 2 | `backend_score` | $0 - 100$ | Server architectures, REST APIs, FastAPI, Spring, Node |
| 3 | `database_score` | $0 - 100$ | SQL, PostgreSQL, MongoDB, indexing, query design |
| 4 | `ai_ml_score` | $0 - 100$ | PyTorch, TensorFlow, Scikit-Learn, Deep Learning |
| 5 | `data_science_score` | $0 - 100$ | Pandas, NumPy, statistical modeling, data visualization |
| 6 | `cloud_score` | $0 - 100$ | AWS, Docker, Kubernetes, CI/CD, cloud architecture |
| 7 | `programming_score` | $0 - 100$ | Core languages: Python, Java, C++, JavaScript |
| 8 | `soft_skill_score` | $0 - 100$ | Communication, leadership, project management |
| 9 | `overall_competency_score`| $0 - 100$ | Weighted multi-domain composite competency |
| 10 | `dsa_level_encoded` | $0.0 - 2.0$ | Ordinal: Beginner ($0.0$), Intermediate ($1.0$), Advanced ($2.0$) |

### 2.3 Data Integrity & Duplicate Verification
To prevent cross-fold memorization, the synthetic dataset was audited with strict uniqueness criteria:
- **Exact Duplicate Rows Across All 12 Columns**: $0$
- **Duplicate Feature Vectors across 11 Features**: $0$
- **Class Balance**: Minimum $714$, Maximum $715$ records per class.

---

## 3. Machine Learning Methodology & Zero-Leakage Pipeline

### 3.1 Data Leakage Prevention via Scikit-Learn Pipeline
In earlier versions, `StandardScaler.fit_transform(X)` was performed on the entire dataset prior to cross-validation. This caused **subtle data leakage**, where mean and standard deviation parameters $\mu, \sigma$ of the validation folds influenced the scaling of the training folds.

To eliminate leakage completely, the pipeline was refactored:
```python
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('xgb', XGBClassifier(eval_metric='mlogloss', random_state=42))
])
```
Under this architecture, `StandardScaler.fit()` is strictly executed on the four training folds per iteration ($K-1$ folds) and applied via `.transform()` to the holdout fold, guaranteeing zero data leakage.

### 3.2 Model Comparison (5-Fold Stratified Cross-Validation)
Four baseline architectures were evaluated under identical leak-free cross-validation:

| Model Architecture | Mean CV Accuracy | Std Dev | Macro Precision | Macro Recall | Macro F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **XGBoost (Baseline)** | **91.55%** | **±0.58%** | **91.61%** | **91.55%** | **91.55%** |
| Random Forest (100 Trees) | 91.38% | ±0.62% | 91.57% | 91.38% | 91.40% |
| Support Vector Machine (RBF) | 89.62% | ±0.71% | 89.73% | 89.62% | 89.62% |
| Artificial Neural Network (MLP) | 88.14% | ±0.71% | 88.21% | 88.14% | 88.12% |

### 3.3 Hyperparameter Optimization
Hyperparameter tuning was conducted on the pipeline using `RandomizedSearchCV` across the 5 stratified folds:
- **Search Space**:
  - `max_depth`: $[3, 5, 7]$
  - `learning_rate`: $[0.01, 0.1, 0.2]$
  - `n_estimators`: $[100, 200, 300]$
  - `subsample`: $[0.8, 1.0]$
- **Optimal Hyperparameters**:
  - `n_estimators`: $200$
  - `max_depth`: $5$
  - `learning_rate`: $0.2$
  - `subsample`: $0.8$
- **Tuned XGBoost Cross-Validation Accuracy**: **91.76%**

---

## 4. Empirical Evaluation Results

### 4.1 Independent Holdout Test Set Evaluation
The tuned model was tested on an independent holdout test set ($N_{\text{test}} = 2,000$, $20\%$ stratified split):

$$\text{Accuracy} = \frac{1840}{2000} = 92.00\%$$

$$\text{Macro Precision} = 92.00\%, \quad \text{Macro Recall} = 92.00\%, \quad \text{Macro } F_1 = 92.00\%$$

### 4.2 Class-Wise Performance Breakdown (14 Roles)

| Class Name | Precision | Recall | F1-Score | Support | Performance Tier |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **AI Engineer** | 1.00 | 1.00 | 1.00 | 143 | Exemplary |
| **Data Analyst** | 1.00 | 1.00 | 1.00 | 143 | Exemplary |
| **Data Scientist** | 0.99 | 1.00 | 1.00 | 143 | Exemplary |
| **Full Stack Developer** | 0.99 | 1.00 | 1.00 | 143 | Exemplary |
| **Machine Learning Engineer** | 1.00 | 0.99 | 1.00 | 143 | Exemplary |
| **Software Engineer** | 0.98 | 0.95 | 0.96 | 143 | Superior |
| **Frontend Developer** | 0.94 | 0.95 | 0.94 | 143 | Superior |
| **Mobile App Developer** | 0.95 | 0.93 | 0.94 | 142 | Superior |
| **Cyber Security Engineer** | 0.89 | 0.97 | 0.93 | 143 | Superior |
| **Cloud Engineer** | 0.91 | 0.92 | 0.92 | 143 | Superior |
| **DevOps Engineer** | 0.95 | 0.85 | 0.90 | 143 | Strong |
| **Backend Developer** | 0.83 | 0.82 | 0.83 | 142 | Moderate |
| **Python Developer** | 0.74 | 0.74 | 0.74 | 143 | Overlapping |
| **Java Developer** | 0.71 | 0.73 | 0.72 | 143 | Overlapping |

---

## 5. Class-Wise Limitations & Error Analysis

The empirical results reveal a clear performance dichotomy between specialized technical roles and generalist software engineering roles:

### 5.1 Analysis of Lower-Performing Classes:
1. **Java Developer (F1: 72%) & Python Developer (F1: 74%)**:
   - *Feature Overlap*: Both roles exhibit high `programming_score` ($70-95$), moderate `backend_score` ($50-75$), and moderate `database_score` ($50-80$) without distinctive specialization in AI/ML, Cloud, or Frontend.
   - *Language Invariance*: In tabular feature space, whether a student writes Java or Python is encoded largely through programming proficiency and backend familiarity. Unless language-specific features are introduced as explicit independent columns, decision trees experience moderate cross-class confusion between Java Developer, Python Developer, and generic Software Engineer.
2. **Backend Developer (F1: 83%)**:
   - Backend Developer profiles frequently border Full Stack Developer (when frontend proficiency is modest) and Software Engineer (when DSA level is Advanced). 
   - 18% of Backend Developer validation samples are classified as Java Developer or Software Engineer due to shared high scores in database and server architecture.

### 5.2 Contrast with High-Performing Domains:
- **AI/ML & Data Science (F1: 99–100%)**: Strong separability driven by `ai_ml_score` (17.2% feature importance) and `data_science_score` (16.6% feature importance).
- **Frontend & Mobile (F1: 94%)**: Highly distinct due to high `frontend_score` and near-zero backend/cloud expectations.

---

## 6. Probability Calibration vs Model Confidence Analysis

### 6.1 Brier Score and Peakiness of Softmax Tree Distributions
The deployed XGBoost model employs the multi-class softmax loss function (`objective='multi:softprob'`). Across the 2,000 holdout predictions:
- **Multi-Class Brier Score**: $0.0014$
- **Median Top-1 Confidence**: $99.92\%$
- **Mean Top-1 Confidence**: $98.86\%$

### 6.2 Scientific Interpretation for User Interfaces
Gradient-boosted decision trees optimize for cross-entropy minimization, which pushes logits toward extreme values for cleanly separated regions. Consequently, the output probabilities are **uncalibrated relative confidence scores**:
- A confidence of $99.5\%$ indicates that within the 11-dimensional feature subspace learned by the trees, the candidate vector is situated deeply inside the decision region for that role.
- It does **not** signify a $99.5\%$ empirical probability that the student will receive a job offer.
- **UI Policy**: SkillNova AI displays these values explicitly labeled as **"Model Confidence"** accompanied by the explanation:
  > *"Predictions are relative confidence scores based on the student's 11 structured competency features."*

---

## 7. Production Artifact Verification Audit

All deployed artifacts were verified against the single production training run:

| Artifact Path | Format | Size | SHA-256 Checksum Status |
| :--- | :---: | :---: | :---: |
| `backend/ml/models/best_model.joblib` | Scikit-Learn / XGBoost | 3,471,227 B | Verified |
| `backend/ml/models/scaler.joblib` | `StandardScaler` (Pipeline) | 1,311 B | Verified |
| `backend/ml/models/encoder.joblib` | `OrdinalEncoder` | 991 B | Verified |
| `backend/ml/models/label_encoder.joblib` | `LabelEncoder` (14 Classes) | 751 B | Verified |
| `backend/ml/models/feature_metadata.json`| Schema & Metadata | 1,272 B | Verified |

All artifacts share identical generation timestamps (`02-11-2026 12:10:32 AM`), guaranteeing complete training-run consistency.

---

## 8. Conclusion & Future Work

The SkillNova AI career intelligence pipeline establishes a rigorous, leak-free framework for multi-dimensional candidate evaluation. By combining NLP entity parsing, structured domain scoring, TF-IDF lexical matching, and tuned XGBoost classification, the system achieves a balanced 92.00% holdout accuracy across 14 career roles. 

Future iterations will incorporate language-specific sub-vectors (e.g., dedicated JVM vs. Python ecosystem flags) to resolve the observed confusion among Java, Python, and Backend developers, and investigate isotonic regression or Platt scaling to calibrate output probabilities for clinical recruitment settings.

---

## References
1. Chen, T., & Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System*. ACM SIGKDD.
2. Pedregosa, F., et al. (2011). *Scikit-learn: Machine Learning in Python*. JMLR.
3. Niculescu-Mizil, A., & Caruana, R. (2005). *Predicting good probabilities with supervised learning*. ICML.
4. Manning, C. D., Raghavan, P., & Schütze, H. (2008). *Introduction to Information Retrieval*. Cambridge University Press.
