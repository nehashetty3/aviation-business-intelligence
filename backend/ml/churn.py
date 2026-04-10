"""XGBoost churn model with SHAP explainability."""
import numpy as np
import pandas as pd

def train_xgb_churn(rfm: pd.DataFrame):
    import xgboost as xgb
    import shap
    from sklearn.preprocessing import StandardScaler

    X = rfm[["Recency","Frequency","Monetary"]].values
    threshold = float(np.percentile(rfm["Recency"], 60))
    y = (rfm["Recency"] > threshold).astype(int).values
    if len(np.unique(y)) < 2:
        y = (rfm["Recency"] > rfm["Recency"].median()).astype(int).values

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(Xs, y)

    proba = model.predict_proba(Xs)
    churn_prob = proba[:,1] if proba.shape[1]==2 else (rfm["Recency"].values/rfm["Recency"].max())

    # SHAP values
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(Xs)
    if isinstance(shap_values, list):
        shap_mat = shap_values[1]
    else:
        shap_mat = shap_values

    features = ["Recency","Frequency","Monetary"]
    mean_abs_shap = np.abs(shap_mat).mean(axis=0)

    shap_importance = [
        {"feature": f, "importance": round(float(v),4), "shap_mean": round(float(s),4)}
        for f, v, s in zip(features, model.feature_importances_, mean_abs_shap)
    ]
    shap_importance.sort(key=lambda x: x["importance"], reverse=True)

    # Per-customer SHAP waterfall data
    customer_shap = []
    for i, row in rfm.iterrows():
        idx = list(rfm.index).index(i)
        sv = shap_mat[idx]
        customer_shap.append({
            "customer": row["Customer"],
            "base_value": round(float(explainer.expected_value if not isinstance(explainer.expected_value, list) else explainer.expected_value[1]), 4),
            "shap": {f: round(float(sv[j]),4) for j,f in enumerate(features)},
        })

    return churn_prob, shap_importance, customer_shap, scaler, model
