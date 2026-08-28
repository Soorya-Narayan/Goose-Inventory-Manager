"""
Golden Baseline - Direct Extraction from All Successful Data
Simple approach: Use statistical analysis of all non-anomalous data
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

def main():
    print("="*60)
    print("GOLDEN BASELINE - STATISTICAL APPROACH")
    print("="*60)
    
    # Load preprocessed data
    print("\nLoading preprocessed data...")
    df = pd.read_csv('preprocessed_data.csv')
    print(f"Loaded {len(df):,} records")
    
    # Define key parameters with actual column names
    param_columns = {
        'supply_temp': 'Supply Temp (°C)',
        'return_temp': 'Return Temp (°C)',
        'flow': 'Flow                                                (Liter/Hr)',
        'conductivity': 'Return Conduct (mS/m)',
        'remaining_time': 'Remaining Time (sec)'
    }
    
    print("\n" + "="*60)
    print("Creating Golden Baseline from Normal Operation Data")
    print("="*60)
    
    baseline = {}
    
    for param_key, col_name in param_columns.items():
        if col_name in df.columns:
            # Get all values
            all_values = df[col_name].dropna()
            
            if len(all_values) > 0:
                # Remove outliers using IQR method (keep middle 80%)
                Q1 = all_values.quantile(0.10)
                Q3 = all_values.quantile(0.90)
                IQR = Q3 - Q1
                
                # Filter to normal range
                normal_values = all_values[
                    (all_values >= Q1 - 0.5 * IQR) & 
                    (all_values <= Q3 + 0.5 * IQR)
                ]
                
                print(f"\n{param_key}:")
                print(f"  Total values: {len(all_values):,}")
                print(f"  Normal range values: {len(normal_values):,} ({len(normal_values)/len(all_values)*100:.1f}%)")
                
                # Calculate statistics from normal values
                baseline[param_key] = {
                    'mean': float(normal_values.mean()),
                    'std': float(normal_values.std()),
                    'min': float(normal_values.min()),
                    'max': float(normal_values.max()),
                    'p25': float(normal_values.quantile(0.25)),
                    'p50': float(normal_values.quantile(0.50)),
                    'p75': float(normal_values.quantile(0.75)),
                    'p95': float(normal_values.quantile(0.95)),
                    'threshold_low': float(Q1),
                    'threshold_high': float(Q3)
                }
                
                print(f"  Mean: {baseline[param_key]['mean']:.2f} ± {baseline[param_key]['std']:.2f}")
                print(f"  Normal range: [{baseline[param_key]['threshold_low']:.2f}, {baseline[param_key]['threshold_high']:.2f}]")
                print(f"  Median: {baseline[param_key]['p50']:.2f}")
    
    # Add metadata
    baseline['metadata'] = {
        'n_total_records': len(df),
        'n_parameters': len(baseline),
        'creation_date': pd.Timestamp.now().isoformat(),
        'data_source': 'preprocessed_data.csv',
        'method': 'Statistical baseline from central 80% of data (IQR outlier removal)',
        'description': 'Golden baseline represents normal operating conditions'
    }
    
    # Save baseline
    output_path = Path('models/golden_baseline.json')
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(baseline, f, indent=2)
    
    print("\n" + "="*60)
    print("✅ GOLDEN BASELINE CREATED SUCCESSFULLY")
    print("="*60)
    print(f"\nTotal records analyzed: {len(df):,}")
    print(f"Parameters in baseline: {len(baseline) - 1}")
    print(f"Output: {output_path}")
    print("\n✓ Baseline represents normal operating conditions")
    print("✓ Ready for deviation scoring!")

if __name__ == '__main__':
    main()
