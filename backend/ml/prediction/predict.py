import os
import joblib
import json
import pandas as pd
import numpy as np

class MLPredictor:
    def __init__(self):
        print("Predictor version 2 loaded - Full Debugging Active")
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.models_dir = os.path.join(self.base_dir, 'models')
        
        # We will load these lazily to avoid crashing if files don't exist yet during startup
        self.model = None
        self.scaler = None
        self.ordinal_encoder = None
        self.label_encoder = None
        self.metadata = None
        self.features = []
        self.is_loaded = False

    def load_artifacts(self):
        if self.is_loaded:
            return
            
        try:
            self.model = joblib.load(os.path.join(self.models_dir, 'best_model.joblib'))
            self.scaler = joblib.load(os.path.join(self.models_dir, 'scaler.joblib'))
            self.ordinal_encoder = joblib.load(os.path.join(self.models_dir, 'encoder.joblib'))
            self.label_encoder = joblib.load(os.path.join(self.models_dir, 'label_encoder.joblib'))
            
            with open(os.path.join(self.models_dir, 'feature_metadata.json'), 'r') as f:
                self.metadata = json.load(f)
                
            self.features = self.metadata['features']
            self.is_loaded = True
        except Exception as e:
            print(f"Failed to load ML artifacts: {e}")
            raise RuntimeError("ML model artifacts are missing or corrupted.")

    def predict(self, competency_data: dict, dsa_level: str = 'Beginner', cgpa: float = 0.0):
        try:
            self.load_artifacts()
            
            # Extract features safely
            input_dict = {
                'cgpa': cgpa or 0.0,
                'frontend_score': competency_data.get('frontend_score') or 0,
                'backend_score': competency_data.get('backend_score') or 0,
                'database_score': competency_data.get('database_score') or 0,
                'ai_ml_score': competency_data.get('ai_ml_score') or 0,
                'data_science_score': competency_data.get('data_science_score') or 0,
                'cloud_score': competency_data.get('cloud_score') or 0,
                'programming_score': competency_data.get('programming_score') or 0,
                'soft_skill_score': competency_data.get('soft_skill_score') or 0,
                'overall_competency_score': competency_data.get('overall_competency_score') or 0
            }
            
            # Normalize and validate DSA Level
            valid_categories = self.ordinal_encoder.categories_[0].tolist()
            print("--- DEBUG: Valid DSA Categories ---", valid_categories)
            
            mapping = {
                "advanced": "Advanced",
                "intermediate": "Intermediate",
                "beginner": "Beginner"
            }
            
            clean_dsa = mapping.get(str(dsa_level).strip().lower(), str(dsa_level).strip().title())
            
            if clean_dsa not in valid_categories:
                raise ValueError(f"Invalid DSA level: {dsa_level}")
            
            # Encode DSA level using a Pandas DataFrame to preserve feature names
            dsa_df = pd.DataFrame({"dsa_level": [clean_dsa]})
            print("--- DEBUG: dsa_df columns ---", dsa_df.columns.tolist())
            dsa_encoded = self.ordinal_encoder.transform(dsa_df)[0][0]
            input_dict['dsa_level_encoded'] = dsa_encoded
            
            # Order features exactly as training phase using metadata
            feature_values = [input_dict[f] for f in self.features]
            
            # Create a DataFrame for scaling to prevent valid feature names warnings/errors
            X_df = pd.DataFrame([feature_values], columns=self.features)
            
            print("\n--- DEBUG: feature_metadata.json ---")
            print("Expected Features:", self.features)
            
            print("\n--- DEBUG: Inference DataFrame (X_df) ---")
            print(X_df)
            print("X_df.columns:", X_df.columns.tolist())
            
            # Scale
            X_scaled = self.scaler.transform(X_df)
            
            # Predict Probabilities
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            # Get top 3 indices sorted by descending probability
            top_3_indices = np.argsort(probabilities)[::-1][:3]
            
            predictions = []
            for idx in top_3_indices:
                role = str(self.label_encoder.inverse_transform([idx])[0])
                confidence = float(probabilities[idx] * 100)
                predictions.append({
                    "role": role,
                    "confidence": round(confidence, 2)
                })
            
            print("\n--- DEBUG: Prediction Success ---", [p['role'] for p in predictions])
            
            return {
                "predictions": predictions,
                "model_used": str(self.metadata.get('best_model_type', 'Unknown'))
            }
        except Exception:
            import traceback
            traceback.print_exc()
            raise

# Singleton instance
predictor = MLPredictor()
