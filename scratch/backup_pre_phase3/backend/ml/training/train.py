import pandas as pd
import numpy as np
import os
import json
import joblib
from sklearn.model_selection import train_test_split, cross_validate, RandomizedSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder, OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_path = os.path.join(base_dir, 'dataset', 'synthetic_dataset.csv')
    models_dir = os.path.join(base_dir, 'models')
    eval_dir = os.path.join(base_dir, 'evaluation', 'results')
    
    os.makedirs(eval_dir, exist_ok=True)
    
    df = pd.read_csv(dataset_path)
    
    features = [
        'cgpa', 'frontend_score', 'backend_score', 'database_score', 
        'ai_ml_score', 'data_science_score', 'cloud_score', 
        'programming_score', 'soft_skill_score', 'overall_competency_score'
    ]
    
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df['target_role'])
    
    df['dsa_level'] = df['dsa_level'].fillna('Beginner')
    dsa_categories = [['Beginner', 'Intermediate', 'Advanced']]
    ordinal_encoder = OrdinalEncoder(categories=dsa_categories)
    df['dsa_level_encoded'] = ordinal_encoder.fit_transform(df[['dsa_level']])
    
    all_feature_names = features + ['dsa_level_encoded']
    X = df[all_feature_names]
    X = X.fillna(0)
    
    # 5-Fold Stratified Cross Validation with Pipeline (Zero Data Leakage: Scaler fitted ONLY on train folds)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models = {
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(eval_metric='mlogloss', random_state=42),
        "SVM": SVC(kernel='rbf', probability=True, random_state=42),
        "ANN": MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
    }
    
    scoring = {
        'accuracy': 'accuracy',
        'precision': 'precision_macro',
        'recall': 'recall_macro',
        'f1': 'f1_macro'
    }
    
    print("Running 5-Fold Stratified Cross Validation with Fold-Isolated Preprocessing...")
    results = []
    
    for name, model in models.items():
        print(f"Evaluating {name}...")
        pipe = Pipeline([('scaler', StandardScaler()), ('clf', model)])
        cv_results = cross_validate(pipe, X, y, cv=cv, scoring=scoring, n_jobs=-1)
        
        mean_acc = cv_results['test_accuracy'].mean()
        std_acc = cv_results['test_accuracy'].std()
        mean_prec = cv_results['test_precision'].mean()
        mean_rec = cv_results['test_recall'].mean()
        mean_f1 = cv_results['test_f1'].mean()
        
        results.append({
            "Model": name,
            "Mean Accuracy": round(mean_acc * 100, 2),
            "Std Dev": round(std_acc * 100, 2),
            "Precision": round(mean_prec * 100, 2),
            "Recall": round(mean_rec * 100, 2),
            "F1 Score": round(mean_f1 * 100, 2)
        })
        
    import csv
    with open(os.path.join(eval_dir, 'model_comparison.csv'), mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["Model", "Mean Accuracy", "Std Dev", "Precision", "Recall", "F1 Score"])
        writer.writeheader()
        writer.writerows(results)
    
    print("\nStarting Hyperparameter Tuning for XGBoost (Pipeline-Isolated)...")
    xgb_pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('xgb', XGBClassifier(eval_metric='mlogloss', random_state=42))
    ])
    xgb_param_grid = {
        'xgb__max_depth': [3, 5, 7],
        'xgb__learning_rate': [0.01, 0.1, 0.2],
        'xgb__n_estimators': [100, 200, 300],
        'xgb__subsample': [0.8, 1.0]
    }
    random_search = RandomizedSearchCV(xgb_pipe, param_distributions=xgb_param_grid, n_iter=10, scoring='accuracy', cv=cv, random_state=42, n_jobs=-1)
    
    random_search.fit(X, y)
    best_pipe = random_search.best_estimator_
    tuned_accuracy = random_search.best_score_
    print(f"Tuned XGBoost CV Accuracy: {tuned_accuracy*100:.2f}%")
    
    # Stratified Train-test split for plotting (Confusion Matrix & Feature Importance)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    best_pipe.fit(X_train, y_train)
    preds = best_pipe.predict(X_test)
    
    # Generate Classification Report
    report = classification_report(y_test, preds, target_names=label_encoder.classes_)
    with open(os.path.join(eval_dir, 'classification_report.txt'), 'w') as f:
        f.write(report)
        
    # Confusion Matrix
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=label_encoder.classes_, yticklabels=label_encoder.classes_)
    plt.title('Confusion Matrix - Tuned XGBoost')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(os.path.join(eval_dir, 'confusion_matrix.png'))
    plt.close()
    
    # Feature Importance
    best_xgb_model = best_pipe.named_steps['xgb']
    importances = best_xgb_model.feature_importances_
    plt.figure(figsize=(10, 6))
    sns.barplot(x=importances, y=all_feature_names, hue=all_feature_names, palette='viridis', legend=False)
    plt.title('Feature Importance - Tuned XGBoost')
    plt.tight_layout()
    plt.savefig(os.path.join(eval_dir, 'feature_importance.png'))
    plt.close()
    
    print("\nSaving newly trained model artifacts...")
    # Refit pipeline on FULL dataset before deploying
    best_pipe.fit(X, y)
    final_deployed_model = best_pipe.named_steps['xgb']
    final_deployed_scaler = best_pipe.named_steps['scaler']
    
    joblib.dump(final_deployed_model, os.path.join(models_dir, 'best_model.joblib'))
    joblib.dump(final_deployed_scaler, os.path.join(models_dir, 'scaler.joblib'))
    joblib.dump(ordinal_encoder, os.path.join(models_dir, 'encoder.joblib'))
    joblib.dump(label_encoder, os.path.join(models_dir, 'label_encoder.joblib'))
    
    metadata = {
        "features": all_feature_names,
        "label_mapping": {int(idx): label for idx, label in enumerate(label_encoder.classes_)},
        "dataset_version": "2.0",
        "model_version": "2.0",
        "best_model_type": "Tuned XGBoost",
        "accuracy": float(tuned_accuracy),
        "preprocessing": {
            "categorical_encoding": "OrdinalEncoder",
            "numerical_scaling": "StandardScaler"
        },
        "best_params": random_search.best_params_
    }
    meta_path = os.path.join(models_dir, 'feature_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=4)
    print(f"Artifacts successfully saved to {meta_path} with CV Accuracy: {tuned_accuracy*100:.2f}%")

    # Print Final Summary
    print("\nModel Comparison")
    print("-" * 36)
    for res in results:
        print(f"{res['Model']:<13} : {res['Mean Accuracy']:.2f}%")
        
    print("\nBest Model : XGBoost")
    print(f"Best Parameters : {random_search.best_params_}")
    print(f"Mean CV Accuracy : {tuned_accuracy * 100:.2f}%")

if __name__ == "__main__":
    main()
