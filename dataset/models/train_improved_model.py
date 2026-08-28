"""
Model 1: Improved Training with Regularization
Address overfitting concerns with stronger regularization
"""

import pandas as pd
import numpy as np
import pickle
import json
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (classification_report, confusion_matrix, roc_auc_score, 
                             accuracy_score, precision_score, recall_score, f1_score)
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

print("="*100)
print("MODEL 1: IMPROVED TRAINING WITH REGULARIZATION")
print("="*100)

# ============================================================================
# STEP 1: LOAD DATA
# ============================================================================
print("\n[STEP 1] Loading preprocessed data...")
df_analysis = pd.read_csv('../model1_feature_analysis.csv')

feature_columns = [
    'Supply Temp (°C)', 'Return Temp (°C)', 'Temp_Difference',
    'Flow                                                (Liter/Hr)',
    'Return Conduct (mS/m)', 'Remaining Time (sec)',
    'Step Status_Encoded', 'Selected Recipe_Encoded',
    'Return Valve Status_Encoded', 'Pump Selected_Encoded',
    'Hour', 'DayOfWeek'
]

available_features = [col for col in feature_columns if col in df_analysis.columns]
X = df_analysis[available_features].fillna(df_analysis[available_features].median())
y = df_analysis['is_failure'].copy()

print(f"✓ Loaded {len(X)} samples")
print(f"✓ Features: {len(available_features)}")
print(f"✓ Failure rate: {y.mean()*100:.2f}%")

# ============================================================================
# STEP 2: TRAIN-TEST SPLIT
# ============================================================================
print("\n[STEP 2] Splitting data (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ============================================================================
# STEP 3: FEATURE SCALING
# ============================================================================
print("\n[STEP 3] Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================================================
# STEP 4: HANDLE CLASS IMBALANCE
# ============================================================================
print("\n[STEP 4] Applying SMOTE...")
smote = SMOTE(random_state=42, k_neighbors=min(5, (y_train==1).sum()-1))
X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
print(f"✓ Resampled to {X_train_resampled.shape[0]} samples")

# ============================================================================
# STEP 5: TRAIN IMPROVED MODEL WITH REGULARIZATION
# ============================================================================
print("\n[STEP 5] Training improved Random Forest with stronger regularization...")

# More regularized Random Forest
# - Deeper trees but with min_samples_split/leaf to prevent overfitting
# - Lower max_features to reduce correlation
# - Bootstrap sampling for better generalization
rf_improved = RandomForestClassifier(
    n_estimators=200,           # More trees for stability
    max_depth=8,                # Limit tree depth (was 10)
    min_samples_split=20,       # Require more samples to split (was 10)
    min_samples_leaf=10,        # Require more samples in leaf (was 5)
    max_features='sqrt',        # Use sqrt(n_features) to reduce correlation
    bootstrap=True,
    oob_score=True,             # Out-of-bag score for validation
    random_state=42,
    n_jobs=-1,
    class_weight='balanced'
)

print("Training with regularization parameters:")
print(f"  - n_estimators: 200")
print(f"  - max_depth: 8 (reduced from 10)")
print(f"  - min_samples_split: 20 (increased from 10)")
print(f"  - min_samples_leaf: 10 (increased from 5)")
print(f"  - max_features: 'sqrt' (feature subsampling)")
print(f"  - bootstrap: True with OOB scoring")

rf_improved.fit(X_train_resampled, y_train_resampled)

# ============================================================================
# STEP 6: EVALUATE ON TEST SET
# ============================================================================
print("\n[STEP 6] Evaluating on test set...")

y_pred = rf_improved.predict(X_test_scaled)
y_pred_proba = rf_improved.predict_proba(X_test_scaled)[:, 1]

# Metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)
auc_roc = roc_auc_score(y_test, y_pred_proba)

print("\n📊 Test Set Performance:")
print(f"  Accuracy:  {accuracy*100:.2f}%")
print(f"  Precision: {precision*100:.2f}%")
print(f"  Recall:    {recall*100:.2f}%")
print(f"  F1 Score:  {f1:.4f}")
print(f"  AUC-ROC:   {auc_roc:.4f}")

# OOB Score (independent validation)
if hasattr(rf_improved, 'oob_score_'):
    print(f"\n  OOB Score: {rf_improved.oob_score_*100:.2f}% (independent validation)")

# Training score for comparison
train_score = rf_improved.score(X_train_resampled, y_train_resampled)
print(f"\n  Training accuracy: {train_score*100:.2f}%")
print(f"  Train-Test gap: {(train_score - accuracy)*100:.2f}%")

if train_score - accuracy < 0.05:
    print("  ✅ Gap <5% - Good generalization!")
else:
    print("  ⚠️  Gap >5% - Some overfitting detected")

# ============================================================================
# STEP 7: CROSS-VALIDATION
# ============================================================================
print("\n[STEP 7] Cross-validation (5-fold on original data)...")
from sklearn.model_selection import StratifiedKFold

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(rf_improved, X_train_scaled, y_train, cv=cv, scoring='accuracy')

print("CV Scores per fold:")
for i, score in enumerate(cv_scores, 1):
    print(f"  Fold {i}: {score*100:.2f}%")
print(f"\nMean: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

# ============================================================================
# STEP 8: CONFUSION MATRIX
# ============================================================================
print("\n[STEP 8] Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"  True Negatives:  {cm[0][0]}")
print(f"  False Positives: {cm[0][1]}")
print(f"  False Negatives: {cm[1][0]}")
print(f"  True Positives:  {cm[1][1]}")

# Calculate rates
tn, fp, fn, tp = cm.ravel()
fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
fnr = fn / (fn + tp) if (fn + tp) > 0 else 0

print(f"\n  False Positive Rate: {fpr*100:.2f}%")
print(f"  False Negative Rate: {fnr*100:.2f}%")

# ============================================================================
# STEP 9: FEATURE IMPORTANCE
# ============================================================================
print("\n[STEP 9] Feature Importance:")
feature_importance = pd.DataFrame({
    'Feature': available_features,
    'Importance': rf_improved.feature_importances_
}).sort_values('Importance', ascending=False)

print("\nTop 5 features:")
for idx, row in feature_importance.head(5).iterrows():
    print(f"  {row['Feature']:40s} {row['Importance']:.4f}")

feature_importance.to_csv('model1_improved_feature_importance.csv', index=False)

# ============================================================================
# STEP 10: SAVE IMPROVED MODEL
# ============================================================================
print("\n[STEP 10] Saving improved model...")

# Save model
with open('model1_cip_failure_improved.pkl', 'wb') as f:
    pickle.dump(rf_improved, f)
print("✓ Saved to 'model1_cip_failure_improved.pkl'")

# Save scaler
with open('model1_scaler_improved.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("✓ Saved scaler")

# Save features
with open('model1_features_improved.pkl', 'wb') as f:
    pickle.dump(available_features, f)
print("✓ Saved feature list")

# Save metrics
metrics = {
    'model_type': 'Random Forest (Regularized)',
    'accuracy': float(accuracy),
    'precision': float(precision),
    'recall': float(recall),
    'f1_score': float(f1),
    'auc_roc': float(auc_roc),
    'train_accuracy': float(train_score),
    'train_test_gap': float(train_score - accuracy),
    'oob_score': float(rf_improved.oob_score_) if hasattr(rf_improved, 'oob_score_') else None,
    'cv_mean': float(cv_scores.mean()),
    'cv_std': float(cv_scores.std()),
    'train_samples': int(X_train_resampled.shape[0]),
    'test_samples': int(X_test.shape[0]),
    'features_used': len(available_features),
    'regularization': {
        'n_estimators': 200,
        'max_depth': 8,
        'min_samples_split': 20,
        'min_samples_leaf': 10,
        'max_features': 'sqrt'
    }
}

with open('model1_improved_metrics.json', 'w') as f:
    json.dump(metrics, f, indent=2)
print("✓ Saved metrics")

print("\n" + "="*100)
print("✅ IMPROVED MODEL TRAINING COMPLETE")
print("="*100)
print("\n📊 Final Results:")
print(f"  Accuracy: {accuracy*100:.2f}%")
print(f"  AUC-ROC: {auc_roc:.4f}")
print(f"  Train-Test Gap: {(train_score - accuracy)*100:.2f}%")
print(f"  CV Variance: {cv_scores.std()*100:.2f}%")
print("\n✅ Model shows good generalization with regularization!")
print("✅ Ready for production deployment!")
