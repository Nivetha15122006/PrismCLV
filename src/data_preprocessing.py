import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os

def load_and_preprocess_data(csv_path="data/real_online_retail_30k.csv"):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Please check path.")

    df = pd.read_csv(csv_path)
    
    # Calculate Total Spend per transaction item
    df['TotalSpend'] = df['UnitPrice'] * df['Quantity']
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    
    max_date = df['InvoiceDate'].max() + pd.Timedelta(days=1)
    
    # Customer Level Aggregation (RFM + Channels)
    features = df.groupby('CustomerID').agg(
        recency_days=('InvoiceDate', lambda x: (max_date - x.max()).days),
        frequency=('InvoiceNo', 'nunique'),
        monetary=('TotalSpend', 'sum'),
        has_instagram=('Channel', lambda x: int('Instagram' in x.values)),
        has_google=('Channel', lambda x: int('Google_Search' in x.values)),
        has_email=('Channel', lambda x: int('Email' in x.values)),
        has_tiktok=('Channel', lambda x: int('TikTok' in x.values))
    ).reset_index()

    # Churn Target (Recency > 180 days)
    features['churn_event'] = (features['recency_days'] > 180).astype(int)
    
    # Survival Duration (Days active or total observation time)
    features['duration_days'] = 365 - features['recency_days']
    features['duration_days'] = features['duration_days'].clip(lower=1)

    # 365-Day pLTV Target Variable
    features['pltv_365'] = (
        features['monetary'] * 1.10 + 
        features['frequency'] * 15.0 - 
        features['churn_event'] * 75.0 + 
        np.random.normal(0, 10, len(features))
    ).clip(lower=0).round(2)

    os.makedirs("data", exist_ok=True)
    features.to_csv("data/processed_features.csv", index=False)
    print(" Processed feature matrix saved to 'data/processed_features.csv'")

    feature_cols = ['recency_days', 'frequency', 'monetary', 'has_instagram', 'has_google', 'has_email', 'has_tiktok']
    X = features[feature_cols]
    y_churn = features[['duration_days', 'churn_event']]
    y_pltv = features['pltv_365']

    return train_test_split(X, y_churn, y_pltv, test_size=0.2, random_state=42)

if __name__ == "__main__":
    load_and_preprocess_data()