import os
import sys
import copy
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import or_

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import models.user
import models.student_profile
import models.competency_profile
import models.job
import models.skill_gap
from models.user import User
from models.competency_profile import CompetencyProfile
from models.skill_gap import LearningResource, LearningProgress, SkillGapAnalysis
from services.normalizer import get_canonical_skill
from services.hybrid_search import HybridResourceSearchEngine, get_sidecar_metadata

logger = logging.getLogger(__name__)

# Deterministic Skill Categorization Map based on Technological Dependency Layers
STAGE_1_SKILLS = {
    "python", "java", "javascript", "typescript", "c", "c++", "kotlin", "swift", "r", "bash",
    "data structures", "algorithms", "sql", "html", "css", "statistics"
}

STAGE_2_SKILLS = {
    "django", "react", "fastapi", "spring boot", "hibernate", "flutter", "maven", "redux", "celery",
    "pandas", "numpy", "scikit-learn", "data visualization", "power bi", "tableau", "excel",
    "postgresql", "redis", "mongodb", "firebase", "git", "rest api", "linux", "pytest", "android studio"
}

STAGE_3_SKILLS = {
    "aws", "azure", "gcp", "cloud", "cloud computing", "docker", "kubernetes", "ci/cd", "terraform", "ansible",
    "prometheus", "machine learning", "deep learning", "tensorflow", "pytorch", "mlops",
    "network security", "networking", "wireshark", "firewalls", "cryptography", "ethical hacking",
    "penetration testing", "siem", "react native", "mobile development", "system design", "microservices"
}

STAGE_DEFINITIONS = [
    {
        "stage_number": 1,
        "stage_name": "Core Fundamentals & Prerequisites",
        "description": "Essential foundational programming languages, data structures, and computer science fundamentals."
    },
    {
        "stage_number": 2,
        "stage_name": "Frameworks, Libraries & Core Tooling",
        "description": "Core frameworks, libraries, database systems, and development tooling."
    },
    {
        "stage_number": 3,
        "stage_name": "Advanced, Cloud & Infrastructure",
        "description": "Cloud architectures, containerization, specialized ML/DevOps tooling, and system design."
    },
    {
        "stage_number": 4,
        "stage_name": "Practical Application & Capstone Milestone",
        "description": "Comprehensive portfolio implementation project synthesizing acquired competencies."
    }
]


def determine_skill_stage(canonical_skill: str) -> int:
    """Deterministically assigns a canonical skill to Stage 1, 2, or 3 based on technology layer."""
    s_clean = canonical_skill.strip().lower()
    if s_clean in STAGE_1_SKILLS:
        return 1
    elif s_clean in STAGE_2_SKILLS:
        return 2
    elif s_clean in STAGE_3_SKILLS:
        return 3
    else:
        # Default fallback: tooling is Stage 2, complex systems are Stage 3
        return 2


def select_primary_resource(resources: List[Dict[str, Any]], stage_number: int) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Selects one designated primary learning resource and groups the rest as supplementary alternatives.
    - Stage 1: Prefers structured Course (e.g. CS50, MIT OCW).
    - Stages 2 & 3: Prefers authoritative Documentation / Platform tutorial.
    """
    from typing import Tuple
    if not resources:
        return None, []

    if stage_number == 1:
        preferred_type = "Course"
    else:
        preferred_type = "Documentation"

    # Search for preferred type
    primary = next((r for r in resources if r.get("type") == preferred_type), None)
    if not primary:
        # Fallback to Platform or first item
        primary = next((r for r in resources if r.get("type") == "Platform"), resources[0])

    supplementary = [r for r in resources if r.get("id") != primary.get("id")]
    return primary, supplementary


def generate_capstone_spec(target_role: str) -> Dict[str, Any]:
    """Generates a practical, role-aligned capstone portfolio project specification."""
    role_lower = target_role.lower()

    if "python" in role_lower:
        title = "Python Asynchronous Web API & Background Task Worker"
        description = "Design and build a scalable RESTful API with FastAPI or Django, integrating Celery for background processing, Redis caching, and PostgreSQL persistence with Docker Compose."
        deliverables = [
            "Modular application architecture with clear separation of routers and services",
            "Asynchronous Celery worker with Redis broker for background queue handling",
            "Comprehensive PyTest automated test suite with fixtures and >=80% coverage",
            "Multi-stage Dockerfile and docker-compose.yml configuration"
        ]
    elif "machine learning" in role_lower or "ai" in role_lower:
        title = "End-to-End Machine Learning Prediction & Inference Service"
        description = "Develop, evaluate, and package a production-grade machine learning model with Scikit-learn/PyTorch, containerized behind a FastAPI inference server with input validation."
        deliverables = [
            "Reproducible feature engineering pipeline with data validation",
            "Tuned model evaluation report (ROC-AUC, Precision, Recall, Confusion Matrix)",
            "FastAPI REST endpoints for real-time model inference",
            "Docker containerization with health checks and requirements isolation"
        ]
    elif "frontend" in role_lower or "web" in role_lower:
        title = "Interactive Full-Stack Web Application with Modern UI"
        description = "Architect and implement a high-performance single-page application using React, state management with Redux/Context, Tailwind CSS, and REST API consumption."
        deliverables = [
            "Component-driven responsive design supporting desktop and mobile viewports",
            "Global state management and asynchronous data fetching",
            "Form validation, error boundaries, and optimistic UI updates",
            "Production bundle optimization and automated GitHub Actions deployment"
        ]
    elif "devops" in role_lower or "cloud" in role_lower:
        title = "Automated Cloud Infrastructure & CI/CD Deployment Pipeline"
        description = "Build an automated continuous deployment pipeline with GitHub Actions/GitLab CI, deploying containerized microservices to cloud infrastructure with Docker and Prometheus monitoring."
        deliverables = [
            "Multi-container application orchestration with Docker Compose",
            "Declarative CI/CD pipeline configuration with automated testing and build stages",
            "Infrastructure automation scripts and secret management",
            "Prometheus metrics scraping and service health dashboard"
        ]
    else:
        title = f"{target_role} Practical Portfolio Implementation"
        description = f"Build and deploy an end-to-end practical project synthesizing the required technical competencies for a {target_role}."
        deliverables = [
            "Clean GitHub repository with architectural documentation and README",
            "Core business logic implementation with automated unit tests",
            "Containerized deployment configuration",
            "Live demo or video walkthrough demonstrating functional requirements"
        ]

    return {
        "title": title,
        "description": description,
        "deliverables": deliverables,
        "estimated_hours": 15.0,
        "github_template_url": "https://github.com/new",
        "github_starter_url": "https://github.com/new"
    }


class LearningPathService:
    """Service orchestrating Simple Learning Path generation and transaction-safe progress tracking."""

    @staticmethod
    def build_student_learning_path(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Constructs the interactive Simple Learning Path:
        1. Loads active SkillGapAnalysis and missing skills.
        2. Queries verified learning resources from learning_resources table.
        3. Loads student's existing LearningProgress records.
        4. Categorizes into 4 chronological stages with primary vs supplementary resources.
        5. Computes step-based progress (no denominator inflation).
        6. Extracts persistent capstone status from action_plan_json.
        """
        gap_record = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == user_id).first()
        if gap_record:
            db.refresh(gap_record)
        target_role = gap_record.target_role if gap_record and gap_record.target_role else "General Software Engineering"
        career_readiness_score = gap_record.career_readiness_score if gap_record and gap_record.career_readiness_score is not None else 0.0

        # Load missing skills list
        missing_skills_raw = gap_record.missing_skills_json or [] if gap_record else []
        
        # Load authoritative master evidence store from CompetencyProfile
        comp_profile = db.query(CompetencyProfile).filter(CompetencyProfile.user_id == user_id).first()
        submitted_evidence = {}
        if comp_profile and comp_profile.competency_json and "submitted_evidence" in comp_profile.competency_json:
            submitted_evidence = comp_profile.competency_json["submitted_evidence"]

        # Load user's recorded learning progress (mapping resource_id -> status)
        progress_rows = db.query(LearningProgress).filter(LearningProgress.user_id == user_id).all()
        user_progress_map = {row.resource_id: row.status for row in progress_rows if row.resource_id}

        # Initialize hybrid search engine for resources
        search_engine = HybridResourceSearchEngine()

        # Build stages
        stage_1_steps = []
        stage_2_steps = []
        stage_3_steps = []

        total_steps_count = len(missing_skills_raw)
        completed_steps_count = 0
        in_progress_steps_count = 0
        unavailable_resource_steps_count = 0
        total_estimated_hours = 0.0

        for idx, skill_info in enumerate(missing_skills_raw):
            skill_name = skill_info.get("skill", "")
            importance = skill_info.get("importance", "medium")
            canon_skill = get_canonical_skill(skill_name)
            stage_num = determine_skill_stage(canon_skill)

            # Query resources
            skill_resources = search_engine.search_by_skill(db, canon_skill)
            has_resources = len(skill_resources) > 0

            primary_res, supplementary_res = select_primary_resource(skill_resources, stage_num)

            # Determine Step Completion Status:
            # Step is completed if primary OR any supplementary resource is marked Completed!
            step_status = "Not Started"
            step_pct = 0.0

            if not has_resources:
                step_status = "Resource Unavailable"
                unavailable_resource_steps_count += 1
            else:
                # Check primary resource
                prim_id = primary_res.get("id") if primary_res else None
                prim_status = user_progress_map.get(prim_id, "Not Started")

                # Check supplementary resources
                supp_statuses = [user_progress_map.get(sr.get("id"), "Not Started") for sr in supplementary_res]

                if prim_status == "Completed" or "Completed" in supp_statuses:
                    step_status = "Completed"
                    step_pct = 100.0
                    completed_steps_count += 1
                elif prim_status == "In Progress" or "In Progress" in supp_statuses:
                    step_status = "In Progress"
                    step_pct = 50.0
                    in_progress_steps_count += 1

                # Accumulate hours from primary resource
                if primary_res and primary_res.get("duration"):
                    total_estimated_hours += float(primary_res.get("duration", 0.0))

            # Attach active user status and display aliases to resources
            if primary_res:
                st = user_progress_map.get(primary_res.get("id"), "Not Started")
                primary_res["user_status"] = st
                primary_res["status"] = st
                primary_res["resource_type"] = primary_res.get("type", "Course")
                primary_res["difficulty_level"] = primary_res.get("difficulty", "Beginner")
                primary_res["duration_hours"] = primary_res.get("duration", 0.0)

            for sr in supplementary_res:
                st = user_progress_map.get(sr.get("id"), "Not Started")
                sr["user_status"] = st
                sr["status"] = st
                sr["resource_type"] = sr.get("type", "Course")
                sr["difficulty_level"] = sr.get("difficulty", "Beginner")
                sr["duration_hours"] = sr.get("duration", 0.0)

            skill_slug = canon_skill.lower().replace(' ', '_')
            ev_data = submitted_evidence.get(skill_slug) or submitted_evidence.get(canon_skill.lower())

            step_data = {
                "step_id": f"step_{idx+1}_{skill_slug}",
                "skill": canon_skill,
                "skill_name": canon_skill,
                "canonical_skill": canon_skill,
                "skill_identifier": skill_slug,
                "importance": importance,
                "stage_number": stage_num,
                "status": step_status,
                "step_status": step_status,
                "is_completed": (step_status == "Completed"),
                "is_in_progress": (step_status == "In Progress"),
                "progress_percentage": step_pct,
                "has_available_resource": has_resources,
                "primary_resource": primary_res,
                "supplementary_resources": supplementary_res,
                "evidence": ev_data,
                "evidence_status": ev_data.get("status") if ev_data else "Not Submitted"
            }

            if stage_num == 1:
                stage_1_steps.append(step_data)
            elif stage_num == 2:
                stage_2_steps.append(step_data)
            else:
                stage_3_steps.append(step_data)

        # Sort steps within stages by importance (high -> medium -> low)
        importance_weights = {"high": 3, "medium": 2, "low": 1}
        stage_1_steps.sort(key=lambda x: importance_weights.get(x["importance"], 0), reverse=True)
        stage_2_steps.sort(key=lambda x: importance_weights.get(x["importance"], 0), reverse=True)
        stage_3_steps.sort(key=lambda x: importance_weights.get(x["importance"], 0), reverse=True)

        # Assemble Stages list
        stages = [
            {
                "stage": 1,
                "stage_number": 1,
                "title": STAGE_DEFINITIONS[0]["stage_name"],
                "stage_name": STAGE_DEFINITIONS[0]["stage_name"],
                "description": STAGE_DEFINITIONS[0]["description"],
                "steps": stage_1_steps
            },
            {
                "stage": 2,
                "stage_number": 2,
                "title": STAGE_DEFINITIONS[1]["stage_name"],
                "stage_name": STAGE_DEFINITIONS[1]["stage_name"],
                "description": STAGE_DEFINITIONS[1]["description"],
                "steps": stage_2_steps
            },
            {
                "stage": 3,
                "stage_number": 3,
                "title": STAGE_DEFINITIONS[2]["stage_name"],
                "stage_name": STAGE_DEFINITIONS[2]["stage_name"],
                "description": STAGE_DEFINITIONS[2]["description"],
                "steps": stage_3_steps
            }
        ]

        # Calculate Overall Path Progress Percentage (Step-Based, no denominator inflation)
        if total_steps_count == 0:
            is_role_ready = True
            path_progress_percentage = 100.0
        else:
            is_role_ready = False
            # Each completed step contributes 100 / total, in-progress contributes 50 / total
            total_earned = (completed_steps_count * 100.0) + (in_progress_steps_count * 50.0)
            path_progress_percentage = round(total_earned / total_steps_count, 2)

        # Capstone Milestone Persistence & Specification
        capstone_spec = generate_capstone_spec(target_role)
        capstone_status = "Not Started"

        if gap_record and gap_record.action_plan_json:
            for task in gap_record.action_plan_json:
                if task.get("task_type") == "capstone":
                    capstone_status = task.get("status", "Not Started")
                    break

        capstone_ev = submitted_evidence.get("capstone_milestone")
        capstone_spec["status"] = capstone_status
        capstone_spec["skill_identifier"] = "capstone_milestone"
        capstone_spec["evidence"] = capstone_ev
        capstone_spec["evidence_status"] = capstone_ev.get("status") if capstone_ev else "Not Submitted"
        total_estimated_hours += capstone_spec["estimated_hours"]

        return {
            "target_role": target_role,
            "is_role_ready": is_role_ready,
            "total_steps": total_steps_count,
            "completed_steps": completed_steps_count,
            "in_progress_steps": in_progress_steps_count,
            "unavailable_resource_steps": unavailable_resource_steps_count,
            "path_progress_percentage": path_progress_percentage,
            "total_estimated_hours": total_estimated_hours,
            "career_readiness_score": career_readiness_score,
            "stages": stages,
            "capstone": capstone_spec,
            "capstone_project": capstone_spec
        }

    @staticmethod
    def update_learning_step_status(db: Session, user_id: int, resource_id: int, status: str) -> Dict[str, Any]:
        """
        Updates learning progress with parent-row locking for concurrency safety.
        Serializes updates on user_id to prevent duplicate rows without requiring database migrations.
        """
        valid_statuses = ("Not Started", "In Progress", "Completed")
        if status not in valid_statuses:
            raise ValueError(f"Invalid status '{status}'. Must be one of {valid_statuses}")

        # Verify resource exists
        resource = db.query(LearningResource).filter(LearningResource.id == resource_id).first()
        if not resource:
            raise LookupError(f"Resource with ID {resource_id} not found in learning_resources.")

        pct = 100.0 if status == "Completed" else (50.0 if status == "In Progress" else 0.0)

        # 1. Lock parent User row to serialize concurrent writes for this user
        parent_user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if not parent_user:
            raise LookupError(f"User with ID {user_id} not found.")

        # 2. Query existing records for (user_id, resource_id)
        existing_records = db.query(LearningProgress).filter(
            LearningProgress.user_id == user_id,
            LearningProgress.resource_id == resource_id
        ).all()

        if existing_records:
            primary_rec = existing_records[0]
            primary_rec.status = status
            primary_rec.progress_percentage = pct
            # Consolidate and prune any historical duplicate records
            if len(existing_records) > 1:
                for dup in existing_records[1:]:
                    db.delete(dup)
            db.commit()
            db.refresh(primary_rec)
        else:
            new_rec = LearningProgress(
                user_id=user_id,
                resource_id=resource_id,
                status=status,
                progress_percentage=pct
            )
            db.add(new_rec)
            db.commit()
            db.refresh(new_rec)

        # Recompute overall path statistics for live response
        path_summary = LearningPathService.build_student_learning_path(db, user_id)

        return {
            "status": "success",
            "resource_id": resource_id,
            "step_status": status,
            "step_progress_percentage": pct,
            "path_progress_percentage": path_summary["path_progress_percentage"],
            "completed_steps": path_summary["completed_steps"],
            "total_steps": path_summary["total_steps"]
        }

    @staticmethod
    def update_capstone_status(db: Session, user_id: int, status: str) -> Dict[str, Any]:
        """
        Persists capstone milestone status in SkillGapAnalysis.action_plan_json with parent row locking.
        Preserves all existing action plan tasks and weekly schedule.
        """
        valid_statuses = ("Not Started", "In Progress", "Completed")
        if status not in valid_statuses:
            raise ValueError(f"Invalid status '{status}'. Must be one of {valid_statuses}")

        # Lock parent user row
        parent_user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if not parent_user:
            raise LookupError(f"User with ID {user_id} not found.")

        gap_record = db.query(SkillGapAnalysis).filter(SkillGapAnalysis.user_id == user_id).first()
        if not gap_record:
            raise LookupError("Skill Gap Analysis record not found for user.")

        action_plan = copy.deepcopy(gap_record.action_plan_json or [])
        capstone_found = False

        for task in action_plan:
            if "capstone" in task.get("task", "").lower() or "project" in task.get("task", "").lower():
                task["status"] = status
                capstone_found = True
                break

        if not capstone_found:
            # Create capstone task at end of plan
            new_task = {
                "week": len(action_plan) + 1,
                "task": "Build a capstone project utilizing learned skills",
                "priority": "high",
                "estimated_hours": 15.0,
                "resource_url": "https://github.com/new",
                "status": status
            }
            action_plan.append(new_task)

        gap_record.action_plan_json = action_plan
        flag_modified(gap_record, "action_plan_json")
        db.commit()
        db.refresh(gap_record)

        return {
            "status": "success",
            "capstone_status": status
        }
