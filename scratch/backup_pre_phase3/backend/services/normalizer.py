import re

SKILL_ALIASES = {
    # Programming Languages
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "python": "Python",
    "py": "Python",
    "java": "Java",
    "c": "C",
    "cpp": "C++",
    "c++": "C++",
    "c#": "C#",
    "csharp": "C#",
    "r": "R",
    "go": "Go",
    "golang": "Go",
    "ruby": "Ruby",
    "php": "PHP",
    "kotlin": "Kotlin",
    "swift": "Swift",
    
    # Frontend (Web)
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "Angular",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "ui/ux": "UI/UX",
    "redux": "Redux",
    "redux toolkit": "Redux",
    "rtk": "Redux",

    # Backend
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "express": "Express",
    "expressjs": "Express",
    "express.js": "Express",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "spring": "Spring Boot",
    "spring boot": "Spring Boot",
    "springboot": "Spring Boot",
    "hibernate": "Hibernate",
    "maven": "Maven",
    "microservices": "Microservices",
    "microservice": "Microservices",
    "rest api": "REST API",
    "rest apis": "REST API",
    "restful api": "REST API",
    "restful apis": "REST API",
    "rest": "REST API",
    "graphql": "GraphQL",
    "celery": "Celery",
    "pytest": "PyTest",
    "py.test": "PyTest",

    # Databases & Caching
    "sql": "SQL",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "psql": "PostgreSQL",
    "mongodb": "MongoDB",
    "sqlite": "SQLite",
    "redis": "Redis",
    "firebase": "Firebase",
    "oracle": "Oracle",
    "nosql": "NoSQL",

    # AI / Machine Learning / Deep Learning
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "ai": "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    "nlp": "Natural Language Processing",
    "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision",
    "computer vision": "Computer Vision",
    "llm": "Large Language Models",
    "llms": "Large Language Models",
    "large language models": "Large Language Models",
    "generative ai": "Generative AI",
    "gen ai": "Generative AI",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "torch": "PyTorch",
    "keras": "Keras",
    "scikit-learn": "Scikit-learn",
    "scikitlearn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "xgboost": "XGBoost",
    "random forest": "Random Forest",
    "randomforest": "Random Forest",
    "mlops": "MLOps",
    "ml ops": "MLOps",

    # Data Science & Analytics
    "data science": "Data Science",
    "data analysis": "Data Analysis",
    "data analytics": "Data Analysis",
    "statistical analysis": "Statistics",
    "statistics": "Statistics",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "matplotlib": "Matplotlib",
    "seaborn": "Seaborn",
    "data visualization": "Data Visualization",
    "power bi": "Power BI",
    "powerbi": "Power BI",
    "tableau": "Tableau",
    "excel": "Excel",

    # Cloud, DevOps & Infrastructure
    "cloud": "Cloud",
    "cloud computing": "Cloud Computing",
    "aws": "AWS",
    "amazon web services": "AWS",
    "azure": "Azure",
    "microsoft azure": "Azure",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "prometheus": "Prometheus",
    "linux": "Linux",
    "bash": "Bash",
    "shell": "Bash",
    "shell scripting": "Bash",
    "git": "Git",
    "github": "GitHub",
    "postman": "Postman",
    "jupyter": "Jupyter Notebook",
    "jupyter notebook": "Jupyter Notebook",
    "networking": "Networking",
    "computer networks": "Networking",

    # DSA & Core CS
    "data structures": "Data Structures",
    "data structure": "Data Structures",
    "algorithms": "Algorithms",
    "algorithm": "Algorithms",
    "dsa": "Data Structures",
    "system design": "System Design",
    "system architecture": "System Design",

    # Mobile & Security
    "flutter": "Flutter",
    "react native": "React Native",
    "reactnative": "React Native",
    "mobile development": "Mobile Development",
    "mobile app development": "Mobile Development",
    "android studio": "Android Studio",
    "network security": "Network Security",
    "cyber security": "Cyber Security",
    "cybersecurity": "Cyber Security",
    "cryptography": "Cryptography",
    "ethical hacking": "Ethical Hacking",
    "penetration testing": "Penetration Testing",
    "pen testing": "Penetration Testing",
    "wireshark": "Wireshark",
    "firewalls": "Firewalls",
    "firewall": "Firewalls",
    "siem": "SIEM"
}

def get_canonical_skill(skill: str) -> str:
    """
    Returns the canonical standardized skill name for any raw or alias skill string.
    Handles punctuation differences, trailing whitespace, and case-insensitivity.
    """
    if not skill:
        return ""
    cleaned = str(skill).strip().lower()
    if cleaned in SKILL_ALIASES:
        return SKILL_ALIASES[cleaned]
    # Try normalized spacing / hyphens
    normalized_spacing = re.sub(r'[\s\-_.]+', ' ', cleaned).strip()
    if normalized_spacing in SKILL_ALIASES:
        return SKILL_ALIASES[normalized_spacing]
    # Alphanumeric fallback (e.g. c++ -> c++)
    alnum_clean = re.sub(r'[^a-z0-9+#]', '', cleaned)
    if alnum_clean in SKILL_ALIASES:
        return SKILL_ALIASES[alnum_clean]
    return str(skill).strip()

def is_same_skill(skill_a: str, skill_b: str) -> bool:
    """
    Checks whether two skill strings refer to the exact same canonical technology.
    """
    if not skill_a or not skill_b:
        return False
    return get_canonical_skill(skill_a).lower() == get_canonical_skill(skill_b).lower()

def normalize_skills(skills: list) -> list:
    """
    Normalizes a list of skill strings, removing duplicates, mapping aliases, and formatting.
    """
    normalized = set()
    for skill in skills:
        cleaned = str(skill).strip()
        if not cleaned:
            continue
        canon = get_canonical_skill(cleaned)
        normalized.add(canon)
    
    return sorted(list(normalized))

def normalize_skills_string(skills_str: str) -> str:
    if not skills_str:
        return ""
    skill_list = skills_str.split(",")
    return ", ".join(normalize_skills(skill_list))
