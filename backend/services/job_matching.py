import abc
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

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
        return str(skill).lower().strip()

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

    def match_skills(self, user_skills, job_skills):
        normalized_user = {self._normalize_skill(s) for s in user_skills}
        matched = []
        for js in job_skills:
            if self._normalize_skill(js) in normalized_user:
                matched.append(js)
        return matched

    def find_missing_skills(self, user_skills, job_skills, importance="high"):
        normalized_user = {self._normalize_skill(s) for s in user_skills}
        missing = []
        for js in job_skills:
            if self._normalize_skill(js) not in normalized_user:
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
        
        user_skills = profile.get("skills", [])
        
        # 1. Technical Skills (Required) - 50%
        req_skills = role.required_skills or []
        matched_req = self.match_skills(user_skills, req_skills)
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
        matched_pref = self.match_skills(user_skills, pref_skills)
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
            
        missing_req = self.find_missing_skills(user_skills, req_skills, "high")
        missing_pref = self.find_missing_skills(user_skills, pref_skills, "medium")
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
