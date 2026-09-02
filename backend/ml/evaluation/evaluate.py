import pandas as pd
import numpy as np
import os
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
import time

def evaluate():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_path = os.path.join(base_dir, 'dataset', 'synthetic_dataset.csv')
    models_dir = os.path.join(base_dir, 'models')
    
    df = pd.read_csv(dataset_path)
    
    # Missing Values
    print(f"Total Records: {len(df)}")
    print(f"Missing Values: {df.isnull().sum().sum()}")
    print(f"Duplicates: {df.duplicated().sum()}")
    print(f"Roles Count:\n{df['target_role'].value_counts()}")
    
    label_encoder = joblib.load(os.path.join(models_dir, 'label_encoder.joblib'))
    ordinal_encoder = joblib.load(os.path.join(models_dir, 'encoder.joblib'))
    scaler = joblib.load(os.path.join(models_dir, 'scaler.joblib'))
    
    with open(os.path.join(models_dir, 'feature_metadata.json'), 'r') as f:
        metadata = json.load(f)
        features = metadata['features']
        
    y = label_encoder.transform(df['target_role'])
    
    df['dsa_level'] = df['dsa_level'].fillna('Beginner')
    df['dsa_level_encoded'] = ordinal_encoder.transform(df[['dsa_level']])
    
    X = df[features].fillna(0)
    X_scaled = scaler.transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    
    models = {
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42),
        "SVM": SVC(kernel='rbf', probability=True, random_state=42),
        "ANN (MLP)": MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
    }
    
    print("\nTraining Report:")
    for name, model in models.items():
        start_time = time.time()
        model.fit(X_train, y_train)
        end_time = time.time()
        
        preds = model.predict(X_test)
        report = classification_report(y_test, preds, output_dict=True, zero_division=0)
        
        print(f"--- {name} ---")
        print(f"Training Time: {end_time - start_time:.4f} sec")
        print(f"Accuracy: {report['accuracy']:.4f}")
        print(f"Precision: {report['macro avg']['precision']:.4f}")
        print(f"Recall: {report['macro avg']['recall']:.4f}")
        print(f"F1 Score: {report['macro avg']['f1-score']:.4f}")
        
    # Evaluate Best Model (XGBoost) in depth
    best_model = joblib.load(os.path.join(models_dir, 'best_model.joblib'))
    best_preds = best_model.predict(X_test)
    
    print("\nFeature Importances (XGBoost):")
    if hasattr(best_model, 'feature_importances_'):
        importances = best_model.feature_importances_
        for f, imp in zip(features, importances):
            print(f"{f}: {imp:.4f}")
            
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, best_preds))

if __name__ == "__main__":
    evaluate()
