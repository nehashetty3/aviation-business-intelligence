import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import { tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import ExportBar   from '../components/ExportBar.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

const COLORS = ['#1755F4','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6']

const ELabel = ({ e }) => {
  if (e > -0.5) return <span style={{ color:'#059669', fontSize:11, fontWeight:600 }}>Highly inelastic</span>
  if (e > -1.0) return <span style={{ color:'#1755F4', fontSize:11, fontWeight:600 }}>Inelastic</span>
  if (e > -1.5) return <span style={{ color:'#D97706', fontSize:11, fontWeight:600 }}>Unit elastic</span>
  return <span style={{ color:'#DC2626', fontSize:11, fontWeight:600 }}>Elastic</span>
}

export default function Elasticity() {
  const [selected, setSelected] = useState(null)
  const { data, loading } = useApi(() => api.elasticity(), [])

  const selectedCat = data?.find(d => d.category === selected) ?? data?.[0]

  return (
    <div className="page">
      <PageHeader title="Price Elasticity" subtitle="OLS log-log regression: % demand change per % price change by category">
        <ExportBar page="elasticity" />
      </PageHeader>

      <div style={{ background:'#FFF8ED', border:'1px solid #FDE68A', borderRadius:8,
                    padding:'10px 16px', marginBottom:16, fontSize:12, color:'#92400E' }}>
        <strong>How to read:</strong> Elasticity = % change in demand ÷ % change in price.
        −0.3 means a 10% price increase reduces demand by 3% (inelastic = pricing power).
        −1.5 means a 10% price increase reduces demand by 15% (elastic = price sensitive).
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Elasticity by Category</span></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {loading && <div className="empty">Computing regressions…</div>}
            {data?.map((d, i) => (
              <div key={d.category}
                onClick={() => setSelected(d.category === selected ? null : d.category)}
                style={{ padding:'12px 0', borderBottom:'1px solid #F3F4F6', cursor:'pointer',
                         background: selected===d.category ? '#F0F4FF' : 'transparent',
                         margin:'0 -20px', paddingLeft:20, paddingRight:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{d.category}</div>
                    <ELabel e={d.elasticity} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'DM Mono', fontSize:18, fontWeight:500,
                                  color: d.elasticity > -1 ? '#059669' : '#DC2626' }}>
                      {d.elasticity.toFixed(2)}
                    </div>
                    <div style={{ fontSize:10, color:'#9CA3AF' }}>R²={d.r_squared}</div>
                  </div>
                </div>
                <div style={{ marginTop:6, height:4, background:'#F3F4F6', borderRadius:2 }}>
                  <div style={{ height:'100%', borderRadius:2,
                                width:`${Math.min(100, Math.abs(d.elasticity)*50)}%`,
                                background: COLORS[i % COLORS.length] }} />
                </div>
                <div style={{ fontSize:11, color:'#6B7280', marginTop:6 }}>{d.insight}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedCat && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Price vs Demand — {selectedCat.category}</span>
            </div>
            <div className="card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top:4, right:8, left:0, bottom:20 }}>
                  <CartesianGrid stroke="#F3F4F6" />
                  <XAxis type="number" dataKey="price" name="Avg Price" tick={{ fontSize:10, fill:'#9CA3AF' }}
                    tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`}
                    label={{ value:'Avg unit price', position:'insideBottom', offset:-12, fontSize:10, fill:'#9CA3AF' }}/>
                  <YAxis type="number" dataKey="units" name="Units" tick={{ fontSize:10, fill:'#9CA3AF' }}
                    tickLine={false} axisLine={false} width={40}
                    label={{ value:'Units sold', angle:-90, position:'insideLeft', fontSize:10, fill:'#9CA3AF' }}/>
                  <Tooltip contentStyle={tooltipStyle}
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:6, padding:'8px 12px', fontSize:12 }}>
                          <div>Price: ${d?.price?.toLocaleString()}</div>
                          <div>Units: {d?.units}</div>
                        </div>
                      )
                    }}/>
                  <Scatter data={selectedCat.data} fill="#1755F4" fillOpacity={0.7} r={5} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{ padding:'0 20px 16px', fontSize:12, color:'#6B7280' }}>
              <strong>Elasticity: {selectedCat.elasticity.toFixed(3)}</strong> ·
              p-value: {selectedCat.p_value} · R²: {selectedCat.r_squared}
            </div>
            <div style={{ padding:'0 20px 16px' }}>
              <InsightBox chart={`Price elasticity — ${selectedCat.category}`}
                data={selectedCat.data}
                context={`Elasticity=${selectedCat.elasticity}, R²=${selectedCat.r_squared}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
