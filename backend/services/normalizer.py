SKILL_ALIASES = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "reactjs": "React",
    "react.js": "React",
    "react": "React",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "ai": "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "python": "Python",
    "sql": "SQL",
    "postgresql": "PostgreSQL",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "aws": "AWS",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "git": "Git",
    "html": "HTML",
    "css": "CSS",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "Scikit-learn",
    "power bi": "Power BI",
    "excel": "Excel",
    "pandas": "Pandas",
    "data visualization": "Data Visualization",
    "ui/ux": "UI/UX",
    "mongodb": "MongoDB",
    "express": "Express",
    "numpy": "NumPy",
    "rest apis": "REST APIs"
}

def normalize_skills(skills: list) -> list:
    """
    Normalizes a list of skill strings, removing duplicates, mapping aliases, and formatting.
    """
    normalized = set()
    for skill in skills:
        cleaned = skill.strip().lower()
        if not cleaned:
            continue
        # Map if alias exists, otherwise capitalize words
        mapped = SKILL_ALIASES.get(cleaned, cleaned.title())
        normalized.add(mapped)
    
    return list(normalized)

def normalize_skills_string(skills_str: str) -> str:
    if not skills_str:
        return ""
    skill_list = skills_str.split(",")
    return ", ".join(normalize_skills(skill_list))
