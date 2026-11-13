import os
import re
import zipfile
import xml.etree.ElementTree as ET
from PyPDF2 import PdfReader
import spacy
from services.normalizer import normalize_skills, SKILL_ALIASES

try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    import warnings
    warnings.warn("spaCy model 'en_core_web_sm' not found.")
    nlp = spacy.blank("en")

# Extract keys for dynamic regex matching, longer matches first
TECH_SKILLS = sorted(list(SKILL_ALIASES.keys()), key=len, reverse=True)

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            chunks = []
            last_y = None

            def visitor_body(t, cm, tm, fontDict, fontSize):
                nonlocal last_y
                if not t:
                    return
                # True vertical coordinate is cm[5] if cm and cm[5] != 0, else tm[5]
                y = cm[5] if cm and len(cm) > 5 and cm[5] != 0 else (tm[5] if tm and len(tm) > 5 else None)
                if last_y is not None and y is not None and abs(y - last_y) > 3:
                    chunks.append('\n')
                elif chunks and not chunks[-1].endswith((' ', '\n')) and not t.startswith((' ', '\n')):
                    if t.strip() not in ['²', '³', '°', ',', '.', ';', ':', ')', ']', '}', '%', '-']:
                        chunks.append(' ')
                chunks.append(t)
                if y is not None:
                    last_y = y

            page.extract_text(visitor_text=visitor_body)
            t_page = "".join(chunks)
            if not t_page.strip():
                # Fallback to standard extract_text if visitor produced nothing
                t_page = page.extract_text() or ""
            if t_page:
                text += t_page + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(file_path: str) -> str:
    paragraphs = []
    try:
        with zipfile.ZipFile(file_path) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                texts = [node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text]
                if texts:
                    paragraphs.append("".join(texts))
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return "\n".join(paragraphs)

def extract_text(file_path: str) -> str:
    lower_path = file_path.lower()
    if lower_path.endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
    elif lower_path.endswith(".docx") or lower_path.endswith(".doc"):
        text = extract_text_from_docx(file_path)
    else:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"Error reading text file: {e}")
            text = ""
    # Normalize common ligatures and unicode quirks
    return text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("\r\n", "\n").replace("\r", "\n")

SECTION_GROUPS = [
    ("PROJECTS", ["ACADEMIC PROJECTS", "PERSONAL PROJECTS", "KEY PROJECTS", "PROJECTS"]),
    ("EXPERIENCE", ["WORK EXPERIENCE", "EMPLOYMENT HISTORY", "INTERNSHIPS", "EXPERIENCE", "PROFESSIONAL EXPERIENCE"]),
    ("EDUCATION", ["ACADEMIC BACKGROUND", "EDUCATION", "ACADEMIC QUALIFICATIONS"]),
    ("CERTIFICATIONS", ["LICENSES & CERTIFICATIONS", "CERTIFICATIONS", "CERTIFICATES", "COURSES"]),
    ("ACHIEVEMENTS", ["AWARDS & ACHIEVEMENTS", "ACHIEVEMENTS", "AWARDS", "HONORS"]),
    ("SKILLS", ["TECHNICAL SKILLS", "SKILLS & TOOLS", "KEY SKILLS", "SKILLS", "CORE COMPETENCIES"]),
    ("SUMMARY", ["PROFESSIONAL SUMMARY", "CAREER OBJECTIVE", "SUMMARY", "OBJECTIVE", "ABOUT ME"])
]

ALL_HEADINGS = []
HEADING_TO_KEY = {}
for key, heads in SECTION_GROUPS:
    for h in heads:
        ALL_HEADINGS.append(h)
        HEADING_TO_KEY[h.upper()] = key
ALL_HEADINGS.sort(key=len, reverse=True)

HEADING_REGEX = (
    r'(?:(?<=\n)\s*(?i:' + '|'.join(re.escape(h) for h in ALL_HEADINGS) + r')(?=[^a-z0-9]|\Z))|'
    r'(?:(?<=[a-z0-9\.\%\,\;\:\)\|\-])(' + '|'.join(re.escape(h) for h in ALL_HEADINGS) + r')(?=[^a-z0-9]|\Z))'
)

def segment_sections(text: str) -> dict:
    matches = list(re.finditer(HEADING_REGEX, "\n" + text))
    sections = {}
    for i, m in enumerate(matches):
        matched_str = m.group(0).strip().upper()
        canon_key = HEADING_TO_KEY.get(matched_str)
        if not canon_key:
            for h in ALL_HEADINGS:
                if h.upper() in matched_str:
                    canon_key = HEADING_TO_KEY[h.upper()]
                    break
        canon_key = canon_key or matched_str

        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text) + 1
        content = ("\n" + text)[start:end].strip()
        if canon_key in sections:
            sections[canon_key] += "\n" + content
        else:
            sections[canon_key] = content
    return sections

def parse_projects(sec_text: str) -> list:
    if not sec_text:
        return []
    formatted = re.sub(r'[\u2022\uf0b7•]\s*', '\n• ', sec_text)
    formatted = re.sub(r'(?<=[\.\!\?])\s*(?=[A-Z][A-Za-z0-9\s]{2,50}\s*(?:[–—\-\|]|\())', '\n\nPROJECT_SEP\n\n', formatted)
    chunks = [c.strip() for c in formatted.split('PROJECT_SEP') if len(c.strip()) > 15]
    if not chunks:
        chunks = [c.strip() for c in formatted.split('\n\n') if len(c.strip()) > 15]
    return chunks[:5]

def parse_experience(sec_text: str) -> list:
    if not sec_text:
        return []
    formatted = re.sub(r'[\u2022\uf0b7•]\s*', '\n• ', sec_text)
    formatted = re.sub(r'(?<=[\.\!\?])\s*(?=[A-Z][A-Za-z0-9\s]{2,50}\s*(?:[–—\-\|]|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)))', '\n\nEXP_SEP\n\n', formatted)
    chunks = [c.strip() for c in formatted.split('EXP_SEP') if len(c.strip()) > 15]
    if not chunks:
        chunks = [c.strip() for c in formatted.split('\n\n') if len(c.strip()) > 15]
    return chunks[:5]

def parse_education(sec_text: str) -> list:
    if not sec_text:
        return []
    edu_clean = re.sub(r'[ \t]{2,}', ' ', sec_text)
    edu_markers = [
        'Pre-University', 'Class 12', 'Class 10', 'High School', 'Secondary',
        'B\\.E\\.', 'B\\.Tech', 'M\\.Tech', 'B\\.Sc', 'M\\.Sc', 'MCA', 'BCA',
        'Bachelor', 'Master', 'Diploma', 'Ph\\.D'
    ]
    split_pat = r'(?:(?<=[\d\.\s])(?=(?:' + '|'.join(edu_markers) + r')\b))|(?:\n+)'
    chunks = [re.sub(r'\s+', ' ', b).strip() for b in re.split(split_pat, edu_clean) if len(b.strip()) > 10]
    return chunks[:4]

def parse_certifications(sec_text: str, ach_text: str = "") -> list:
    combined = (sec_text + "\n" + ach_text).strip()
    if not combined:
        return []
    formatted = re.sub(r'[\u2022\uf0b7•]\s*', '\n', combined)
    lines = [re.sub(r'\s+', ' ', l).strip() for l in formatted.split('\n') if len(l.strip()) > 8]
    return lines[:5]

def parse_resume(file_path: str) -> dict:
    text = extract_text(file_path)
    text_lower = text.lower()
    
    # Extract technical skills across the entire document
    extracted_skills_raw = []
    for skill in TECH_SKILLS:
        if skill == 'r':
            pattern = r'\br\b(?![²\^=%\d])'
            m = re.search(pattern, text_lower)
            if m:
                snippet = text_lower[max(0, m.start()-15):min(len(text_lower), m.end()+15)]
                if any(term in snippet for term in ['regression', 'model', 'r²', 'r2', 'coefficient', 'r =']):
                    continue
                extracted_skills_raw.append(skill)
        elif skill == 'c':
            pattern = r'\bc\b(?![+#])'
            if re.search(pattern, text_lower):
                extracted_skills_raw.append(skill)
        else:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                extracted_skills_raw.append(skill)
            
    normalized_skills = normalize_skills(extracted_skills_raw)
    
    # Section-based extraction
    sections = segment_sections(text)
    
    projects = parse_projects(sections.get("PROJECTS", ""))
    experience = parse_experience(sections.get("EXPERIENCE", ""))
    education = parse_education(sections.get("EDUCATION", ""))
    certifications = parse_certifications(sections.get("CERTIFICATIONS", ""), sections.get("ACHIEVEMENTS", ""))
    
    # Fallback to sentence parsing if section parsing didn't find items
    if not (projects and experience and education):
        doc = nlp(text)
        edu_keywords = ["b.tech", "b.e", "mca", "bca", "university", "college", "cgpa", "b.sc", "m.sc", "bachelors", "masters", "degree"]
        exp_keywords = ["intern", "internship", "developer", "engineer", "worked", "experience", "role"]
        cert_keywords = ["certified", "certification", "coursera", "udemy", "certificate"]
        proj_keywords = ["project", "developed", "built", "created", "implemented"]

        for sent in doc.sents:
            sent_text = sent.text.strip().replace('\n', ' ')
            sent_lower = sent_text.lower()
            if not education and any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in edu_keywords) and len(sent_text) > 15:
                education.append(sent_text)
            elif not experience and any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in exp_keywords) and len(sent_text) > 15:
                experience.append(sent_text)
            elif not certifications and any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in cert_keywords) and len(sent_text) > 10:
                certifications.append(sent_text)
            elif not projects and any(re.search(r'\b' + re.escape(kw) + r'\b', sent_lower) for kw in proj_keywords) and len(sent_text) > 20:
                projects.append(sent_text)

    print("\n--- NLP PARSER LOGS ---")
    print(f"Normalized skills count: {len(normalized_skills)}")
    print(f"Projects found: {len(projects)}")
    print(f"Experience found: {len(experience)}")
    print(f"Education found: {len(education)}")
    print(f"Certifications found: {len(certifications)}")

    return {
        "technical_skills": normalized_skills,
        "education": education[:4],
        "experience": experience[:5],
        "certifications": certifications[:5],
        "projects": projects[:5]
    }
