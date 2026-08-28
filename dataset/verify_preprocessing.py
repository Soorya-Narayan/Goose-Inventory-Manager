import pandas as pd

# Load the preprocessed data
df = pd.read_csv('preprocessed_data.csv')

print("="*100)
print("VERIFICATION REPORT - CHECKING MISSING VALUES")
print("="*100)

print(f"\nDataset shape: {df.shape}")
print(f"\nColumn names:")
print(df.columns.tolist())

print("\n" + "="*100)
print("MISSING VALUES BREAKDOWN:")
print("="*100)

missing = df.isnull().sum()
missing_pct = (missing / len(df)) * 100

for col, count in missing.items():
    if count > 0:
        print(f"{col}: {count} ({missing_pct[col]:.2f}%)")

print("\n" + "="*100)
print("DATA SAMPLE (First 10 rows):")
print("="*100)
print(df.head(10))

print("\n" + "="*100)
print("BASIC STATISTICS:")
print("="*100)
print(df.describe())

print("\n" + "="*100)
print("DATA INFO:")
print("="*100)
print(df.info())
