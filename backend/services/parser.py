import os
import re
import zipfile
import calendar
from datetime import date
from typing import Optional, Tuple, Dict, Any, List
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
    ("EXPERIENCE", ["INTERNSHIP EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT HISTORY", "PROFESSIONAL EXPERIENCE", "RELEVANT EXPERIENCE", "PRACTICAL EXPERIENCE", "WORK HISTORY", "INTERNSHIPS", "INTERNSHIP", "EXPERIENCE"]),
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

# --- Structured Internship & Date Extraction Helpers ---

MONTH_MAP = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}

def normalize_date_pair(s_yr: int, s_mo: Optional[int], e_is_ongoing: bool, e_yr: Optional[int], e_mo: Optional[int], raw_match: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Normalizes extracted dates into ISO YYYY-MM-DD.
    Documented Conventions:
    - Month-only dates: Start date defaults to day 01 (YYYY-MM-01). End date defaults to last day of month via calendar.monthrange.
    - Year-only dates: Start date defaults to YYYY-01-01. End date defaults to YYYY-12-31.
    - Ongoing internships: End date is stored as None (NULL).
    - Strict validation: Years must be in [1990, 2050]. End date must not be earlier than start date. Impossible dates return None.
    """
    if s_yr < 1990 or s_yr > 2050:
        return None, None, None
        
    s_day = 1
    s_mo_final = s_mo if s_mo else 1
    try:
        s_dt = date(s_yr, s_mo_final, s_day)
    except ValueError:
        return None, None, None
        
    start_date_iso = s_dt.isoformat()
    end_date_iso = None
    
    if e_is_ongoing:
        end_date_iso = None
    elif e_yr:
        if e_yr < 1990 or e_yr > 2050:
            return None, None, None
        if e_mo:
            if e_mo < 1 or e_mo > 12:
                return None, None, None
            _, last_day = calendar.monthrange(e_yr, e_mo)
            try:
                e_dt = date(e_yr, e_mo, last_day)
            except ValueError:
                return None, None, None
        else:
            try:
                e_dt = date(e_yr, 12, 31)
            except ValueError:
                return None, None, None
                
        if e_dt < s_dt:
            return None, None, None
        end_date_iso = e_dt.isoformat()
    else:
        return None, None, None
        
    return start_date_iso, end_date_iso, raw_match.strip()

def extract_internship_date_range(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Extracts start and end dates from an experience text segment.
    Supports formats:
    - 'Jan 2025 – Apr 2025', 'January 2025 to April 2025'
    - '01/2025 – 04/2025', '01-2025 to 04-2025'
    - '2024 – 2025'
    - 'Jan 2025 – Present', 'Feb 2024 - Ongoing', 'Current'
    - 'Since Mar 2024', 'From 2023 - Present'
    Returns (start_date_iso, end_date_iso, raw_matched_string)
    """
    if not text or not text.strip():
        return None, None, None
        
    sep_pat = r'(?:\s*[-–—~]\s*|\s+(?:to|till|until|through)\s+)'
    ongoing_pat = r'(?:present|current|ongoing|till\s+date|now|in\s+progress)'
    month_names_pat = r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

    # Pattern 1: Month Name + Year to Month Name + Year / Ongoing
    p1 = re.compile(
        r'\b(' + month_names_pat + r')[.,]?\s+(\d{4})' + sep_pat + r'(' + ongoing_pat + r'|' + month_names_pat + r'[.,]?\s+\d{4})\b',
        re.IGNORECASE
    )
    m1 = p1.search(text)
    if m1:
        s_mo_str, s_yr_str, end_part = m1.group(1), m1.group(2), m1.group(3)
        s_mo = MONTH_MAP.get(s_mo_str.lower().rstrip('.'))
        s_yr = int(s_yr_str)
        if re.match(r'^' + ongoing_pat + r'$', end_part.strip(), re.IGNORECASE):
            return normalize_date_pair(s_yr, s_mo, True, None, None, m1.group(0))
        else:
            m_end = re.search(r'(' + month_names_pat + r')[.,]?\s+(\d{4})', end_part, re.IGNORECASE)
            if m_end:
                e_mo = MONTH_MAP.get(m_end.group(1).lower().rstrip('.'))
                e_yr = int(m_end.group(2))
                return normalize_date_pair(s_yr, s_mo, False, e_yr, e_mo, m1.group(0))

    # Pattern 2: Numeric MM/YYYY or MM-YYYY
    p2 = re.compile(
        r'\b(0?[1-9]|1[0-2])[\/\-](\d{4})' + sep_pat + r'(' + ongoing_pat + r'|(?:0?[1-9]|1[0-2])[\/\-](\d{4}))\b',
        re.IGNORECASE
    )
    m2 = p2.search(text)
    if m2:
        s_mo = int(m2.group(1))
        s_yr = int(m2.group(2))
        end_part = m2.group(3)
        if re.match(r'^' + ongoing_pat + r'$', end_part.strip(), re.IGNORECASE):
            return normalize_date_pair(s_yr, s_mo, True, None, None, m2.group(0))
        else:
            m_end = re.search(r'(0?[1-9]|1[0-2])[\/\-](\d{4})', end_part)
            if m_end:
                e_mo = int(m_end.group(1))
                e_yr = int(m_end.group(2))
                return normalize_date_pair(s_yr, s_mo, False, e_yr, e_mo, m2.group(0))

    # Pattern 3: Year-only range
    p3 = re.compile(
        r'(?<!\d)(\d{4})' + sep_pat + r'(' + ongoing_pat + r'|\d{4})(?!\d)',
        re.IGNORECASE
    )
    m3 = p3.search(text)
    if m3:
        s_yr = int(m3.group(1))
        end_part = m3.group(2)
        if re.match(r'^' + ongoing_pat + r'$', end_part.strip(), re.IGNORECASE):
            return normalize_date_pair(s_yr, None, True, None, None, m3.group(0))
        else:
            e_yr = int(end_part)
            return normalize_date_pair(s_yr, None, False, e_yr, None, m3.group(0))

    # Pattern 4: 'Since Jan 2025' or 'From 2024 to Present'
    p4 = re.compile(
        r'\b(?:since|from)\s+(' + month_names_pat + r'[.,]?\s+)?(\d{4})\b',
        re.IGNORECASE
    )
    m4 = p4.search(text)
    if m4:
        s_mo_str = m4.group(1)
        s_mo = MONTH_MAP.get(s_mo_str.lower().strip().rstrip('.')) if s_mo_str else None
        s_yr = int(m4.group(2))
        return normalize_date_pair(s_yr, s_mo, True, None, None, m4.group(0))

    return None, None, None

def clean_extracted_name(s: str) -> str:
    if not s:
        return ''
    s = re.sub(r'\b(remote|hybrid|onsite|on-site|india|bengaluru|bangalore)\b', '', s, flags=re.IGNORECASE)
    s = re.sub(r'[\(\)\[\]]', '', s)
    return re.sub(r'\s+', ' ', s).strip(' -–—:|,')

def parse_structured_internship(chunk: str) -> Optional[Dict[str, Any]]:
    """
    Parses a single experience chunk into a structured internship record.
    Extracts company, role, dates, duration, and description where evidence supports those fields.
    """
    if not chunk or len(chunk.strip()) < 10:
        return None

    s_date, e_date, raw_date = extract_internship_date_range(chunk)
    
    lines = [l.strip() for l in chunk.strip().split('\n') if l.strip()]
    if not lines:
        return None
        
    first_line = lines[0]
    header = first_line
    if raw_date:
        header = header.replace(f'({raw_date})', '').replace(f'[{raw_date}]', '').replace(raw_date, '').strip(' -–—(),')
    
    company = None
    role = None
    role_kw = ['intern', 'internship', 'developer', 'engineer', 'trainee', 'analyst', 'lead', 'associate', 'specialist', 'assistant']
    
    if '|' in header:
        parts = [clean_extracted_name(p) for p in header.split('|') if clean_extracted_name(p)]
        if len(parts) >= 2:
            p0, p1 = parts[0], parts[1]
            if any(kw in p0.lower() for kw in role_kw):
                role, company = p0, p1
            elif any(kw in p1.lower() for kw in role_kw):
                role, company = p1, p0
            else:
                role, company = p0, p1
    elif any(d in header for d in [' — ', ' – ', ' - ']):
        sep = ' — ' if ' — ' in header else (' – ' if ' – ' in header else ' - ')
        parts = [clean_extracted_name(p) for p in header.split(sep, 1) if clean_extracted_name(p)]
        if len(parts) == 2:
            p0, p1 = parts[0], parts[1]
            if any(kw in p0.lower() for kw in role_kw):
                role, company = p0, p1
            else:
                company, role = p0, p1
    elif re.search(r'\bat\b|\b@\b', header, re.IGNORECASE):
        m = re.split(r'\s+(?:at|@)\s+', header, maxsplit=1, flags=re.IGNORECASE)
        if len(m) == 2:
            role = clean_extracted_name(m[0])
            company = clean_extracted_name(m[1])
    elif len(lines) >= 2:
        l0_clean = clean_extracted_name(lines[0])
        l1_raw = lines[1]
        l1_clean = l1_raw
        if raw_date:
            l1_clean = l1_clean.replace(f'({raw_date})', '').replace(f'[{raw_date}]', '').replace(raw_date, '').strip(' -–—(),')
        l1_clean = clean_extracted_name(l1_clean)
        if any(kw in l1_clean.lower() for kw in role_kw) and l0_clean:
            company = l0_clean
            role = l1_clean
            
    if not company and not role:
        cleaned = clean_extracted_name(header)
        if cleaned and len(cleaned) > 2:
            company = cleaned
            role = 'Intern'

    # Strict evidence requirement: must have genuine company name and evidence
    if not company or len(company) < 2 or company.lower() in {'experience', 'internship', 'summary', 'responsibilities'}:
        return None

    has_role_kw = any(kw in (role or '').lower() for kw in role_kw)
    has_dates = bool(s_date or raw_date)
    has_structure = bool('|' in first_line or ' — ' in first_line or ' – ' in first_line or re.search(r'\s+(?:at|@)\s+', first_line, re.IGNORECASE))

    if not (has_dates or (has_role_kw and has_structure)):
        return None

    # Description lines
    desc_lines = lines[1:] if len(lines) > 1 else []
    if len(lines) >= 3 and role and role.lower() in lines[1].lower():
        desc_lines = lines[2:]
    desc = '\n'.join(desc_lines).strip()
    
    # Formatted duration string
    if s_date:
        if e_date:
            duration_str = f"{s_date} to {e_date}"
        else:
            duration_str = f"{s_date} to Present"
    elif raw_date:
        duration_str = raw_date
    else:
        duration_str = ''

    return {
        'company': company,
        'role': role or 'Intern',
        'start_date': s_date,
        'end_date': e_date,
        'duration': duration_str,
        'description': desc or chunk[:200],
        'raw_text': chunk
    }

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

    # Structured internship extraction from experience chunks
    structured_experience = []
    for exp_chunk in experience:
        struct_item = parse_structured_internship(exp_chunk)
        if struct_item:
            structured_experience.append(struct_item)

    print("\n--- NLP PARSER LOGS ---")
    print(f"Normalized skills count: {len(normalized_skills)}")
    print(f"Projects found: {len(projects)}")
    print(f"Experience found: {len(experience)}")
    print(f"Structured experience entries: {len(structured_experience)}")
    print(f"Education found: {len(education)}")
    print(f"Certifications found: {len(certifications)}")

    return {
        "technical_skills": normalized_skills,
        "education": education[:4],
        "experience": experience[:5],
        "structured_experience": structured_experience[:5],
        "certifications": certifications[:5],
        "projects": projects[:5]
    }
