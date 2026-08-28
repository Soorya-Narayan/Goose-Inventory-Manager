import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

print("="*100)
print("STEP 1: LOADING DATA")
print("="*100)

# Read the Excel file
df = pd.read_excel('Report_023.xlsx')
print(f"Initial shape: {df.shape}")

print("\n" + "="*100)
print("STEP 2: CLEANING METADATA ROWS")
print("="*100)

# The actual data starts from row 6 (index 6)
# Row 5 contains the actual column headers
df_clean = df.iloc[6:].copy()  # Skip first 6 rows of metadata
df_clean.columns = df.iloc[5]  # Use row 5 as column headers

print(f"Shape after removing metadata: {df_clean.shape}")
print(f"\nCleaned column names:")
for i, col in enumerate(df_clean.columns, 1):
    print(f"{i}. {col}")

# Reset index
df_clean = df_clean.reset_index(drop=True)

print("\n" + "="*100)
print("STEP 3: DATA TYPE CONVERSION")
print("="*100)

# Convert timestamp to datetime
df_clean['Time stamp'] = pd.to_datetime(df_clean['Time stamp'], errors='coerce')

# Convert numeric columns
numeric_cols = [
    'Remaining Time (sec)',
    'Flow                                                (Liter/Hr)',
    'Supply Temp (°C)',
    'Return Temp (°C)',
    'Return Conduct (mS/m)',
    'Acid Tank Temp (°C)',
    'Caustic Tank Temp (°C)',
    'Hot Water Tank Temp (°C)',
    'Recup Tank Temp (°C)'
]

for col in numeric_cols:
    if col in df_clean.columns:
        df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')

print("Data types converted successfully!")

print("\n" + "="*100)
print("STEP 4: MISSING VALUES ANALYSIS")
print("="*100)

missing_count = df_clean.isnull().sum()
missing_percentage = (missing_count / len(df_clean)) * 100

print("\nMissing values per column:")
for col in df_clean.columns:
    if missing_count[col] > 0:
        print(f"{col}: {missing_count[col]} ({missing_percentage[col]:.2f}%)")

print("\n" + "="*100)
print("STEP 5: HANDLING MISSING VALUES")
print("="*100)

# Strategy:
# 1. For numeric columns: Fill with median (robust to outliers)
# 2. For categorical columns: Fill with mode or 'Unknown'

# Handle numeric columns
for col in numeric_cols:
    if col in df_clean.columns:
        median_val = df_clean[col].median()
        df_clean[col].fillna(median_val, inplace=True)
        print(f"✓ Filled {col} with median: {median_val:.2f}")

# Handle categorical columns
categorical_cols = ['Selected Recipe', 'Step Status', 'Step Reason', 'Return Valve Status', 'Pump Selected', 'User']
for col in categorical_cols:
    if col in df_clean.columns:
        mode_val = df_clean[col].mode()[0] if not df_clean[col].mode().empty else 'Unknown'
        df_clean[col].fillna(mode_val, inplace=True)
        print(f"✓ Filled {col} with mode: {mode_val}")

print("\n" + "="*100)
print("STEP 6: OUTLIER DETECTION")
print("="*100)

# Detect outliers using IQR method
def detect_outliers_iqr(data, column):
    Q1 = data[column].quantile(0.25)
    Q3 = data[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    outliers = data[(data[column] < lower_bound) | (data[column] > upper_bound)]
    return len(outliers), lower_bound, upper_bound

print("\nOutlier analysis:")
for col in numeric_cols:
    if col in df_clean.columns:
        outlier_count, lower, upper = detect_outliers_iqr(df_clean, col)
        if outlier_count > 0:
            print(f"{col}: {outlier_count} outliers detected (bounds: {lower:.2f} to {upper:.2f})")

print("\n" + "="*100)
print("STEP 7: FEATURE ENGINEERING")
print("="*100)

# Create time-based features
df_clean['Hour'] = df_clean['Time stamp'].dt.hour
df_clean['DayOfWeek'] = df_clean['Time stamp'].dt.dayofweek
df_clean['Month'] = df_clean['Time stamp'].dt.month

# Temperature differences
if 'Supply Temp (°C)' in df_clean.columns and 'Return Temp (°C)' in df_clean.columns:
    df_clean['Temp_Difference'] = df_clean['Supply Temp (°C)'] - df_clean['Return Temp (°C)']
    print("✓ Created feature: Temperature Difference")

print("✓ Created time-based features: Hour, DayOfWeek, Month")

print("\n" + "="*100)
print("STEP 8: ENCODING CATEGORICAL VARIABLES")
print("="*100)

# Label encoding for categorical variables
label_encoders = {}
for col in categorical_cols:
    if col in df_clean.columns:
        le = LabelEncoder()
        df_clean[f'{col}_Encoded'] = le.fit_transform(df_clean[col].astype(str))
        label_encoders[col] = le
        print(f"✓ Encoded {col} ({len(le.classes_)} unique values)")

print("\n" + "="*100)
print("STEP 9: FINAL DATASET STATISTICS")
print("="*100)

print(f"\nFinal dataset shape: {df_clean.shape}")
print(f"Total missing values: {df_clean.isnull().sum().sum()}")
print(f"\nNumeric columns statistics:")
print(df_clean[numeric_cols].describe())

print("\n" + "="*100)
print("STEP 10: SAVING PREPROCESSED DATA")
print("="*100)

# Save cleaned dataset
df_clean.to_csv('preprocessed_data.csv', index=False)
print("✓ Saved preprocessed data to 'preprocessed_data.csv'")

# Save a summary report
with open('preprocessing_report.txt', 'w', encoding='utf-8') as f:
    f.write("="*100 + "\n")
    f.write("DATA PREPROCESSING REPORT\n")
    f.write("="*100 + "\n\n")
    
    f.write(f"Original dataset shape: (69808, 16)\n")
    f.write(f"Cleaned dataset shape: {df_clean.shape}\n")
    f.write(f"Total records: {len(df_clean)}\n\n")
    
    f.write("PREPROCESSING STEPS APPLIED:\n")
    f.write("1. Removed 6 metadata rows\n")
    f.write("2. Converted data types (datetime, numeric)\n")
    f.write("3. Handled missing values using median/mode imputation\n")
    f.write("4. Detected outliers using IQR method\n")
    f.write("5. Created new features (Hour, DayOfWeek, Month, Temp_Difference)\n")
    f.write("6. Encoded categorical variables using Label Encoding\n\n")
    
    f.write("FINAL DATASET INFO:\n")
    f.write(f"- Total missing values: {df_clean.isnull().sum().sum()}\n")
    f.write(f"- Total columns: {len(df_clean.columns)}\n")
    f.write(f"- Numeric columns: {len(numeric_cols)}\n")
    f.write(f"- Categorical columns: {len(categorical_cols)}\n\n")
    
    f.write("DATASET IS READY FOR MODEL TRAINING!\n")

print("✓ Saved preprocessing report to 'preprocessing_report.txt'")

print("\n" + "="*100)
print("✅ DATA PREPROCESSING COMPLETE!")
print("="*100)
print("\nThe dataset is now ready for training and testing!")
print("Next steps:")
print("1. Define your target variable")
print("2. Select features for model training")
print("3. Split data into train/test sets")
print("4. Build and train your AI model")
