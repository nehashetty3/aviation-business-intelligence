"""
Aviation BI — Synthetic Data Engine
Generates 10,500 B2B aviation MRO transactions with realistic distributions.
Customers have staggered join dates so cohort retention analysis is meaningful.
"""
import numpy as np
import pandas as pd
from datetime import date, timedelta
import random, os

SEED = 42
np.random.seed(SEED)
random.seed(SEED)

PRODUCTS = {
    "Turbofan Engine":        ("Engine",     420000, 0.197),
    "Turboprop Engine":       ("Engine",     280000, 0.090),
    "Piston Engine":          ("Engine",      95000, 0.060),
    "APU Unit":               ("Engine",     185000, 0.080),
    "Landing Gear Assembly":  ("Airframe",   310000, 0.110),
    "Fuselage Section":       ("Airframe",   520000, 0.020),
    "Wing Flap Set":          ("Airframe",    95000, 0.040),
    "Nose Radome":            ("Airframe",    48000, 0.025),
    "Avionics Suite":         ("Avionics",   220000, 0.080),
    "FMS Unit":               ("Avionics",    85000, 0.050),
    "TCAS System":            ("Avionics",    42000, 0.030),
    "Weather Radar":          ("Avionics",    38000, 0.025),
    "Hydraulic Pump":         ("Hydraulics",  28000, 0.020),
    "Actuator Assembly":      ("Hydraulics",  19000, 0.015),
    "Brake System Kit":       ("Hydraulics",  35000, 0.025),
    "Oxygen System":          ("Safety",      22000, 0.015),
    "Fire Detection Kit":     ("Safety",      17000, 0.012),
    "ELT Beacon":             ("Safety",       8500, 0.008),
    "Seat Assembly":          ("Interior",    12000, 0.010),
    "Galley Module":          ("Interior",    45000, 0.013),
}

CUSTOMERS = {
    "Middle East": [
        "Emirates MRO", "Etihad Airways", "Saudia Technic", "flydubai",
        "Air Arabia", "Oman Air", "Qatar Airways", "Kuwait Airways",
        "Gulf Air", "Air Arabia Abu Dhabi", "flynas", "SAUDIA Airlines",
    ],
    "Asia": [
        "ANA Technik", "Singapore Airlines Engg", "Cathay Pacific",
        "Air India Engg", "Korean Air MRO", "Malaysia Airlines",
        "China Eastern MRO", "Thai Airways Tech", "Vietnam Airlines Tech",
        "IndiGo", "AirAsia Engg", "Garuda Technik",
    ],
    "Europe": [
        "Lufthansa Technik", "Air France Industries", "Iberia MRO",
        "Finnair Tech", "LOT Aircraft Maintenance", "British Airways",
        "KLM Engineering", "Turkish Airlines Tech", "Swiss MRO",
        "Austrian Airlines", "TAP Air Portugal", "Ryanair Technik",
    ],
    "Americas": [
        "Delta TechOps", "United MRO", "LATAM Technik",
        "Air Canada Engg", "Avianca", "GOL Airlines",
        "American Airlines MRO", "Southwest Tech", "Alaska Airlines",
        "Copa Airlines", "Azul Linhas", "Aeromexico Tech",
    ],
}

REGION_WEIGHTS = [0.302, 0.268, 0.241, 0.189]
SEASON = {1:1.25,2:1.10,3:1.05,4:0.95,5:0.90,6:0.95,
          7:1.00,8:1.05,9:1.10,10:1.15,11:1.20,12:1.30}

START_DATE = date(2022, 1, 1)
END_DATE   = date(2024, 6, 30)
N          = 10_500


def generate() -> pd.DataFrame:
    product_names   = list(PRODUCTS.keys())
    product_weights = [PRODUCTS[p][2] for p in product_names]
    region_list     = list(CUSTOMERS.keys())
    delta           = (END_DATE - START_DATE).days

    # Stagger customer join dates across first 18 months for meaningful cohorts
    all_customers_flat = [(c, r) for r, clist in CUSTOMERS.items() for c in clist]
    customer_join = {}
    for idx, (c, _) in enumerate(all_customers_flat):
        join_offset = int((idx / len(all_customers_flat)) * 540)
        customer_join[c] = START_DATE + timedelta(days=join_offset)

    rows = []
    for i in range(N):
        product = random.choices(product_names, weights=product_weights, k=1)[0]
        category, base_px, _ = PRODUCTS[product]

        region   = random.choices(region_list, weights=REGION_WEIGHTS, k=1)[0]
        customer = random.choice(CUSTOMERS[region])

        join_date = customer_join[customer]
        min_day   = (join_date - START_DATE).days
        d = START_DATE + timedelta(days=random.randint(min_day, delta))

        yr = {2022: 1.0, 2023: 1.08, 2024: 1.15}.get(d.year, 1.0)
        if d.year == 2023 and d.month in (4, 5, 6):
            yr = 1.03

        units = max(1, int(np.random.negative_binomial(2, 0.45) * SEASON[d.month] * yr))
        bulk  = 1 - 0.012 * np.log1p(units)
        price = round(max(base_px * 0.70, base_px * bulk * np.random.normal(1.0, 0.09)), 2)

        rows.append({
            "Transaction_ID": f"TXN-{i+1:05d}",
            "Date":           d.strftime("%Y-%m-%d"),
            "Year":           d.year,
            "Month":          d.month,
            "Month_Name":     d.strftime("%b"),
            "Quarter":        f"Q{(d.month-1)//3+1}",
            "Product_Name":   product,
            "Category":       category,
            "Region":         region,
            "Customer":       customer,
            "Units_Sold":     units,
            "Unit_Price":     price,
            "Revenue":        round(price * units, 2),
        })

    df = pd.DataFrame(rows).sort_values("Date").reset_index(drop=True)

    rev = df.groupby("Product_Name")["Revenue"].sum().sort_values(ascending=False)
    cum = rev.cumsum() / rev.sum()
    abc = {p: ("A" if c <= 0.70 else "B" if c <= 0.90 else "C") for p, c in cum.items()}
    df["ABC_Class"] = df["Product_Name"].map(abc)

    os.makedirs("data", exist_ok=True)
    df.to_parquet("data/sales.parquet", index=False)
    print(f"[data] Generated {len(df):,} rows → data/sales.parquet")
    return df


if __name__ == "__main__":
    generate()
