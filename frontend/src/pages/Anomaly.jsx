import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import { fmtM, tooltipStyle } from '../utils/format.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar  from '../components/ExportBar.jsx'
import InsightBox from '../components/InsightBox.jsx'
import {
  ComposedChart, Bar, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

export default function Anomaly() {
  const { data, loading } = useApi(() => api.anomaly(), [])

  const anomalyCount = data?.filter(d => d.is_anomaly).length ?? 0

  return (
    <div className="page">
      <PageHeader
        title="Anomaly Detection"
        subtitle="IsolationForest model identifies statistically unusual demand months"
      />

      {loading && <div className="empty">Running anomaly detection…</div>}

      {data && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <div className="kpi-card" style={{ borderLeft: '3px solid #DC2626' }}>
              <div className="kpi-label">Anomalous Months</div>
              <div className="kpi-value">{anomalyCount}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>10% contamination threshold</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: '3px solid #1755F4' }}>
              <div className="kpi-label">Normal Months</div>
              <div className="kpi-value">{(data?.length ?? 0) - anomalyCount}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>Out of {data?.length} total</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: '3px solid #D97706' }}>
              <div className="kpi-label">Model</div>
              <div className="kpi-value" style={{ fontSize:16, paddingTop:4 }}>Isolation</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>Forest · sklearn</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Monthly Revenue — Anomalies Highlighted</span></div>
            <div className="card-body" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1e6).toFixed(0)}M`} width={44} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v, n) => {
                      if (n === 'revenue') return [fmtM(v), 'Revenue']
                      if (n === 'anomaly_score') return [v.toFixed(3), 'Anomaly Score']
                      return [v, n]
                    }}
                  />
                  <Bar dataKey="revenue" radius={[3,3,0,0]} barSize={14}>
                    {data.map((d, i) => <Cell key={i} fill={d.is_anomaly ? '#DC2626' : '#1755F4'} fillOpacity={d.is_anomaly ? 1 : 0.5} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ padding: '0 0 12px' }}>
            <InsightBox chart="Revenue anomaly detection" data={data?.filter(d=>d.is_anomaly)} context="IsolationForest monthly demand anomalies" />
          </div>

          <div className="card mt-4">
            <div className="card-header"><span className="card-title">Anomaly Score by Month</span></div>
            <div className="card-body" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toFixed(3), 'Score']} />
                  <ReferenceLine y={data.filter(d=>d.is_anomaly).reduce((a,b)=>a+b.anomaly_score,0)/Math.max(1,anomalyCount)} stroke="#DC2626" strokeDasharray="3 3" label={{ value:'Anomaly threshold', fontSize:9, fill:'#DC2626' }} />
                  <Bar dataKey="anomaly_score" radius={[2,2,0,0]} barSize={10}>
                    {data.map((d, i) => <Cell key={i} fill={d.is_anomaly ? '#DC2626' : '#E5E7EB'} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header"><span className="card-title">Flagged Months</span></div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="right">Revenue</th>
                      <th className="right">Units</th>
                      <th className="right">Anomaly Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filter(d => d.is_anomaly).map(d => (
                      <tr key={d.month}>
                        <td style={{ fontFamily:'DM Mono', fontSize:12 }}>{d.month}</td>
                        <td className="num">{fmtM(d.revenue)}</td>
                        <td className="num">{d.units?.toLocaleString()}</td>
                        <td className="num" style={{ color:'#DC2626', fontFamily:'DM Mono' }}>{d.anomaly_score.toFixed(3)}</td>
                        <td><span className="badge badge-high">Anomaly</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
