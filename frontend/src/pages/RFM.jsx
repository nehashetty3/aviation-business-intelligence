import { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import { fmtM }   from '../utils/format.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar  from '../components/ExportBar.jsx'
import InsightBox from '../components/InsightBox.jsx'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SEG_COLORS = {
  Champions:           '#7C3AED',
  'Loyal Customers':   '#1755F4',
  'Potential Loyalists':'#059669',
  'At Risk':           '#D97706',
  Lost:                '#DC2626',
}

export default function RFM() {
  const [seg, setSeg] = useState('all')
  const { data: rfm } = useApi(() => api.rfm(), [])

  const segments = useMemo(() => {
    if (!rfm) return {}
    return rfm.reduce((acc, c) => {
      acc[c.segment] = (acc[c.segment] || 0) + 1
      return acc
    }, {})
  }, [rfm])

  const filtered = useMemo(() => {
    if (!rfm) return []
    return seg === 'all' ? rfm : rfm.filter(c => c.segment === seg)
  }, [rfm, seg])

  const scatterData = filtered?.map(c => ({
    x: c.frequency,
    y: +(c.monetary / 1e6).toFixed(3),
    recency: c.recency,
    segment: c.segment,
    customer: c.customer,
  }))

  return (
    <div className="page">
      <PageHeader title="RFM Segmentation" subtitle="Recency, Frequency, Monetary scoring across all customers">
        <select className="filter-select" value={seg} onChange={e => setSeg(e.target.value)}>
          <option value="all">All segments</option>
          {Object.keys(SEG_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
        <ExportBar page="rfm" />
      </PageHeader>

      {/* Segment pill cards */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {Object.entries(SEG_COLORS).map(([s, color]) => (
          <button key={s} onClick={() => setSeg(seg === s ? 'all' : s)}
            style={{
              padding:'8px 14px', borderRadius:6, border:`1px solid ${seg === s ? color : '#E5E7EB'}`,
              background: seg === s ? color : '#fff', color: seg === s ? '#fff' : '#374151',
              fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s',
              display:'flex', alignItems:'center', gap:6,
            }}>
            <span style={{ fontFamily:'DM Mono', fontSize:16, lineHeight:1 }}>
              {segments[s] ?? 0}
            </span>
            {s}
          </button>
        ))}
      </div>

      <div className="grid-60-40">
        <div className="card">
          <div className="card-header"><span className="card-title">Frequency vs Monetary Value</span></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F3F4F6" />
                <XAxis type="number" dataKey="x" name="Frequency" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} label={{ value:'Transactions', position:'insideBottom', offset:-4, fontSize:10, fill:'#9CA3AF' }} />
                <YAxis type="number" dataKey="y" name="Monetary" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} width={44} />
                <Tooltip contentStyle={{ backgroundColor:'#fff', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:6, padding:'8px 12px', fontSize:12 }}>
                        <div style={{ fontWeight:600, marginBottom:4 }}>{d?.customer}</div>
                        <div>Transactions: {d?.x}</div>
                        <div>Revenue: ${d?.y}M</div>
                        <div>Last purchase: {d?.recency}d ago</div>
                      </div>
                    )
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData?.map((d, i) => <Cell key={i} fill={SEG_COLORS[d.segment] ?? '#9CA3AF'} fillOpacity={0.75} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{marginBottom:16}}>
          <div className="card-body">
            <InsightBox chart="RFM customer segmentation" data={Object.entries(segments).map(([s,n])=>({segment:s,count:n}))} context="RFM scores and segments" />
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="card-header"><span className="card-title">Segment Key</span></div>
          <div className="card-body">
            {Object.entries(SEG_COLORS).map(([s, color]) => (
              <div key={s} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
                  <span style={{ fontSize:13 }}>{s}</span>
                </div>
                <span style={{ fontFamily:'DM Mono', fontSize:13 }}>{segments[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><span className="card-title">Customer Scores</span></div>
        <div className="card-body" style={{ paddingTop:0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Region</th>
                  <th className="right">Recency (d)</th>
                  <th className="right">Frequency</th>
                  <th className="right">Monetary</th>
                  <th className="right">Score</th>
                  <th>Segment</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map(c => (
                  <tr key={c.customer}>
                    <td style={{ fontWeight:500 }}>{c.customer}</td>
                    <td style={{ color:'#6B7280' }}>{c.region}</td>
                    <td className="num">{c.recency}</td>
                    <td className="num">{c.frequency}</td>
                    <td className="num">{fmtM(c.monetary)}</td>
                    <td className="num" style={{ fontFamily:'DM Mono' }}>{c.rfm_score}</td>
                    <td><span className={`badge badge seg-${c.segment}`} style={{ background: SEG_COLORS[c.segment]+'18', color: SEG_COLORS[c.segment] }}>{c.segment}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
