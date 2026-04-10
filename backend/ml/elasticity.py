"""Price elasticity analysis using OLS regression per category."""
import numpy as np
import pandas as pd
from scipy import stats

def compute_elasticity(df: pd.DataFrame):
    results = []
    for cat, grp in df.groupby("Category"):
        # Aggregate: monthly avg price vs units
        grp = grp.copy()
        grp["YM"] = pd.to_datetime(grp["Date"]).dt.to_period("M")
        mo = grp.groupby("YM").agg(
            avg_price=("Unit_Price","mean"),
            total_units=("Units_Sold","sum"),
        ).reset_index()

        if len(mo) < 6:
            continue

        log_p = np.log(mo["avg_price"].values)
        log_q = np.log(mo["total_units"].values.clip(1))

        slope, intercept, r, p, se = stats.linregress(log_p, log_q)

        results.append({
            "category":    cat,
            "elasticity":  round(float(slope),3),   # % change in demand / % change in price
            "r_squared":   round(float(r**2),3),
            "p_value":     round(float(p),4),
            "interpretation": (
                "Highly inelastic" if slope > -0.5
                else "Inelastic"   if slope > -1.0
                else "Unit elastic" if slope > -1.5
                else "Elastic"
            ),
            "insight": (
                f"A 10% price increase reduces demand by only {abs(slope*10):.1f}% — strong pricing power."
                if slope > -0.5 else
                f"A 10% price increase reduces demand by {abs(slope*10):.1f}% — moderate sensitivity."
                if slope > -1.0 else
                f"A 10% price increase reduces demand by {abs(slope*10):.1f}% — price-sensitive segment."
            ),
            "data": [
                {"price": round(float(p),0), "units": int(u)}
                for p,u in zip(mo["avg_price"], mo["total_units"])
            ],
        })

    results.sort(key=lambda x: x["elasticity"], reverse=True)
    return results
