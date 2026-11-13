import os
import sys
import json

WORKSPACE_DIR = r"c:\Users\visha\OneDrive\Desktop\mp"
BACKEND_DIR = os.path.join(WORKSPACE_DIR, "backend")
DATA_DIR = os.path.join(BACKEND_DIR, "data")
CATALOG_PATH = os.path.join(DATA_DIR, "verified_resources.json")
METADATA_PATH = os.path.join(DATA_DIR, "resource_metadata.json")

# Verified replacements mapping by resource ID
REPLACEMENTS = {
    29: {
        "title": "An Introduction to R",
        "provider": "The R Project for Statistical Computing",
        "url": "https://cloud.r-project.org/doc/manuals/r-release/R-intro.html",
        "resource_type": "Documentation",
        "difficulty": "Beginner",
        "estimated_duration": 15.0,
        "description": "Official GNU R programming and environment manual covering vectors, arrays, data frames, statistical models, and graphical techniques.",
        "cost_tier": "Open Source",
        "verification_status": "verified"
    },
    36: {
        "title": "Frontend Development Libraries: React Certification",
        "provider": "freeCodeCamp",
        "url": "https://www.freecodecamp.org/learn/front-end-development-libraries/",
        "resource_type": "Platform",
        "difficulty": "Beginner",
        "estimated_duration": 30.0,
        "description": "Official freeCodeCamp curriculum covering React components, props, stateful components, lifecycle methods, and building interactive web UIs.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    38: {
        "title": "Redux Toolkit Quick Start Tutorial",
        "provider": "Redux Documentation",
        "url": "https://redux-toolkit.js.org/tutorials/quick-start",
        "resource_type": "Documentation",
        "difficulty": "Intermediate",
        "estimated_duration": 6.0,
        "description": "Official tutorial on setting up Redux Toolkit, creating slices, configuring the store, and using hooks (useSelector, useDispatch) in React.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    44: {
        "title": "Introduction to Mobile Development",
        "provider": "Meta (Coursera)",
        "url": "https://www.coursera.org/learn/intro-to-mobile-development",
        "resource_type": "Course",
        "difficulty": "Beginner",
        "estimated_duration": 20.0,
        "description": "Foundations of native and cross-platform mobile app development, UI design principles, client-server communication, and deployment lifecycle.",
        "cost_tier": "Free Audit Available",
        "verification_status": "verified"
    },
    50: {
        "title": "Flask Official Tutorial: Building Flaskr",
        "provider": "Pallets Project",
        "url": "https://flask.palletsprojects.com/en/stable/tutorial/",
        "resource_type": "Documentation",
        "difficulty": "Beginner",
        "estimated_duration": 10.0,
        "description": "Official Flask tutorial on structuring a web application, database models with SQLite, templates, blueprints, and test suites.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    52: {
        "title": "Building a RESTful Web Service with Spring Boot",
        "provider": "VMware Tanzu / Spring.io",
        "url": "https://spring.io/guides/gs/rest-service/",
        "resource_type": "Documentation",
        "difficulty": "Intermediate",
        "estimated_duration": 6.0,
        "description": "Official Spring guide on creating REST controllers, handling GET requests, configuring build tools (Maven/Gradle), and running standalone services.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    63: {
        "title": "How to use fixtures in pytest",
        "provider": "pytest-dev",
        "url": "https://docs.pytest.org/en/stable/how-to/fixtures.html",
        "resource_type": "Documentation",
        "difficulty": "Intermediate",
        "estimated_duration": 6.0,
        "description": "Official deep dive on dependency injection, fixture scopes, teardown execution, parametrization, and mocking in pytest.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    73: {
        "title": "CS229: Machine Learning",
        "provider": "Stanford University",
        "url": "https://cs229.stanford.edu/",
        "resource_type": "Course",
        "difficulty": "Advanced",
        "estimated_duration": 45.0,
        "description": "Stanford's premier graduate-level machine learning course covering supervised learning, deep learning, generalization, unsupervised learning, and reinforcement learning.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    77: {
        "title": "Machine Learning in Python with Scikit-Learn (Inria MOOC)",
        "provider": "Inria Core Contributors",
        "url": "https://inria.github.io/scikit-learn-mooc/",
        "resource_type": "Course",
        "difficulty": "Intermediate",
        "estimated_duration": 36.0,
        "description": "Official open-access MOOC created by scikit-learn core contributors and researchers at Inria covering tabular data, pipelines, and evaluation.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    81: {
        "title": "Learn the Basics: PyTorch Tutorials",
        "provider": "Linux Foundation / PyTorch",
        "url": "https://pytorch.org/tutorials/beginner/basics/intro.html",
        "resource_type": "Documentation",
        "difficulty": "Beginner",
        "estimated_duration": 8.0,
        "description": "Official step-by-step beginner path covering PyTorch tensors, datasets & dataloaders, neural network building blocks, and model saving.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    91: {
        "title": "Applied Plotting, Charting & Data Representation in Python",
        "provider": "University of Michigan (Coursera)",
        "url": "https://www.coursera.org/learn/python-plotting",
        "resource_type": "Course",
        "difficulty": "Intermediate",
        "estimated_duration": 30.0,
        "description": "Rigorous academic course on statistical visualization, exploratory graphics, Matplotlib architecture, and visual aesthetics.",
        "cost_tier": "Free Audit Available",
        "verification_status": "verified"
    },
    97: {
        "title": "Getting Started on AWS: Core Cloud Fundamentals",
        "provider": "Amazon Web Services",
        "url": "https://aws.amazon.com/getting-started/",
        "resource_type": "Platform",
        "difficulty": "Beginner",
        "estimated_duration": 15.0,
        "description": "Official AWS onboarding portal providing 10-minute tutorials, hands-on architectural labs, and core cloud service walk-throughs.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    103: {
        "title": "Docker Hands-On Workshop",
        "provider": "Docker Inc.",
        "url": "https://docs.docker.com/get-started/workshop/",
        "resource_type": "Documentation",
        "difficulty": "Beginner",
        "estimated_duration": 8.0,
        "description": "Official practical workshop covering container persistence, volume mounting, multi-container applications with Docker Compose, and image security.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    107: {
        "title": "GitLab CI/CD Fundamentals & Pipeline Architecture",
        "provider": "GitLab Inc.",
        "url": "https://docs.gitlab.com/ee/ci/",
        "resource_type": "Documentation",
        "difficulty": "Intermediate",
        "estimated_duration": 10.0,
        "description": "Official guide on declarative .gitlab-ci.yml configuration, runners, stages, artifacts, caching, automated testing, and deployment gates.",
        "cost_tier": "Free",
        "verification_status": "verified"
    },
    116: {
        "title": "OWASP Web Security Testing Guide (WSTG)",
        "provider": "OWASP Foundation",
        "url": "https://owasp.org/www-project-web-security-testing-guide/",
        "resource_type": "Documentation",
        "difficulty": "Advanced",
        "estimated_duration": 40.0,
        "description": "The premier open-source cybersecurity guide for web application penetration testing, vulnerability discovery, and security assessment methodologies.",
        "cost_tier": "Free",
        "verification_status": "verified"
    }
}


def apply():
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    updated_count = 0
    for item in catalog:
        res_id = item["id"]
        if res_id in REPLACEMENTS:
            rep = REPLACEMENTS[res_id]
            old_url = item["url"]
            new_url = rep["url"]

            item["title"] = rep["title"]
            item["provider"] = rep["provider"]
            item["url"] = new_url
            item["resource_type"] = rep["resource_type"]
            item["difficulty"] = rep["difficulty"]
            item["estimated_duration"] = rep["estimated_duration"]
            item["description"] = rep["description"]

            # Update sidecar metadata
            meta_entry = {
                "id": res_id,
                "canonical_url": new_url,
                "skill_name": item["skill_name"],
                "cost_tier": rep["cost_tier"],
                "verification_status": rep["verification_status"],
                "last_verified_at": "2026-11-02T13:00:00Z",
                "content_relevance": f"Verified direct curriculum alignment with {item['skill_name']}."
            }

            # Remove old URL key if changed
            if old_url in metadata and old_url != new_url:
                del metadata[old_url]

            metadata[new_url] = meta_entry
            metadata[str(res_id)] = meta_entry
            updated_count += 1
            print(f"Updated ID {res_id} ({item['skill_name']}): {rep['title']} -> {new_url}")

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nApplied updates to {updated_count} resources in verified_resources.json and resource_metadata.json.")


if __name__ == "__main__":
    apply()
