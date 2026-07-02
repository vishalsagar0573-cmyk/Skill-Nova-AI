import spacy
from PyPDF2 import PdfReader
import re
from services.normalizer import normalize_skills, SKILL_ALIASES

try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    import warnings
    warnings.warn("spaCy model 'en_core_web_sm' not found.")
    nlp = spacy.blank("en")

# Extract keys for dynamic regex matching
TECH_SKILLS = list(SKILL_ALIASES.keys())

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def parse_resume(file_path: str) -> dict:
    text = extract_text_from_pdf(file_path)
    doc = nlp(text)
    
    text_lower = text.lower()
    extracted_skills_raw = []
    
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            extracted_skills_raw.append(skill)
            
    normalized_skills = normalize_skills(extracted_skills_raw)
    
    print("\n--- NLP PARSER LOGS ---")
    print(f"Raw extracted skills: {extracted_skills_raw}")
    print(f"Normalized skills: {normalized_skills}")
    
    education = []
    experience = []
    certifications = []
    projects = []
    
    edu_keywords = ["b.tech", "b.e", "mca", "bca", "university", "college", "cgpa", "b.sc", "m.sc", "bachelors", "masters", "degree"]
    exp_keywords = ["intern", "internship", "developer", "engineer", "worked", "experience", "role"]
    cert_keywords = ["certified", "certification", "coursera", "udemy", "certificate"]
    proj_keywords = ["project", "developed", "built", "created", "implemented"]

    for sent in doc.sents:
        sent_text = sent.text.strip().replace('\n', ' ')
        sent_lower = sent_text.lower()
        
        if any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in edu_keywords) and len(sent_text) < 150:
            education.append(sent_text)
            
        elif any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in exp_keywords) and len(sent_text) < 150:
            experience.append(sent_text)
            
        elif any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in cert_keywords) and len(sent_text) < 100:
            certifications.append(sent_text)
            
        elif any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in proj_keywords) and len(sent_text) < 150:
            projects.append(sent_text)

    return {
        "skills": ", ".join(normalized_skills),
        "education": " | ".join(list(set(education))[:2]), 
        "experience": " | ".join(list(set(experience))[:3]),
        "certifications": " | ".join(list(set(certifications))[:3]),
        "projects": " | ".join(list(set(projects))[:3])
    }
