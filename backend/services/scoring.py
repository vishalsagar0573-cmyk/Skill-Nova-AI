import re

class ScoringEngine:
    """
    Modular Scoring Engine for calculating competency scores.
    Currently uses deterministic rule-based weights.
    Designed to be easily replaceable with ML models in the future.
    """
    
    def __init__(self):
        # Base weights example for overall score
        self.weights = {
            "cgpa": 0.15,
            "skills": 0.25,
            "projects": 0.20,
            "internships": 0.15,
            "certifications": 0.10,
            "programming_languages": 0.10,
            "resume_completeness": 0.05
        }
        
        # Domain specific keywords for rule-based matching
        self.domains = {
            "frontend": ["html", "css", "javascript", "react", "vue", "angular", "tailwind", "bootstrap", "typescript", "ui/ux", "next.js", "redux"],
            "backend": ["python", "java", "c++", "node", "express", "django", "fastapi", "spring", "flask", "rest api", "rest apis", "graphql"],
            "database": ["sql", "mysql", "postgresql", "mongodb", "redis", "cassandra", "nosql", "sqlite", "oracle"],
            "ai_ml": ["machine learning", "tensorflow", "pytorch", "scikit-learn", "keras", "xgboost", "random forest", "deep learning", "artificial intelligence", "nlp", "computer vision", "llm", "neural network"],
            "data_science": ["pandas", "numpy", "scikit-learn", "statistics", "data analysis", "data science", "matplotlib", "seaborn", "power bi", "tableau", "data visualization", "data analytics", "r", "analytics", "forecasting", "regression", "jupyter", "jupyter notebook", "random forest", "xgboost"],
            "cloud": ["aws", "azure", "google cloud", "docker", "kubernetes", "ci/cd", "cloud computing", "terraform", "linux", "gcp"],
            "programming": ["c", "c++", "python", "java", "javascript", "typescript", "go", "rust", "ruby", "kotlin", "swift", "algorithms", "data structures", "oop"],
            "soft_skills": ["communication", "leadership", "teamwork", "problem solving", "agile", "scrum", "management", "presentation"]
        }

    def _normalize_skills(self, skills):
        return [str(s).lower() for s in skills]

    def _match_kw(self, kw, text):
        if not text:
            return False
        if len(kw) <= 2:
            return kw == text or bool(re.search(r'\b' + re.escape(kw) + r'\b', text))
        return kw in text

    def _calculate_domain_score(self, profile_data, domain_keywords):
        score = 0
        reasons = []
        
        # 1. Domain Skills (up to 60 points)
        skills = self._normalize_skills(profile_data.get("skills", []))
        matched_skills = [s for s in skills if any(self._match_kw(kw, s) for kw in domain_keywords)]
        
        if matched_skills:
            skill_score = min(len(matched_skills) * 10, 60)
            score += skill_score
            reasons.append(f"Found {len(matched_skills)} domain skills ({skill_score}/60)")
        else:
            reasons.append("No specific domain skills found (0/60)")
            
        # 2. Domain-Relevant Projects (up to 25 points)
        projects = profile_data.get("projects", [])
        if projects:
            domain_proj_count = 0
            for p in projects:
                p_text = ""
                if isinstance(p, dict):
                    p_text = f"{p.get('project_name', '')} {p.get('technology', '')} {p.get('description', '')}".lower()
                else:
                    p_text = str(p).lower()
                if any(self._match_kw(kw, p_text) for kw in domain_keywords):
                    domain_proj_count += 1

            if domain_proj_count > 0:
                proj_score = min(domain_proj_count * 15, 25)
                score += proj_score
                reasons.append(f"Has {domain_proj_count} relevant domain projects ({proj_score}/25)")
            else:
                proj_score = min(len(projects) * 5, 10)
                score += proj_score
                reasons.append(f"Has {len(projects)} general projects ({proj_score}/25)")
        else:
            reasons.append("No projects found (0/25)")
            
        # 3. Domain-Relevant Experience / Internships (up to 25 points)
        internships = profile_data.get("internships", []) + profile_data.get("experience", [])
        if internships:
            domain_exp_count = 0
            for exp in internships:
                exp_text = ""
                if isinstance(exp, dict):
                    exp_text = f"{exp.get('company', '')} {exp.get('role', '')} {exp.get('description', '')}".lower()
                else:
                    exp_text = str(exp).lower()
                if any(self._match_kw(kw, exp_text) for kw in domain_keywords):
                    domain_exp_count += 1

            if domain_exp_count > 0:
                exp_score = min(domain_exp_count * 20, 25)
                score += exp_score
                reasons.append(f"Has {domain_exp_count} relevant domain experiences ({exp_score}/25)")
            else:
                exp_score = min(len(internships) * 5, 10)
                score += exp_score
                reasons.append(f"Has general experience ({exp_score}/25)")
        else:
            reasons.append("No experience found (0/25)")
            
        # Ensure score is within 0-100
        final_score = min(max(int(score), 0), 100)
        return final_score, ", ".join(reasons)

    def calculate_overall(self, profile_data):
        score = 0
        reasons = []
        
        # CGPA
        cgpa_str = profile_data.get("cgpa")
        try:
            cgpa = float(cgpa_str) if cgpa_str else 0.0
            cgpa_score = min((cgpa / 10.0) * (self.weights["cgpa"] * 100), self.weights["cgpa"] * 100)
            score += cgpa_score
            reasons.append(f"CGPA {cgpa} ({int(cgpa_score)}/15)")
        except (ValueError, TypeError):
            reasons.append("Invalid or missing CGPA (0/15)")

        # Skills
        skills = profile_data.get("skills", [])
        skill_score = min(len(skills) * 2.5, self.weights["skills"] * 100)
        score += skill_score
        reasons.append(f"{len(skills)} Skills ({int(skill_score)}/25)")
        
        # Projects
        projects = profile_data.get("projects", [])
        proj_score = min(len(projects) * 10, self.weights["projects"] * 100)
        score += proj_score
        reasons.append(f"{len(projects)} Projects ({int(proj_score)}/20)")

        # Internships
        internships = profile_data.get("internships", []) + profile_data.get("experience", [])
        int_score = min(len(internships) * 15, self.weights["internships"] * 100)
        score += int_score
        reasons.append(f"{len(internships)} Experiences ({int(int_score)}/15)")
        
        # Certifications
        certs = profile_data.get("certifications", [])
        cert_score = min(len(certs) * 5, self.weights["certifications"] * 100)
        score += cert_score
        reasons.append(f"{len(certs)} Certifications ({int(cert_score)}/10)")
        
        # Programming Languages (Simplified check)
        prog_score = min(len([s for s in skills if s.lower() in self.domains["programming"]]) * 5, self.weights["programming_languages"] * 100)
        score += prog_score
        reasons.append(f"Programming skills ({int(prog_score)}/10)")
        
        # Resume Completeness (Basic check if both edu and exp exist)
        completeness = 0
        if profile_data.get("education"): completeness += 2.5
        if profile_data.get("experience"): completeness += 2.5
        score += completeness
        reasons.append(f"Completeness ({int(completeness)}/5)")

        return min(max(int(score), 0), 100), ", ".join(reasons)

    def calculate_frontend(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["frontend"])

    def calculate_backend(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["backend"])

    def calculate_database(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["database"])

    def calculate_ai_ml(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["ai_ml"])

    def calculate_data_science(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["data_science"])

    def calculate_cloud(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["cloud"])

    def calculate_programming(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["programming"])

    def calculate_softskills(self, profile_data):
        return self._calculate_domain_score(profile_data, self.domains["soft_skills"])

    def calculate_all(self, profile_data):
        scores = {}
        explanations = {}
        
        scores["overall_score"], explanations["overall_score"] = self.calculate_overall(profile_data)
        scores["frontend_score"], explanations["frontend_score"] = self.calculate_frontend(profile_data)
        scores["backend_score"], explanations["backend_score"] = self.calculate_backend(profile_data)
        scores["database_score"], explanations["database_score"] = self.calculate_database(profile_data)
        scores["ai_ml_score"], explanations["ai_ml_score"] = self.calculate_ai_ml(profile_data)
        scores["data_science_score"], explanations["data_science_score"] = self.calculate_data_science(profile_data)
        scores["cloud_score"], explanations["cloud_score"] = self.calculate_cloud(profile_data)
        scores["programming_score"], explanations["programming_score"] = self.calculate_programming(profile_data)
        scores["soft_skill_score"], explanations["soft_skill_score"] = self.calculate_softskills(profile_data)
        
        return scores, explanations
