import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from ml.prediction.predict import predictor

try:
    print("Testing with lowercase 'advanced'...")
    result = predictor.predict(
        competency_data={},
        dsa_level='advanced',
        cgpa=8.5
    )
    print("SUCCESS")
    print(result)
except ValueError as ve:
    print("Caught expected validation error or something else:", ve)
except Exception as e:
    import traceback
    traceback.print_exc()
