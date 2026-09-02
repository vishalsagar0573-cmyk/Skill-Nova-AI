import sys
import os

# Append backend to path so we can import MLPredictor
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from ml.prediction.predict import predictor

try:
    result = predictor.predict(
        competency_data={
            'frontend_score': 85,
            'backend_score': 40,
            'database_score': 30,
            'ai_ml_score': 10,
            'data_science_score': 10,
            'cloud_score': 20,
            'programming_score': 70,
            'soft_skill_score': 80,
            'overall_competency_score': 55
        },
        dsa_level='Intermediate',
        cgpa=8.5
    )
    print("SUCCESS")
    print(result)
except Exception as e:
    import traceback
    traceback.print_exc()
