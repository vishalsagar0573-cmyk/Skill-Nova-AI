from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from services.normalizer import normalize_skills

def _parse_skills(skills_input):
    if not skills_input:
        return []
    if isinstance(skills_input, list):
        return skills_input
    if isinstance(skills_input, str):
        return [s.strip() for s in skills_input.split(',')]
    return []

def get_matching_and_missing_skills(user_skills_input, job_skills_input):
    user_skills = normalize_skills(_parse_skills(user_skills_input))
    job_skills = normalize_skills(_parse_skills(job_skills_input))
    
    user_set = set([s.lower() for s in user_skills])
    job_set = set([s.lower() for s in job_skills])
    
    matching_lower = list(job_set.intersection(user_set))
    missing_lower = list(job_set - user_set)
    
    matching = normalize_skills(matching_lower)
    missing = normalize_skills(missing_lower)
    
    return matching, missing, len(job_set)

def calculate_tfidf_score(user_skills_input, job_skills_input) -> float:
    user_norm = ", ".join(normalize_skills(_parse_skills(user_skills_input)))
    job_norm = ", ".join(normalize_skills(_parse_skills(job_skills_input)))
    
    if not user_norm or not job_norm:
        return 0.0
        
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform([user_norm, job_norm])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(similarity * 100, 2)
    except ValueError:
        return 0.0

def match_user_to_jobs(user_skills_input, job_roles: list, top_n: int = 3):
    results = []
    
    print("\n--- JOB MATCHER LOGS ---")
    print(f"Target User Skills: {user_skills_input}")
    
    for job in job_roles:
        tfidf_score = calculate_tfidf_score(user_skills_input, job.required_skills)
        matching_skills, missing_skills, total_required = get_matching_and_missing_skills(user_skills_input, job.required_skills)
        
        overlap_score = 0
        if total_required > 0:
            overlap_score = (len(matching_skills) / total_required) * 100
            
        # Hybrid Scoring Algorithm
        final_score = (tfidf_score * 0.7) + (overlap_score * 0.3)
        final_score = round(final_score, 2)
        
        print(f"Job: {job.role_name} | TF-IDF: {tfidf_score}% | Overlap: {round(overlap_score, 2)}% ({len(matching_skills)}/{total_required}) | Final Match Score: {final_score}%")
        
        results.append({
            "job_role": job.role_name,
            "match_percentage": final_score,
            "matching_skills": matching_skills,
            "missing_skills": missing_skills
        })
        
    results = sorted(results, key=lambda x: x["match_percentage"], reverse=True)
    return results[:top_n]
