import os
import pandas as pd
import numpy as np

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

print("1. Downloading real UCI Online Retail Dataset...")

# Direct URL to raw dataset mirror
dataset_url = "https://raw.githubusercontent.com/databricks/Spark-The-Definitive-Guide/master/data/retail-data/all/online-retail-dataset.csv"

# Download raw CSV directly into pandas
df_raw = pd.read_csv(dataset_url)
print(f"   Successfully downloaded {len(df_raw):,} raw transaction rows!")

print("\n2. Cleaning raw real-world data...")
# Remove rows with missing CustomerID or cancelled orders (InvoiceNo starting with 'C')
df_clean = df_raw.dropna(subset=['CustomerID']).copy()
df_clean = df_clean[~df_clean['InvoiceNo'].astype(str).str.startswith('C')]
df_clean = df_clean[(df_clean['Quantity'] > 0) & (df_clean['UnitPrice'] > 0)]

# Format CustomerID as clean string
df_clean['CustomerID'] = df_clean['CustomerID'].astype(int).astype(str)

print(f"   Cleaned dataset contains {len(df_clean):,} valid transaction rows.")

print("\n3. Sampling dataset by Customer ID for optimal laptop performance...")
np.random.seed(42)
unique_customers = df_clean['CustomerID'].unique()

# Sample 3,000 unique customers (~35,000 transactions)
sampled_cust_ids = np.random.choice(unique_customers, size=min(3000, len(unique_customers)), replace=False)
df_sample = df_clean[df_clean['CustomerID'].isin(sampled_cust_ids)].copy()

print("\n4. Adding marketing attribution channels (Instagram, Google, Email, TikTok)...")
# Randomly assign marketing channels to customer touchpoints
channels = ["Instagram", "Google_Search", "Email", "TikTok"]
channel_weights = [0.35, 0.30, 0.20, 0.15]
df_sample['Channel'] = np.random.choice(channels, size=len(df_sample), p=channel_weights)

# Save final processed real dataset
output_path = "data/real_online_retail_30k.csv"
df_sample.to_csv(output_path, index=False)

print("\n==================================================")
print(f"  REAL DATASET READY: {output_path}")
print("==================================================")
print(f" Total Transactions Saved: {len(df_sample):,}")
print(f" Unique Customers:        {df_sample['CustomerID'].nunique():,}")
print(" Sample Columns:")
print(df_sample[['InvoiceNo', 'CustomerID', 'InvoiceDate', 'UnitPrice', 'Channel']].head(3))