import abc
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from services.normalizer import get_canonical_skill, is_same_skill

def extract_candidate_evidence(profile_or_skills):
    """
    Extracts structured multi-source evidence from candidate profile or skills list.
    """
    if isinstance(profile_or_skills, list):
        profile = {"skills": profile_or_skills}
    elif isinstance(profile_or_skills, dict):
        profile = profile_or_skills
    else:
        profile = {}

    skills_list = profile.get("skills", [])
    if isinstance(skills_list, str):
        skills_list = [s.strip() for s in skills_list.split(",") if s.strip()]

    # 1. Direct skills normalized to canonical forms
    direct_skills = set()
    for s in skills_list:
        if s:
            canon = get_canonical_skill(s)
            direct_skills.add(canon.lower())
            direct_skills.add(str(s).strip().lower())

    # 2. Project technologies & descriptions
    project_skills = set()
    raw_projects = profile.get("projects", [])
    for p in raw_projects:
        if isinstance(p, dict):
            techs = p.get("technology", "") or p.get("technologies", "") or ""
            for t in re.split(r'[,|;/]+', str(techs)):
                if t.strip():
                    project_skills.add(get_canonical_skill(t.strip()).lower())
                    project_skills.add(t.strip().lower())
            desc = f"{p.get('project_name', '')} {p.get('title', '')} {p.get('description', '')}".lower()
        else:
            desc = str(p).lower()
            for t in re.split(r'[,|;/]+', desc):
                if t.strip() and len(t.strip()) < 25:
                    canon = get_canonical_skill(t.strip())
                    if canon.lower() != t.strip().lower():
                        project_skills.add(canon.lower())

        tech_words = [
            "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras", "xgboost", 
            "random forest", "django", "fastapi", "flask", "react", "vue", "angular", 
            "docker", "kubernetes", "aws", "azure", "gcp", "postgresql", "postgres", 
            "mysql", "mongodb", "redis", "pandas", "numpy", "power bi", "tableau",
            "git", "linux", "flutter", "react native", "rest api"
        ]
        for tw in tech_words:
            if re.search(r'\b' + re.escape(tw) + r'\b', desc):
                project_skills.add(get_canonical_skill(tw).lower())

    # 3. Internships / Experience
    internship_skills = set()
    raw_exp = profile.get("internships", []) + profile.get("experience", [])
    for exp in raw_exp:
        exp_text = ""
        if isinstance(exp, dict):
            exp_text = f"{exp.get('company', '')} {exp.get('role', '')} {exp.get('description', '')}".lower()
        else:
            exp_text = str(exp).lower()
        for tw in ["sql", "postgresql", "python", "scikit-learn", "tensorflow", "pytorch", "django", "fastapi", "docker", "aws", "react"]:
            if re.search(r'\b' + re.escape(tw) + r'\b', exp_text):
                internship_skills.add(get_canonical_skill(tw).lower())

    # 4. Certifications
    certs = []
    for c in profile.get("certifications", []):
        if isinstance(c, dict):
            certs.append(f"{c.get('certificate_name', '')} {c.get('name', '')} {c.get('platform', '')}".lower())
        else:
            certs.append(str(c).lower())

    # 5. DSA Level
    dsa_level = str(profile.get("dsa_level", "None")).strip().capitalize()

    # 6. Domain Competency Scores (supporting evidence only!)
    scores = profile.get("scores") or {}
    if not isinstance(scores, dict):
        scores = {}
    if not scores and "overall_score" in profile:
        scores = {k: profile.get(k, 0) for k in ["ai_ml", "database", "cloud", "programming", "frontend", "backend"]}

    return {
        "direct_skills": direct_skills,
        "project_skills": project_skills,
        "internship_skills": internship_skills,
        "certifications": certs,
        "projects": raw_projects,
        "internships": raw_exp,
        "dsa_level": dsa_level,
        "scores": scores
    }

def evaluate_single_skill_match(skill: str, evidence: dict) -> bool:
    """
    Evaluates whether a target skill is demonstrated by candidate multi-source evidence.
    Precision rules:
    - Direct exact canonical match in skills, projects, or internships.
    - Umbrella foundational skills (Machine Learning, SQL, Cloud Computing, DSA).
    - Preserves distinction: SQL != PostgreSQL; React != React Native; Scikit-learn != TF/PyTorch.
    - Competency scores used strictly as supporting evidence, never automatic proof alone.
    """
    target_canon = get_canonical_skill(skill)
    target_lower = target_canon.lower()
    
    all_demonstrated = evidence["direct_skills"] | evidence["project_skills"] | evidence["internship_skills"]

    # RULE 1: Direct Exact Canonical Match
    if target_lower in all_demonstrated:
        return True

    raw_lower = str(skill).strip().lower()
    if raw_lower in all_demonstrated:
        return True

    # RULE 2: Web React vs React Native (STRICT SEPARATION)
    if target_lower == "react":
        # Only direct React satisfies React. "react native" does NOT satisfy web React.
        return "react" in all_demonstrated
    if target_lower == "react native":
        # Only direct React Native satisfies React Native. Web "react" does NOT satisfy React Native.
        return "react native" in all_demonstrated

    # RULE 3: Relational SQL vs Specific RDBMS (PostgreSQL, MySQL, etc.)
    # PostgreSQL usage supports foundational SQL knowledge.
    # BUT SQL knowledge does NOT satisfy PostgreSQL specific requirements!
    if target_lower == "sql":
        relational_engines = {"postgresql", "mysql", "sqlite", "oracle"}
        if bool(relational_engines & all_demonstrated):
            return True
        if any("sql" in c for c in evidence["certifications"]):
            return True
        return False

    if target_lower == "postgresql":
        # Requires direct evidence of PostgreSQL. Generic SQL does NOT satisfy PostgreSQL!
        return "postgresql" in all_demonstrated

    # RULE 4: Machine Learning (Umbrella Foundational) vs Specific Deep Learning / MLOps Frameworks
    if target_lower == "machine learning":
        # Foundational ML is satisfied ONLY IF candidate demonstrated classical ML tools
        # (Scikit-learn, Random Forest, XGBoost) AND (ML project OR ML certification OR ai_ml_score >= 60)
        ml_tools = {"scikit-learn", "random forest", "xgboost"}
        has_ml_tool = bool(ml_tools & all_demonstrated)
        
        has_ml_proj = False
        for p in evidence["projects"]:
            p_text = (p.get("description", "") + " " + p.get("technology", "")).lower() if isinstance(p, dict) else str(p).lower()
            if any(term in p_text for term in ["machine learning", "classification", "regression", "churn", "predictive", "clustering", "random forest", "scikit-learn", "model"]):
                has_ml_proj = True
                break
                
        has_ml_cert = any("machine learning" in c or "deep learning" in c or "data science" in c for c in evidence["certifications"])
        ai_ml_score = evidence["scores"].get("ai_ml", 0) or 0
        
        # Competency score >= 60 is NOT automatic proof alone; must be combined with ML tool
        if has_ml_tool and (has_ml_proj or has_ml_cert or ai_ml_score >= 60):
            return True
        if has_ml_proj and has_ml_cert:
            return True
        return False

    # Deep learning and specialized tools STRICTLY require direct evidence:
    # Scikit-learn does NOT satisfy TensorFlow, PyTorch, Keras, or MLOps!
    if target_lower in {"tensorflow", "pytorch", "keras", "mlops"}:
        return target_lower in all_demonstrated

    # RULE 5: Data Structures & Algorithms
    if target_lower in {"data structures", "algorithms"}:
        if evidence["dsa_level"] in {"Intermediate", "Advanced"}:
            return True
        if bool({"data structures", "algorithms"} & all_demonstrated):
            return True
        return False

    # RULE 6: Cloud Computing (Umbrella Foundational) vs Specific Cloud Providers (AWS, Azure, GCP)
    if target_lower in {"cloud computing", "cloud"}:
        cloud_providers = {"aws", "azure", "gcp", "docker", "kubernetes"}
        has_cloud_tool = bool(cloud_providers & all_demonstrated)
        has_cloud_cert = any("cloud" in c or "aws" in c or "azure" in c for c in evidence["certifications"])
        cloud_score = evidence["scores"].get("cloud", 0) or 0
        
        if has_cloud_tool and (has_cloud_cert or cloud_score >= 60 or len(evidence["projects"]) > 0):
            return True
        return False

    if target_lower in {"aws", "azure", "gcp"}:
        return target_lower in all_demonstrated

    # RULE 7: Python vs Backend Frameworks
    # Python does NOT satisfy Django or FastAPI
    if target_lower in {"django", "fastapi", "flask"}:
        return target_lower in all_demonstrated

    if target_lower == "python":
        if "python" in all_demonstrated:
            return True
        python_indicators = {"django", "fastapi", "flask", "pandas", "numpy", "scikit-learn"}
        if bool(python_indicators & all_demonstrated):
            return True
        return False

    # RULE 8: Java vs Spring Boot
    if target_lower in {"spring boot", "hibernate"}:
        return target_lower in all_demonstrated
    if target_lower == "java":
        if "java" in all_demonstrated:
            return True
        if bool({"spring boot", "hibernate", "maven"} & all_demonstrated):
            return True
        return False

    return target_lower in all_demonstrated

class BaseJobMatcher(abc.ABC):
    @abc.abstractmethod
    def calculate_similarity(self, user_text, job_text):
        pass

    @abc.abstractmethod
    def match_skills(self, user_skills, job_skills):
        pass

    @abc.abstractmethod
    def find_missing_skills(self, user_skills, job_skills, importance):
        pass

    @abc.abstractmethod
    def calculate_role_score(self, profile, role):
        pass

    @abc.abstractmethod
    def recommend_best_role(self, profile, roles):
        pass

class RuleBasedJobMatcher(BaseJobMatcher):
    def __init__(self):
        self.weights = {
            "technical_skills": 0.50,
            "projects": 0.15,
            "internships": 0.10,
            "certifications": 0.10,
            "cgpa": 0.10,
            "preferred_skills": 0.05
        }

    def _normalize_skill(self, skill):
        return get_canonical_skill(str(skill)).lower().strip()

    def calculate_similarity(self, user_text, job_text):
        if not user_text.strip() or not job_text.strip():
            return 0.0
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([user_text, job_text])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(sim)
        except Exception:
            return 0.0

    def match_skills(self, user_skills_or_profile, job_skills):
        """
        Returns list of matched job skills based on candidate multi-source evidence.
        Accepts either a profile dict or a flat skills list for backward compatibility.
        """
        evidence = extract_candidate_evidence(user_skills_or_profile)
        matched = []
        for js in job_skills:
            if evaluate_single_skill_match(js, evidence):
                matched.append(js)
        return matched

    def find_missing_skills(self, user_skills_or_profile, job_skills, importance="high"):
        """
        Returns list of missing job skills with assigned importance level.
        Accepts either a profile dict or a flat skills list for backward compatibility.
        """
        evidence = extract_candidate_evidence(user_skills_or_profile)
        missing = []
        for js in job_skills:
            if not evaluate_single_skill_match(js, evidence):
                missing.append({"skill": js, "importance": importance})
        return missing

    def _extract_user_text(self, profile):
        text_parts = []
        # Projects
        for p in profile.get("projects", []):
            if isinstance(p, dict):
                text_parts.append(p.get("description", ""))
                text_parts.append(p.get("technology", ""))
            else:
                text_parts.append(str(p))
        # Internships
        for i in profile.get("internships", []) + profile.get("experience", []):
            if isinstance(i, dict):
                text_parts.append(i.get("description", ""))
            else:
                text_parts.append(str(i))
        # Summary
        if profile.get("career_interests"):
            text_parts.append(str(profile.get("career_interests")))
            
        return " ".join(text_parts)

    def calculate_role_score(self, profile, role):
        reasons = []
        score = 0.0
        
        # 1. Technical Skills (Required) - 50%
        req_skills = role.required_skills or []
        matched_req = self.match_skills(profile, req_skills)
        if req_skills:
            skill_ratio = len(matched_req) / len(req_skills)
            score += skill_ratio * self.weights["technical_skills"] * 100
            if skill_ratio >= 0.8:
                reasons.append("Strong match on required technical skills")
            elif skill_ratio >= 0.5:
                reasons.append("Good match on required technical skills")
            else:
                reasons.append("Lacking some required technical skills")
        else:
            score += self.weights["technical_skills"] * 100
            
        # 2. Preferred Skills - 5%
        pref_skills = role.preferred_skills or []
        matched_pref = self.match_skills(profile, pref_skills)
        if pref_skills:
            pref_ratio = len(matched_pref) / len(pref_skills)
            score += pref_ratio * self.weights["preferred_skills"] * 100
            if pref_ratio > 0:
                reasons.append("Possesses some preferred skills")
        
        # 3. TF-IDF Text Similarity (Projects 15%, Internships 10%)
        user_text = self._extract_user_text(profile)
        job_text = role.description or ""
        sim_score = self.calculate_similarity(user_text, job_text)
        
        if profile.get("projects"):
            proj_score = min(0.5 + (sim_score * 0.5), 1.0) * self.weights["projects"] * 100
            score += proj_score
            if sim_score > 0.1:
                reasons.append("Highly relevant project experience")
            else:
                reasons.append("Has completed projects")
            
        if profile.get("internships") or profile.get("experience"):
            exp_score = min(0.5 + (sim_score * 0.5), 1.0) * self.weights["internships"] * 100
            score += exp_score
            if sim_score > 0.1:
                reasons.append("Highly relevant internship/experience")
            else:
                reasons.append("Has prior experience")
            
        # 4. Certifications - 10%
        if profile.get("certifications"):
            score += self.weights["certifications"] * 100
            reasons.append("Holds certifications")
            
        # 5. CGPA - 10%
        user_cgpa = 0.0
        try:
            user_cgpa = float(profile.get("cgpa", 0))
        except:
            pass
        
        if user_cgpa >= role.minimum_cgpa:
            score += self.weights["cgpa"] * 100
            reasons.append(f"Meets minimum CGPA requirement ({role.minimum_cgpa})")
        else:
            reasons.append(f"CGPA is below preferred minimum ({role.minimum_cgpa})")
            
        missing_req = self.find_missing_skills(profile, req_skills, "high")
        missing_pref = self.find_missing_skills(profile, pref_skills, "medium")
        all_missing = missing_req + missing_pref
        all_matched = matched_req + matched_pref
        
        final_score = min(max(int(score), 0), 100)
        
        return {
            "role": role.role_name,
            "score": final_score,
            "matched_skills": all_matched,
            "missing_skills": all_missing,
            "reasons": reasons
        }

    def recommend_best_role(self, profile, roles):
        all_matches = []
        for r in roles:
            match_data = self.calculate_role_score(profile, r)
            all_matches.append(match_data)
            
        all_matches.sort(key=lambda x: x["score"], reverse=True)
        
        if not all_matches:
            return None
            
        best = all_matches[0]
        return {
            "best_match": {
                "role": best["role"],
                "compatibility_score": best["score"]
            },
            "matches": [{"role": m["role"], "score": m["score"]} for m in all_matches],
            "matched_skills": best["matched_skills"],
            "missing_skills": best["missing_skills"],
            "recommendation_reason": best["reasons"]
        }

class JobCompatibilityEngine:
    """Dependency injected engine for modular ML integration."""
    def __init__(self, matcher: BaseJobMatcher = None):
        self.matcher = matcher or RuleBasedJobMatcher()
        
    def evaluate(self, profile_data, roles):
        return self.matcher.recommend_best_role(profile_data, roles)
