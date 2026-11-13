import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import json
import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone

# Ensure all dependent models are loaded for SQLAlchemy mappers
import models.user
import models.student_profile
import models.competency_profile
import models.job
from models.skill_gap import LearningResource, LearningProgress
from database import SessionLocal
from services.normalizer import get_canonical_skill

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(CURRENT_DIR), "data")
VERIFIED_CATALOG_PATH = os.path.join(DATA_DIR, "verified_resources.json")
METADATA_PATH = os.path.join(DATA_DIR, "resource_metadata.json")


def load_verified_catalog():
    """Loads curated verified resources from verified_resources.json."""
    if not os.path.exists(VERIFIED_CATALOG_PATH):
        raise FileNotFoundError(f"Verified catalogue not found at {VERIFIED_CATALOG_PATH}")
    with open(VERIFIED_CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_resource_metadata():
    """Loads sidecar metadata from resource_metadata.json."""
    if not os.path.exists(METADATA_PATH):
        return {}
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def sync_learning_resources(db: Session, remove_unverified_legacy: bool = True) -> dict:
    """
    Idempotently synchronizes backend/data/verified_resources.json into the learning_resources table.
    Preserves existing database schema with ZERO ALTER TABLE commands.
    Keeps the description column as human-readable plain text.
    """
    catalog = load_verified_catalog()
    logger.info(f"Loaded {len(catalog)} verified resources from catalogue.")

    # Build map of verified URLs
    catalog_urls = {r["url"].strip(): r for r in catalog}
    
    # Query existing rows
    existing_rows = db.query(LearningResource).all()
    existing_by_url = {r.url.strip(): r for r in existing_rows if r.url}

    inserted_count = 0
    updated_count = 0
    deleted_count = 0

    # 1. Update existing or insert new
    for res_data in catalog:
        url = res_data["url"].strip()
        skill_canon = get_canonical_skill(res_data["skill_name"])

        if url in existing_by_url:
            db_row = existing_by_url[url]
            db_row.skill_name = skill_canon
            db_row.resource_type = res_data["resource_type"]
            db_row.title = res_data["title"]
            db_row.provider = res_data["provider"]
            db_row.difficulty = res_data["difficulty"]
            db_row.estimated_duration = float(res_data["estimated_duration"])
            db_row.description = res_data.get("description", "")
            updated_count += 1
        else:
            new_row = LearningResource(
                id=res_data.get("id"),
                skill_name=skill_canon,
                resource_type=res_data["resource_type"],
                title=res_data["title"],
                provider=res_data["provider"],
                url=url,
                difficulty=res_data["difficulty"],
                estimated_duration=float(res_data["estimated_duration"]),
                description=res_data.get("description", "")
            )
            db.add(new_row)
            inserted_count += 1

    # 2. Remove unverified legacy template resources (e.g. docs.sql.org, udemy.com/course/django)
    if remove_unverified_legacy:
        for row in existing_rows:
            url_clean = (row.url or "").strip()
            if url_clean not in catalog_urls:
                # Check if referenced in LearningProgress
                ref_count = db.query(LearningProgress).filter(LearningProgress.resource_id == row.id).count()
                if ref_count == 0:
                    db.delete(row)
                    deleted_count += 1

    db.commit()

    total_count = db.query(LearningResource).count()
    result = {
        "status": "success",
        "inserted": inserted_count,
        "updated": updated_count,
        "deleted": deleted_count,
        "total_active_in_db": total_count,
        "catalog_count": len(catalog)
    }
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        print("Starting Learning Resource Synchronization...")
        res = sync_learning_resources(db)
        print(f"Sync Complete: {res}")
    finally:
        db.close()
