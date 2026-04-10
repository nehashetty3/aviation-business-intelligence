export default function KPICard({ label, value, delta, deltaLabel, format = 'number' }) {
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const sign = delta > 0 ? '+' : ''

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta !== undefined && (
        <div className={`kpi-delta ${dir}`}>
          {sign}{(delta * 100).toFixed(1)}% {deltaLabel || 'YoY'}
        </div>
      )}
    </div>
  )
}
