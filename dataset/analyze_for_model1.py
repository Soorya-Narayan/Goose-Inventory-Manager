import pandas as pd
import numpy as np

print("="*100)
print("MODEL 1: CIP CYCLE FAILURE PREDICTION - FEATURE ANALYSIS")
print("="*100)

# Load preprocessed data
df = pd.read_csv('preprocessed_data.csv')

print(f"\nDataset shape: {df.shape}")
print(f"\nAvailable columns:")
for i, col in enumerate(df.columns, 1):
    print(f"{i}. {col}")

print("\n" + "="*100)
print("REQUIRED FEATURES FOR MODEL 1:")
print("="*100)

required_features = {
    'Temperature Ramp': ['Supply Temp (°C)', 'Return Temp (°C)', 'Temp_Difference',
                         'Acid Tank Temp (°C)', 'Caustic Tank Temp (°C)', 
                         'Hot Water Tank Temp (°C)', 'Recup Tank Temp (°C)'],
    'Flow': ['Flow                                                (Liter/Hr)'],
    'Conductivity': ['Return Conduct (mS/m)'],
    'Phase Time': ['Remaining Time (sec)', 'Hour', 'DayOfWeek', 'Time stamp'],
    'Valve Response': ['Return Valve Status', 'Return Valve Status_Encoded'],
    'Process Info': ['Step Status', 'Step Status_Encoded', 'Selected Recipe', 
                     'Selected Recipe_Encoded', 'Pump Selected', 'Pump Selected_Encoded']
}

print("\nFeature Availability Check:")
for category, features in required_features.items():
    print(f"\n{category}:")
    for feature in features:
        if feature in df.columns:
            print(f"  ✓ {feature}")
        else:
            print(f"  ✗ {feature} [MISSING]")

print("\n" + "="*100)
print("STEP STATUS ANALYSIS (Potential Failure Indicators):")
print("="*100)

if 'Step Status' in df.columns:
    print("\nStep Status Distribution:")
    status_counts = df['Step Status'].value_counts()
    print(status_counts)
    
    print("\nUnique Step Statuses:")
    for status in df['Step Status'].unique():
        if pd.notna(status):
            print(f"  - {status}")

print("\n" + "="*100)
print("RECIPE TYPES:")
print("="*100)

if 'Selected Recipe' in df.columns:
    print("\nRecipe Distribution:")
    recipe_counts = df['Selected Recipe'].value_counts()
    print(recipe_counts.head(10))

print("\n" + "="*100)
print("CREATING FAILURE LABELS:")
print("="*100)

# We need to define what constitutes a "failure"
# Potential failure indicators:
# 1. Abnormal temperature patterns
# 2. Low/unstable flow
# 3. High conductivity variance
# 4. Status changes to error states

print("\nStrategy for Failure Detection:")
print("Since we don't have explicit 'failure' labels, we'll create synthetic labels based on:")
print("1. Extreme temperature deviations (>3 std dev)")
print("2. Flow anomalies (negative or extremely high)")
print("3. Long remaining times (stuck cycles)")
print("4. Step status indicators")

# Create anomaly flags
df_analysis = df.copy()

# Temperature anomalies
temp_cols = ['Supply Temp (°C)', 'Return Temp (°C)', 'Caustic Tank Temp (°C)']
anomaly_count = 0

for col in temp_cols:
    if col in df.columns:
        mean = df[col].mean()
        std = df[col].std()
        df_analysis[f'{col}_anomaly'] = ((df[col] < mean - 3*std) | (df[col] > mean + 3*std)).astype(int)
        anomaly_count += df_analysis[f'{col}_anomaly'].sum()

print(f"\n✓ Temperature anomalies detected: {anomaly_count}")

# Flow anomalies
flow_col = 'Flow                                                (Liter/Hr)'
if flow_col in df.columns:
    df_analysis['flow_anomaly'] = ((df[flow_col] < 0) | (df[flow_col] > df[flow_col].quantile(0.99))).astype(int)
    print(f"✓ Flow anomalies detected: {df_analysis['flow_anomaly'].sum()}")

# Conductivity anomalies
cond_col = 'Return Conduct (mS/m)'
if cond_col in df.columns:
    mean_cond = df[cond_col].mean()
    std_cond = df[cond_col].std()
    df_analysis['cond_anomaly'] = ((df[cond_col] < mean_cond - 3*std_cond) | 
                                    (df[cond_col] > mean_cond + 3*std_cond)).astype(int)
    print(f"✓ Conductivity anomalies detected: {df_analysis['cond_anomaly'].sum()}")

# Aggregate failure label
anomaly_cols = [col for col in df_analysis.columns if '_anomaly' in col]
df_analysis['failure_risk'] = df_analysis[anomaly_cols].sum(axis=1)
df_analysis['is_failure'] = (df_analysis['failure_risk'] >= 2).astype(int)

print(f"\n✓ Total potential failures (2+ anomalies): {df_analysis['is_failure'].sum()}")
print(f"✓ Failure rate: {df_analysis['is_failure'].mean()*100:.2f}%")

print("\n" + "="*100)
print("FEATURE STATISTICS FOR MODEL TRAINING:")
print("="*100)

feature_cols = ['Supply Temp (°C)', 'Return Temp (°C)', 'Temp_Difference',
                flow_col, cond_col, 'Remaining Time (sec)', 
                'Step Status_Encoded', 'Selected Recipe_Encoded',
                'Return Valve Status_Encoded', 'Hour', 'DayOfWeek']

available_features = [col for col in feature_cols if col in df.columns]

print(f"\nAvailable features for training: {len(available_features)}")
print("\nFeature statistics:")
print(df[available_features].describe())

# Save analysis
df_analysis.to_csv('model1_feature_analysis.csv', index=False)
print("\n✓ Saved feature analysis to 'model1_feature_analysis.csv'")

print("\n" + "="*100)
print("READY TO BUILD MODEL 1")
print("="*100)
print(f"\nTarget variable: is_failure ({df_analysis['is_failure'].sum()} positive samples)")
print(f"Features available: {len(available_features)}")
print("Next step: Build and train failure prediction model")
