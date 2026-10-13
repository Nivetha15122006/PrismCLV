import pandas as pd
import numpy as np

# Load the downloaded file
df = pd.read_csv("data/real_online_retail_30k.csv")

# Sample 350 unique customers to yield ~30,000 item transaction rows
np.random.seed(42)
unique_customers = df['CustomerID'].unique()
sampled_customers = np.random.choice(unique_customers, size=350, replace=False)

# Keep full history for sampled customers
df_30k = df[df['CustomerID'].isin(sampled_customers)].copy()

# Overwrite dataset file
df_30k.to_csv("data/real_online_retail_30k.csv", index=False)

print("==========================================")
print("         TRIMMED DATASET READY            ")
print("==========================================")
print(f" Total Rows:       {len(df_30k):,}")
print(f" Unique Customers: {df_30k['CustomerID'].nunique():,}")