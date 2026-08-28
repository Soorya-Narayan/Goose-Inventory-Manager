import pandas as pd

# Read the Excel file
df = pd.read_excel('Report_023.xlsx')

print('='*100)
print('DATASET OVERVIEW')
print('='*100)
print(f'\nTotal Rows: {len(df)}')
print(f'Total Columns: {len(df.columns)}')

print(f'\nColumn Names:')
for i, col in enumerate(df.columns, 1):
    print(f'{i}. {col}')

print('\n' + '='*100)
print('SAMPLE DATA (First 5 rows):')
print('='*100)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 200)
print(df.head(5))

print('\n' + '='*100)
print('DATA TYPES:')
print('='*100)
for col in df.columns:
    print(f'{col}: {df[col].dtype}')

print('\n' + '='*100)
print('MISSING VALUES:')
print('='*100)
missing = df.isnull().sum()
if any(missing > 0):
    for col, count in missing[missing > 0].items():
        print(f'{col}: {count} missing ({count/len(df)*100:.2f}%)')
else:
    print('No missing values!')

print('\n' + '='*100)
print('UNIQUE VALUES PER COLUMN:')
print('='*100)
for col in df.columns:
    print(f'{col}: {df[col].nunique()} unique values')

print('\n' + '='*100)
print('BASIC STATISTICS (Numeric columns):')
print('='*100)
print(df.describe())
