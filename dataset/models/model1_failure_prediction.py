"""
Model 1: CIP Cycle Failure Prediction
Train machine learning models to predict CIP cycle failures based on sensor data
"""

import pandas as pd
import numpy as np
import pickle
import json
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (classification_report, confusion_matrix, roc_auc_score, 
                             roc_curve, accuracy_score, precision_score, recall_score, f1_score)
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

print("="*100)
print("MODEL 1: CIP CYCLE FAILURE PREDICTION - TRAINING")
print("="*100)

# ============================================================================
# STEP 1: LOAD DATA
# ============================================================================
print("\n[STEP 1] Loading preprocessed data...")
df = pd.read_csv('../preprocessed_data.csv')
print(f"✓ Loaded {len(df)} records")

# ============================================================================
# STEP 2: PREPARE FEATURES AND TARGET
# ============================================================================
print("\n[STEP 2] Preparing features and target variable...")

# Define target features for Model 1
feature_columns = [
    'Supply Temp (°C)',
    'Return Temp (°C)',
    'Temp_Difference',
    'Flow                                                (Liter/Hr)',
    'Return Conduct (mS/m)',
    'Remaining Time (sec)',
    'Step Status_Encoded',
    'Selected Recipe_Encoded',
    'Return Valve Status_Encoded',
    'Pump Selected_Encoded',
    'Hour',
    'DayOfWeek'
]

# Load feature analysis data (contains failure labels)
df_analysis = pd.read_csv('../model1_feature_analysis.csv')
print(f"✓ Loaded feature analysis with {len(df_analysis)} records")

# Verify target column exists
if 'is_failure' not in df_analysis.columns:
    print("ERROR: Target column 'is_failure' not found!")
    exit(1)

# Check available features
available_features = [col for col in feature_columns if col in df_analysis.columns]
print(f"\n✓ Available features: {len(available_features)}/{len(feature_columns)}")

# Prepare feature matrix and target
X = df_analysis[available_features].copy()
y = df_analysis['is_failure'].copy()

# Handle any remaining missing values
X = X.fillna(X.median())

print(f"\nDataset shape:")
print(f"  Features (X): {X.shape}")
print(f"  Target (y): {y.shape}")
print(f"\nClass distribution:")
print(f"  Normal (0): {(y==0).sum()} ({(y==0).mean()*100:.2f}%)")
print(f"  Failure (1): {(y==1).sum()} ({(y==1).mean()*100:.2f}%)")

# ============================================================================
# STEP 3: TRAIN-TEST SPLIT
# ============================================================================
print("\n[STEP 3] Splitting data into train and test sets...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"✓ Train set: {X_train.shape[0]} samples")
print(f"✓ Test set: {X_test.shape[0]} samples")

# ============================================================================
# STEP 4: FEATURE SCALING
# ============================================================================
print("\n[STEP 4] Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("✓ Features scaled using StandardScaler")

# ============================================================================
# STEP 5: HANDLE CLASS IMBALANCE (SMOTE)
# ============================================================================
print("\n[STEP 5] Handling class imbalance with SMOTE...")
failure_rate = y_train.mean()
print(f"Original failure rate: {failure_rate*100:.2f}%")

if failure_rate < 0.2:  # If less than 20% failures
    smote = SMOTE(random_state=42, k_neighbors=min(5, (y_train==1).sum()-1))
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    print(f"✓ Applied SMOTE oversampling")
    print(f"  Before: {X_train_scaled.shape[0]} samples")
    print(f"  After: {X_train_resampled.shape[0]} samples")
    print(f"  New failure rate: {y_train_resampled.mean()*100:.2f}%")
else:
    X_train_resampled = X_train_scaled
    y_train_resampled = y_train
    print("✓ Class balance acceptable, skipped SMOTE")

# ============================================================================
# STEP 6: TRAIN MODELS
# ============================================================================
print("\n[STEP 6] Training multiple models...")

models = {
    'Random Forest': RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'
    ),
    'Gradient Boosting': GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
}

results = {}
trained_models = {}

for name, model in models.items():
    print(f"\n  Training {name}...")
    
    # Train model
    model.fit(X_train_resampled, y_train_resampled)
    
    # Predictions
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    # Handle AUC calculation
    try:
        auc = roc_auc_score(y_test, y_pred_proba)
    except:
        auc = 0.0
    
    results[name] = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'auc_roc': auc,
        'model': model
    }
    
    trained_models[name] = model
    
    print(f"    ✓ Accuracy: {accuracy:.4f}")
    print(f"    ✓ Precision: {precision:.4f}")
    print(f"    ✓ Recall: {recall:.4f}")
    print(f"    ✓ F1 Score: {f1:.4f}")
    print(f"    ✓ AUC-ROC: {auc:.4f}")

# ============================================================================
# STEP 7: SELECT BEST MODEL
# ============================================================================
print("\n[STEP 7] Selecting best model...")

# Select based on AUC-ROC (best for imbalanced data)
best_model_name = max(results, key=lambda x: results[x]['auc_roc'])
best_model = results[best_model_name]['model']

print(f"✓ Best model: {best_model_name}")
print(f"  AUC-ROC: {results[best_model_name]['auc_roc']:.4f}")

# ============================================================================
# STEP 8: FEATURE IMPORTANCE
# ============================================================================
print("\n[STEP 8] Analyzing feature importance...")

if hasattr(best_model, 'feature_importances_'):
    feature_importance = pd.DataFrame({
        'Feature': available_features,
        'Importance': best_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    
    print("\nTop 5 most important features:")
    for idx, row in feature_importance.head(5).iterrows():
        print(f"  {row['Feature']}: {row['Importance']:.4f}")
    
    # Save feature importance
    feature_importance.to_csv('model1_feature_importance.csv', index=False)
    print("\n✓ Saved feature importance to 'model1_feature_importance.csv'")

# ============================================================================
# STEP 9: SAVE MODEL AND ARTIFACTS
# ============================================================================
print("\n[STEP 9] Saving model and artifacts...")

# Save best model
with open('model1_cip_failure.pkl', 'wb') as f:
    pickle.dump(best_model, f)
print("✓ Saved model to 'model1_cip_failure.pkl'")

# Save scaler
with open('model1_scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("✓ Saved scaler to 'model1_scaler.pkl'")

# Save feature names
with open('model1_features.pkl', 'wb') as f:
    pickle.dump(available_features, f)
print("✓ Saved feature list to 'model1_features.pkl'")

# Save metrics
metrics = {
    'model_name': best_model_name,
    'accuracy': float(results[best_model_name]['accuracy']),
    'precision': float(results[best_model_name]['precision']),
    'recall': float(results[best_model_name]['recall']),
    'f1_score': float(results[best_model_name]['f1_score']),
    'auc_roc': float(results[best_model_name]['auc_roc']),
    'train_samples': int(X_train_resampled.shape[0]),
    'test_samples': int(X_test.shape[0]),
    'features_used': len(available_features),
    'feature_names': available_features
}

with open('model1_metrics.json', 'w') as f:
    json.dump(metrics, f, indent=2)
print("✓ Saved metrics to 'model1_metrics.json'")

# ============================================================================
# STEP 10: GENERATE CLASSIFICATION REPORT
# ============================================================================
print("\n[STEP 10] Generating final classification report...")

y_pred_final = best_model.predict(X_test_scaled)
print("\nClassification Report:")
print("="*60)
print(classification_report(y_test, y_pred_final, 
                           target_names=['Normal', 'Failure'],
                           zero_division=0))

print("\nConfusion Matrix:")
print("="*60)
cm = confusion_matrix(y_test, y_pred_final)
print(f"True Negatives:  {cm[0][0]}")
print(f"False Positives: {cm[0][1]}")
print(f"False Negatives: {cm[1][0]}")
print(f"True Positives:  {cm[1][1]}")

# Save confusion matrix
np.save('model1_confusion_matrix.npy', cm)
print("\n✓ Saved confusion matrix to 'model1_confusion_matrix.npy'")

print("\n" + "="*100)
print("✅ MODEL 1 TRAINING COMPLETE!")
print("="*100)
print(f"\nModel Performance Summary:")
print(f"  Model: {best_model_name}")
print(f"  Accuracy: {results[best_model_name]['accuracy']*100:.2f}%")
print(f"  Precision: {results[best_model_name]['precision']*100:.2f}%")
print(f"  Recall: {results[best_model_name]['recall']*100:.2f}%")
print(f"  F1 Score: {results[best_model_name]['f1_score']:.4f}")
print(f"  AUC-ROC: {results[best_model_name]['auc_roc']:.4f}")
print(f"\nModel ready for deployment in CIP Dashboard!")
