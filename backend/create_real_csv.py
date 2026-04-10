import os
import sys
import pandas as pd

# Add project root to PYTHONPATH so we can import backend modules
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(project_root)

from backend.generate_data import generate

# Ensure the public_data directory exists
os.makedirs("public_data", exist_ok=True)

# Generate the synthetic dataset (10,500 rows) – this will act as our "real" CSV
df = generate()

# Write to CSV in the location the loader expects
csv_path = os.path.join("public_data", "real_data.csv")
df.to_csv(csv_path, index=False)
print(f"[data] Created CSV with {len(df)} rows at {csv_path}")
