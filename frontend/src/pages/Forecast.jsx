import { useState } from 'react'
import { useApi }   from '../hooks/useApi.js'
import { api }      from '../utils/api.js'
import { tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

export default function Forecast() {
  const [periods, setPeriods] = useState(12)
  const { data } = useApi(() => api.forecast({ periods }), [periods])

  const combined = [
    ...(data?.history?.map(d => ({ month: d.month, actual: +(d.revenue/1e6).toFixed(2) })) ?? []),
    ...(data?.forecast?.map(d => ({
      month:     d.month,
      predicted: +(d.predicted/1e6).toFixed(2),
      lower:     +(d.lower/1e6).toFixed(2),
      upper:     +(d.upper/1e6).toFixed(2),
    })) ?? []),
  ]

  const splitMonth = data?.history?.at(-1)?.month
  const changepoints = data?.changepoints ?? []

  return (
    <div className="page">
      <PageHeader title="Demand Forecast" subtitle="Prophet (Meta) — yearly seasonality + changepoint detection">
        {[3,6,12].map(p => (
          <button key={p} onClick={() => setPeriods(p)}
            style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:500,
                     border:'1px solid', cursor:'pointer',
                     borderColor: periods===p ? '#1755F4' : '#E5E7EB',
                     background:  periods===p ? '#1755F4' : '#fff',
                     color:       periods===p ? '#fff'    : '#374151' }}>
            {p}M
          </button>
        ))}
      </PageHeader>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Revenue Forecast ($M) — Prophet model</span>
        </div>
        <div className="card-body" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combined} margin={{ top:8,right:16,left:0,bottom:0 }}>
              <defs>
                <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1755F4" stopOpacity={0.10}/>
                  <stop offset="100%" stopColor="#1755F4" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" vertical={false}/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:"#9CA3AF"}} tickLine={false} axisLine={false} interval={4}/>
              <YAxis tick={{fontSize:10,fill:"#9CA3AF"}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v}M`} width={44}/>
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v,n)=>{
                  const labels={actual:"Actual",predicted:"Prophet Forecast",upper:"Upper 95%",lower:"Lower 95%"}
                  return [`$${v}M`,labels[n]??n]
                }}/>
              {splitMonth && (
                <ReferenceLine x={splitMonth} stroke="#E5E7EB" strokeDasharray="4 3"
                  label={{value:"Forecast start",position:"top",fontSize:9,fill:"#9CA3AF"}}/>
              )}
              {changepoints.map(cp => (
                <ReferenceLine key={cp.month} x={cp.month} stroke={cp.delta>0?"#059669":"#DC2626"}
                  strokeDasharray="3 2" strokeWidth={1}
                  label={{value:cp.delta>0?"▲":"▼",position:"top",fontSize:9,
                          fill:cp.delta>0?"#059669":"#DC2626"}}/>
              ))}
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)"/>
              <Area type="monotone" dataKey="lower" stroke="none" fill="#fff"/>
              <Line type="monotone" dataKey="actual"    stroke="#111111" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="predicted" stroke="#1755F4" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
              <Legend iconType="plainline" wrapperStyle={{fontSize:11}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{padding:"0 20px 16px"}}>
          <InsightBox chart="Revenue Forecast" data={combined} context="Prophet model with yearly seasonality"/>
        </div>
      </div>

      <div className="grid-3 mt-4">
        <div className="card">
          <div className="card-header"><span className="card-title">Model</span></div>
          <div className="card-body" style={{fontSize:13,color:"#6B7280",lineHeight:1.7}}>
            {data?.model ?? "Prophet (Meta)"}. Automatically detects trend changepoints
            (marked ▲▼ on chart) and seasonal patterns.
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Changepoints detected</span></div>
          <div className="card-body" style={{fontSize:13,color:"#6B7280",lineHeight:1.7}}>
            {changepoints.length === 0 ? "No significant changepoints detected." :
              changepoints.map(cp=>(
                <div key={cp.month} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                  <span style={{fontFamily:"DM Mono",fontSize:12}}>{cp.month}</span>
                  <span style={{color:cp.delta>0?"#059669":"#DC2626",fontSize:12}}>
                    {cp.delta>0?"↑ growth":"↓ slowdown"}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Training window</span></div>
          <div className="card-body" style={{fontSize:13,color:"#6B7280",lineHeight:1.7}}>
            30 months (Jan 2022 – Jun 2024). Projecting {periods} months forward.
            95% credible intervals from Prophet posterior sampling.
          </div>
        </div>
      </div>
    </div>
  )
}
