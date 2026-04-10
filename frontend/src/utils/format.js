export const fmtM  = v => `$${(v / 1_000_000).toFixed(1)}M`
export const fmtK  = v => v >= 1_000_000 ? fmtM(v) : `$${(v / 1000).toFixed(0)}K`
export const fmtN  = v => v?.toLocaleString('en-US') ?? '—'
export const fmtPct= v => `${(v * 100).toFixed(1)}%`
export const fmtPctRaw = v => `${v.toFixed(1)}%`
export const fmtAvg= v => `$${v?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—'}`

export const CHART_COLORS = ['#1755F4','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6']

export const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}
