"""Prophet demand forecasting with changepoint detection."""
import pandas as pd
import numpy as np

def run_prophet(df: pd.DataFrame, periods: int = 12):
    from prophet import Prophet
    mo = df.copy()
    mo["ds"] = pd.to_datetime(mo["Date"]).dt.to_period("M").dt.to_timestamp()
    series = mo.groupby("ds")["Revenue"].sum().reset_index().rename(columns={"Revenue":"y"})

    m = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.15,
        seasonality_prior_scale=10,
    )
    m.fit(series)

    future = m.make_future_dataframe(periods=periods, freq="MS")
    forecast = m.predict(future)

    history = series.rename(columns={"ds":"month","y":"revenue"})
    history["month"] = history["month"].dt.strftime("%Y-%m")

    fcast_df = forecast[forecast["ds"] > series["ds"].max()][["ds","yhat","yhat_lower","yhat_upper"]]
    fcast_out = []
    for _, row in fcast_df.iterrows():
        fcast_out.append({
            "month":     row.ds.strftime("%Y-%m"),
            "predicted": max(float(row.yhat), 0),
            "lower":     max(float(row.yhat_lower), 0),
            "upper":     float(row.yhat_upper),
        })

    changepoints = []
    deltas = m.params["delta"].mean(axis=0)
    delta_std = float(deltas.std())
    for cp, d in zip(m.changepoints, deltas):
        if abs(float(d)) > delta_std:
            changepoints.append({"month": cp.strftime("%Y-%m"), "delta": round(float(d), 4)})

    return {
        "history":      history.to_dict(orient="records"),
        "forecast":     fcast_out,
        "changepoints": changepoints,
        "model":        "Prophet (Meta) — yearly seasonality + changepoint detection",
    }
