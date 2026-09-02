import abc
from sqlalchemy.orm import Session
from models.skill_gap import LearningResource

class BaseSkillGapEngine(abc.ABC):
    @abc.abstractmethod
    def analyze_gap(self, db: Session, job_match_data: dict, competency_data: dict):
        pass

class RuleBasedSkillGapEngine(BaseSkillGapEngine):
    def __init__(self):
        self.weights = {
            "competency": 0.25,
            "job_compatibility": 0.25,
            "skill_gap_inverse": 0.30,
            "profile_completion": 0.20
        }

    def _calculate_profile_completion(self, competency_data: dict) -> float:
        fields = ["skills", "projects", "internships", "certifications", "cgpa", "career_interests"]
        filled = sum(1 for f in fields if competency_data.get(f))
        return (filled / len(fields)) * 100

    def _prioritize_missing_skills(self, missing_skills: list) -> dict:
        prioritized = []
        total_points = 0
        for ms in missing_skills:
            skill = ms.get("skill", "")
            importance = ms.get("importance", "medium")
            
            if importance == "high":
                points = 20
            elif importance == "medium":
                points = 10
            else:
                points = 5
                
            total_points += points
            prioritized.append({"skill": skill, "importance": importance, "points": points})
            
        return {"skills": prioritized, "total_gap_points": total_points}

    def _calculate_gap_percentage(self, total_gap_points: int) -> float:
        # Assuming 100 points is a 100% gap
        return min(total_gap_points, 100.0)

    def _find_learning_resources(self, db: Session, skill: str) -> list:
        # Simple ilike search for now
        resources = db.query(LearningResource).filter(
            LearningResource.skill_name.ilike(f"%{skill}%")
        ).all()
        
        return [
            {
                "id": r.id,
                "type": r.resource_type,
                "title": r.title,
                "provider": r.provider,
                "url": r.url,
                "difficulty": r.difficulty,
                "duration": r.estimated_duration
            } for r in resources
        ]

    def _generate_action_plan(self, prioritized_skills: list, db: Session) -> list:
        action_plan = []
        week = 1
        current_week_hours = 0
        
        # Sort by points descending
        sorted_skills = sorted(prioritized_skills, key=lambda x: x["points"], reverse=True)
        
        for idx, skill_data in enumerate(sorted_skills):
            skill = skill_data["skill"]
            resources = self._find_learning_resources(db, skill)
            
            if not resources:
                continue
                
            # Pick a core course and a secondary resource
            core = next((r for r in resources if r["type"] == "Course"), resources[0])
            docs = next((r for r in resources if r["type"] == "Documentation"), None)
            
            task1 = {
                "week": week,
                "task": f"Complete {core['title']} for {skill}",
                "priority": skill_data["importance"],
                "estimated_hours": core["duration"],
                "resource_url": core["url"]
            }
            action_plan.append(task1)
            
            current_week_hours += core["duration"]
            if current_week_hours >= 15: # Roughly 15 hours a week limit
                week += 1
                current_week_hours = 0
                
            if docs:
                task2 = {
                    "week": week,
                    "task": f"Review {docs['title']}",
                    "priority": "medium",
                    "estimated_hours": docs["duration"],
                    "resource_url": docs["url"]
                }
                action_plan.append(task2)
                current_week_hours += docs["duration"]
                if current_week_hours >= 15:
                    week += 1
                    current_week_hours = 0

        # Add a final project week
        if action_plan:
            action_plan.append({
                "week": week + 1,
                "task": "Build a capstone project utilizing learned skills",
                "priority": "high",
                "estimated_hours": 10.0,
                "resource_url": "https://github.com/new"
            })

        return action_plan

    def _generate_career_roadmap(self, missing_skills: list) -> list:
        roadmap = [
            {
                "stage": 1,
                "title": "Foundation & Core Skills",
                "description": "Learn the required high-priority missing skills.",
                "status": "In Progress" if missing_skills else "Completed"
            },
            {
                "stage": 2,
                "title": "Advanced Concepts & Tooling",
                "description": "Focus on preferred skills and specialized tools.",
                "status": "Pending"
            },
            {
                "stage": 3,
                "title": "Practical Application",
                "description": "Build projects and contribute to open source.",
                "status": "Pending"
            },
            {
                "stage": 4,
                "title": "Job Readiness",
                "description": "Refine resume, practice interviews, and apply.",
                "status": "Pending"
            }
        ]
        return roadmap

    def analyze_gap(self, db: Session, job_match_data: dict, competency_data: dict):
        target_role = job_match_data.get("role", "Unknown Role")
        job_score = job_match_data.get("compatibility_score", 0.0)
        missing_skills_raw = job_match_data.get("missing_skills", [])
        
        # 1. Prioritize Skills & Calc Gap
        prioritized = self._prioritize_missing_skills(missing_skills_raw)
        gap_percentage = self._calculate_gap_percentage(prioritized["total_gap_points"])
        
        # 2. Recommended Resources
        recommended_resources = {}
        for skill_data in prioritized["skills"]:
            skill = skill_data["skill"]
            recommended_resources[skill] = self._find_learning_resources(db, skill)
            
        # 3. Action Plan & Roadmap
        action_plan = self._generate_action_plan(prioritized["skills"], db)
        roadmap = self._generate_career_roadmap(prioritized["skills"])
        
        # 4. Weighted Career Readiness Score
        # (Competency * W1) + (Job Compatibility * W2) + ((100 - Gap) * W3) + (Profile Completion * W4)
        comp_score = competency_data.get("overall_score", 0.0)
        prof_completion = self._calculate_profile_completion(competency_data)
        gap_inverse = max(100.0 - gap_percentage, 0.0)
        
        readiness_score = (
            (comp_score * self.weights["competency"]) +
            (job_score * self.weights["job_compatibility"]) +
            (gap_inverse * self.weights["skill_gap_inverse"]) +
            (prof_completion * self.weights["profile_completion"])
        )
        
        return {
            "target_role": target_role,
            "overall_gap_percentage": gap_percentage,
            "missing_skills": prioritized["skills"],
            "recommended_resources": recommended_resources,
            "action_plan": action_plan,
            "career_roadmap": roadmap,
            "career_readiness_score": min(readiness_score, 100.0)
        }

class SkillGapEngine:
    def __init__(self, matcher: BaseSkillGapEngine = None):
        self.matcher = matcher or RuleBasedSkillGapEngine()
        
    def execute(self, db: Session, job_match_data: dict, competency_data: dict):
        return self.matcher.analyze_gap(db, job_match_data, competency_data)
