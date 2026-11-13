import pandas as pd
import numpy as np
import random
import os

ROLES = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer", "Software Engineer",
    "Java Developer", "Python Developer", "Mobile App Developer", "AI Engineer",
    "Machine Learning Engineer", "Data Scientist", "Data Analyst", "DevOps Engineer",
    "Cloud Engineer", "Cyber Security Engineer"
]

NUM_SAMPLES = 10000

def generate_row(role):
    # Base scores initialization (default baseline background noise 15-55)
    scores = {
        'cgpa': round(random.uniform(6.0, 9.0), 2),
        'dsa_level': random.choice(['Beginner', 'Intermediate']),
        'frontend_score': random.randint(15, 55),
        'backend_score': random.randint(20, 60),
        'database_score': random.randint(20, 60),
        'ai_ml_score': random.randint(10, 45),
        'data_science_score': random.randint(10, 45),
        'cloud_score': random.randint(15, 50),
        'programming_score': random.randint(35, 70),
        'soft_skill_score': random.randint(35, 85),
        'target_role': role
    }

    # Role specific realistic profiles
    if role == "Frontend Developer":
        scores['frontend_score'] = random.randint(75, 98)
        scores['programming_score'] = random.randint(60, 90)
        scores['ai_ml_score'] = random.randint(10, 35)
    elif role == "Backend Developer":
        scores['backend_score'] = random.randint(75, 98)
        scores['database_score'] = random.randint(70, 95)
        scores['programming_score'] = random.randint(70, 95)
        scores['dsa_level'] = random.choice(['Intermediate', 'Advanced'])
    elif role == "Full Stack Developer":
        scores['frontend_score'] = random.randint(65, 92)
        scores['backend_score'] = random.randint(65, 92)
        scores['database_score'] = random.randint(60, 88)
        scores['programming_score'] = random.randint(70, 95)
    elif role == "Software Engineer":
        scores['programming_score'] = random.randint(78, 100)
        scores['dsa_level'] = random.choice(['Intermediate', 'Advanced', 'Advanced'])
        scores['cgpa'] = round(random.uniform(7.5, 9.8), 2)
        scores['backend_score'] = random.randint(55, 85)
    elif role == "Java Developer":
        scores['programming_score'] = random.randint(75, 98)
        scores['backend_score'] = random.randint(70, 95)
        scores['database_score'] = random.randint(65, 90)
    elif role == "Python Developer":
        scores['programming_score'] = random.randint(70, 95)
        scores['backend_score'] = random.randint(65, 92)
        scores['database_score'] = random.randint(50, 80)
        scores['ai_ml_score'] = random.randint(15, 45)
        scores['data_science_score'] = random.randint(15, 45)
    elif role == "Mobile App Developer":
        scores['frontend_score'] = random.randint(65, 92)
        scores['programming_score'] = random.randint(70, 95)
        scores['backend_score'] = random.randint(40, 75)
    elif role == "AI Engineer":
        scores['ai_ml_score'] = random.randint(75, 98)
        scores['programming_score'] = random.randint(70, 95)
        scores['cloud_score'] = random.randint(50, 85)
        scores['backend_score'] = random.randint(50, 85)
        scores['cgpa'] = round(random.uniform(7.0, 9.8), 2)
        scores['dsa_level'] = random.choice(['Intermediate', 'Advanced'])
    elif role == "Machine Learning Engineer":
        scores['ai_ml_score'] = random.randint(75, 98)
        scores['data_science_score'] = random.randint(70, 95)
        scores['programming_score'] = random.randint(70, 95)
        scores['backend_score'] = random.randint(45, 85)
        scores['cgpa'] = round(random.uniform(7.0, 9.8), 2)
        scores['dsa_level'] = random.choice(['Intermediate', 'Advanced', 'Intermediate'])
    elif role == "Data Scientist":
        scores['data_science_score'] = random.randint(75, 98)
        scores['ai_ml_score'] = random.randint(60, 90)
        scores['database_score'] = random.randint(60, 90)
        scores['programming_score'] = random.randint(60, 85)
        scores['cgpa'] = round(random.uniform(6.8, 9.6), 2)
    elif role == "Data Analyst":
        scores['data_science_score'] = random.randint(65, 92)
        scores['database_score'] = random.randint(70, 95)
        scores['soft_skill_score'] = random.randint(65, 95)
        scores['ai_ml_score'] = random.randint(15, 45)
    elif role == "DevOps Engineer":
        scores['cloud_score'] = random.randint(75, 98)
        scores['backend_score'] = random.randint(60, 88)
        scores['database_score'] = random.randint(50, 80)
    elif role == "Cloud Engineer":
        scores['cloud_score'] = random.randint(80, 98)
        scores['programming_score'] = random.randint(55, 85)
        scores['backend_score'] = random.randint(50, 80)
    elif role == "Cyber Security Engineer":
        scores['cloud_score'] = random.randint(65, 92)
        scores['programming_score'] = random.randint(65, 90)
        scores['backend_score'] = random.randint(60, 88)
        scores['database_score'] = random.randint(55, 85)
        
    # Calculate overall competency score average safely
    sum_scores = (
        scores['frontend_score'] + scores['backend_score'] + scores['database_score'] +
        scores['ai_ml_score'] + scores['data_science_score'] + scores['cloud_score'] +
        scores['programming_score'] + scores['soft_skill_score']
    )
    scores['overall_competency_score'] = round(sum_scores / 8, 2)
    
    return scores

if __name__ == "__main__":
    print(f"Generating {NUM_SAMPLES} samples...")
    data = []
    
    # Generate perfectly balanced dataset
    samples_per_role = NUM_SAMPLES // len(ROLES)
    
    for role in ROLES:
        for _ in range(samples_per_role):
            data.append(generate_row(role))
            
    # Add a bit of random noise / remaining rows if division isn't perfect
    remaining = NUM_SAMPLES - (samples_per_role * len(ROLES))
    for _ in range(remaining):
        data.append(generate_row(random.choice(ROLES)))
        
    # Shuffle the dataset
    random.shuffle(data)
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "synthetic_dataset.csv")
    
    import csv
    if data:
        fieldnames = list(data[0].keys())
        with open(output_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
            
    print(f"Dataset successfully saved to {output_path} with {len(data)} records.")
