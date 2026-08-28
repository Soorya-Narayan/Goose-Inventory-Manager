"""
Model 1: Overfitting Diagnosis and Visualization
Generate diagnostic plots to check for overfitting
"""

import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, learning_curve
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, roc_curve, auc
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

# Set plot style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

print("="*100)
print("MODEL 1: OVERFITTING DIAGNOSIS")
print("="*100)

# ============================================================================
# STEP 1: LOAD DATA AND MODEL
# ============================================================================
print("\n[STEP 1] Loading data and model...")
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

print(f"✓ Loaded {len(X)} samples with {len(available_features)} features")
print(f"✓ Class distribution: {(y==0).sum()} normal, {(y==1).sum()} failures ({y.mean()*100:.2f}% failure rate)")

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Apply SMOTE
smote = SMOTE(random_state=42, k_neighbors=min(5, (y_train==1).sum()-1))
X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)

print(f"✓ After SMOTE: {X_train_resampled.shape[0]} training samples")

# Load trained model
with open('model1_cip_failure.pkl', 'rb') as f:
    model = pickle.load(f)
print("✓ Loaded trained model")

# ============================================================================
# STEP 2: TRAIN VS TEST PERFORMANCE COMPARISON
# ============================================================================
print("\n[STEP 2] Comparing training vs test performance...")

# Training performance
train_score = model.score(X_train_resampled, y_train_resampled)
print(f"Training accuracy: {train_score*100:.2f}%")

# Test performance (on original unbalanced test set)
test_score = model.score(X_test_scaled, y_test)
print(f"Test accuracy: {test_score*100:.2f}%")

# Performance difference
diff = train_score - test_score
print(f"Difference: {diff*100:.2f}%")

if diff > 0.05:
    print("⚠️  WARNING: >5% gap suggests potential overfitting!")
else:
    print("✓ Gap is acceptable (<5%)")

# ============================================================================
# STEP 3: CROSS-VALIDATION
# ============================================================================
print("\n[STEP 3] Performing cross-validation...")

# Use original data (before SMOTE) for realistic CV
from sklearn.model_selection import StratifiedKFold

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=cv, scoring='accuracy')

print(f"Cross-validation scores (5-fold):")
for i, score in enumerate(cv_scores, 1):
    print(f"  Fold {i}: {score*100:.2f}%")
print(f"\nMean CV accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

if cv_scores.std() > 0.05:
    print("⚠️  WARNING: High variance in CV scores suggests instability!")
else:
    print("✓ CV variance is acceptable")

# ============================================================================
# STEP 4: LEARNING CURVES
# ============================================================================
print("\n[STEP 4] Generating learning curves...")

train_sizes, train_scores, val_scores = learning_curve(
    model, X_train_scaled, y_train,
    train_sizes=np.linspace(0.1, 1.0, 10),
    cv=5, scoring='accuracy', n_jobs=-1, random_state=42
)

train_mean = train_scores.mean(axis=1)
train_std = train_scores.std(axis=1)
val_mean = val_scores.mean(axis=1)
val_std = val_scores.std(axis=1)

plt.figure(figsize=(12, 6))
plt.plot(train_sizes, train_mean, label='Training Score', marker='o', linewidth=2)
plt.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.2)
plt.plot(train_sizes, val_mean, label='Validation Score', marker='s', linewidth=2)
plt.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, alpha=0.2)

plt.xlabel('Training Set Size', fontsize=12)
plt.ylabel('Accuracy Score', fontsize=12)
plt.title('Learning Curves - Overfitting Diagnosis', fontsize=14, fontweight='bold')
plt.legend(loc='best', fontsize=10)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('model1_learning_curves.png', dpi=300, bbox_inches='tight')
print("✓ Saved learning curves to 'model1_learning_curves.png'")
plt.close()

# Analyze learning curves
if train_mean[-1] - val_mean[-1] > 0.1:
    print("⚠️  WARNING: Large gap between training and validation → OVERFITTING!")
else:
    print("✓ Learning curves show good generalization")

# ============================================================================
# STEP 5: CONFUSION MATRIX
# ============================================================================
print("\n[STEP 5] Generating confusion matrix...")

y_pred = model.predict(X_test_scaled)
cm = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=True,
            xticklabels=['Normal', 'Failure'],
            yticklabels=['Normal', 'Failure'])
plt.xlabel('Predicted Label', fontsize=12)
plt.ylabel('True Label', fontsize=12)
plt.title('Confusion Matrix - Test Set', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('model1_confusion_matrix.png', dpi=300, bbox_inches='tight')
print("✓ Saved confusion matrix to 'model1_confusion_matrix.png'")
plt.close()

# ============================================================================
# STEP 6: ROC CURVE
# ============================================================================
print("\n[STEP 6] Generating ROC curve...")

y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, linewidth=2, label=f'ROC Curve (AUC = {roc_auc:.4f})')
plt.plot([0, 1], [0, 1], 'k--', linewidth=1, label='Random Classifier')
plt.xlabel('False Positive Rate', fontsize=12)
plt.ylabel('True Positive Rate', fontsize=12)
plt.title('ROC Curve - Model 1', fontsize=14, fontweight='bold')
plt.legend(loc='lower right', fontsize=10)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('model1_roc_curve.png', dpi=300, bbox_inches='tight')
print("✓ Saved ROC curve to 'model1_roc_curve.png'")
plt.close()

# ============================================================================
# STEP 7: FEATURE IMPORTANCE
# ============================================================================
print("\n[STEP 7] Visualizing feature importance...")

feature_importance = pd.DataFrame({
    'Feature': available_features,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=True)

plt.figure(figsize=(10, 8))
plt.barh(range(len(feature_importance)), feature_importance['Importance'])
plt.yticks(range(len(feature_importance)), feature_importance['Feature'])
plt.xlabel('Importance Score', fontsize=12)
plt.title('Feature Importance - Random Forest', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('model1_feature_importance.png', dpi=300, bbox_inches='tight')
print("✓ Saved feature importance to 'model1_feature_importance.png'")
plt.close()

# ============================================================================
# STEP 8: OVERFITTING DIAGNOSIS SUMMARY
# ============================================================================
print("\n" + "="*100)
print("OVERFITTING DIAGNOSIS SUMMARY")
print("="*100)

overfitting_score = 0
issues = []

# Check 1: Train-test gap
if diff > 0.1:
    overfitting_score += 3
    issues.append("⚠️  Train-test gap >10% - Strong overfitting indicator")
elif diff > 0.05:
    overfitting_score += 1
    issues.append("⚠️  Train-test gap 5-10% - Moderate overfitting")
else:
    print(f"✓ Train-test gap: {diff*100:.2f}% (Good)")

# Check 2: CV variance
if cv_scores.std() > 0.1:
    overfitting_score += 2
    issues.append("⚠️  High CV variance - Model unstable")
elif cv_scores.std() > 0.05:
    overfitting_score += 1
    issues.append("⚠️  Moderate CV variance")
else:
    print(f"✓ CV variance: {cv_scores.std()*100:.2f}% (Good)")

# Check 3: Learning curves
if train_mean[-1] - val_mean[-1] > 0.1:
    overfitting_score += 3
    issues.append("⚠️  Learning curves show large gap - Overfitting!")
else:
    print(f"✓ Learning curve gap: {(train_mean[-1] - val_mean[-1])*100:.2f}% (Good)")

print(f"\nOverfitting Score: {overfitting_score}/8")

if issues:
    print("\n🔴 ISSUES DETECTED:")
    for issue in issues:
        print(f"  {issue}")
    print("\n➡️  RECOMMENDATION: Retrain with regularization!")
else:
    print("\n✅ NO SIGNIFICANT OVERFITTING DETECTED")
    print("The model generalizes well despite high accuracy.")

print("\n" + "="*100)
print("DIAGNOSTIC PLOTS GENERATED:")
print("="*100)
print("  1. model1_learning_curves.png")
print("  2. model1_confusion_matrix.png")
print("  3. model1_roc_curve.png")
print("  4. model1_feature_importance.png")
print("\nPlease review these plots to assess model quality!")
