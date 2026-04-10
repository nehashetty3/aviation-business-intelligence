"""Collaborative filtering recommendation engine using ALS (implicit library)."""
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

def train_recommender(df: pd.DataFrame):
    import implicit

    customers = sorted(df["Customer"].unique())
    products  = sorted(df["Product_Name"].unique())
    cust_idx  = {c:i for i,c in enumerate(customers)}
    prod_idx  = {p:i for i,p in enumerate(products)}

    # Build interaction matrix: revenue-weighted purchases
    agg = df.groupby(["Customer","Product_Name"])["Revenue"].sum().reset_index()
    rows = agg["Customer"].map(cust_idx).values
    cols = agg["Product_Name"].map(prod_idx).values
    data = np.log1p(agg["Revenue"].values).astype(np.float32)

    matrix = csr_matrix((data, (rows, cols)), shape=(len(customers), len(products)))

    model = implicit.als.AlternatingLeastSquares(
        factors=32, regularization=0.1, iterations=30, random_state=42
    )
    model.fit(matrix)

    return model, matrix, customers, products, cust_idx, prod_idx

def get_recommendations(customer_name: str, model, matrix, customers, products, cust_idx, n=5):
    if customer_name not in cust_idx:
        return []
    idx = cust_idx[customer_name]
    ids, scores = model.recommend(idx, matrix[idx], N=n, filter_already_liked_items=True)
    return [
        {"product": products[i], "score": round(float(s),4)}
        for i,s in zip(ids, scores)
    ]
