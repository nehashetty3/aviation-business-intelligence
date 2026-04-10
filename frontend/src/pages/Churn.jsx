import { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import { fmtM, tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import ExportBar   from '../components/ExportBar.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const RISK_COLOR = { High:'#DC2626', Medium:'#D97706', Low:'#059669' }

export default function Churn() {
  const [risk, setRisk] = useState('all')
  const [detail, setDetail] = useState(null)
  const { data } = useApi(() => api.churn(), [])

  const filtered = useMemo(() => {
    if (!data) return []
    return risk === 'all' ? data.customers : data.customers.filter(c => c.risk === risk)
  }, [data, risk])

  const distData = useMemo(() => {
    if (!data) return []
    const bins = Array.from({length:10},(_,i)=>({range:`${i*10}–${i*10+10}%`,count:0}))
    data.customers.forEach(c => { const i=Math.min(9,Math.floor(c.churn_prob*10)); bins[i].count++ })
    return bins
  }, [data])

  const loadShap = async (customer) => {
    if (detail?.customer === customer) { setDetail(null); return }
    try { setDetail(await api.churnShap(customer)) } catch {}
  }

  return (
    <div className="page">
      <PageHeader title="Churn Prediction" subtitle="XGBoost classifier · SHAP TreeExplainer — identifies at-risk accounts">
        <select className="filter-select" value={risk} onChange={e=>setRisk(e.target.value)}>
          <option value="all">All risk levels</option>
          <option value="High">High risk</option>
          <option value="Medium">Medium risk</option>
          <option value="Low">Low risk</option>
        </select>
        <ExportBar page="rfm"/>
      </PageHeader>

      {data && (
        <div className="grid-3" style={{marginBottom:16}}>
          {[["High","#DC2626","≥ 65%"],['Medium',"#D97706","35–65%"],['Low',"#059669","< 35%"]].map(([r,col,range])=>(
            <div key={r} className="kpi-card" style={{borderLeft:`3px solid ${col}`}}>
              <div className="kpi-label">{r} Risk</div>
              <div className="kpi-value">{r==='High'?data.high_risk_count:r==='Medium'?data.medium_risk_count:data.customers.length-data.high_risk_count-data.medium_risk_count}</div>
              <div style={{fontSize:12,color:'#6B7280',marginTop:6}}>Churn prob {range}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{background:'#F0F4FF',border:'1px solid #C7D7FD',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:12,color:'#374151'}}>
        <strong style={{color:'#1755F4'}}>Model:</strong> {data?.model}. Click any customer row to see their SHAP waterfall breakdown.
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Churn Probability Distribution</span></div>
          <div className="card-body" style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{top:4,right:8,left:0,bottom:0}}>
                <CartesianGrid stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="range" tick={{fontSize:9,fill:'#9CA3AF'}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} tickLine={false} axisLine={false} width={28}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Bar dataKey="count" radius={[3,3,0,0]}>
                  {distData.map((_,i)=><Cell key={i} fill={(i*10+5)>=65?'#DC2626':(i*10+5)>=35?'#D97706':'#059669'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">SHAP Feature Importance</span></div>
          <div className="card-body" style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.feature_importance} layout="vertical" margin={{left:0,right:60}}>
                <XAxis type="number" tick={{fontSize:10,fill:'#9CA3AF'}} tickLine={false} axisLine={false} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
                <YAxis type="category" dataKey="feature" tick={{fontSize:12,fill:'#374151'}} tickLine={false} axisLine={false} width={80}/>
                <Tooltip contentStyle={tooltipStyle} formatter={v=>[`${(v*100).toFixed(1)}%`,'Importance']}/>
                <Bar dataKey="importance" fill="#1755F4" radius={[0,4,4,0]} barSize={24}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {data && (
        <div style={{ padding: '0 0 12px' }}>
          <InsightBox chart="Churn risk analysis" data={data?.customers?.slice(0,10).map(c=>({customer:c.customer,churn_prob:c.churn_prob,risk:c.risk}))} context="XGBoost churn prediction model" />
        </div>
      )}

      {detail && (
        <div className="card mt-4">
          <div className="card-header"><span className="card-title">SHAP Waterfall — {detail.customer}</span></div>
          <div className="card-body">
            <div style={{fontSize:12,color:'#6B7280',marginBottom:10}}>
              Base value (avg model output): <strong>{(detail.base_value*100).toFixed(1)}%</strong>
            </div>
            {Object.entries(detail.shap).map(([feat,val])=>(
              <div key={feat} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{width:90,fontSize:12,fontWeight:500}}>{feat}</div>
                <div style={{flex:1,height:20,background:'#F3F4F6',borderRadius:3,overflow:'hidden',position:'relative'}}>
                  <div style={{
                    position:'absolute',height:'100%',
                    left: val>=0?'50%':`${50+val*100}%`,
                    width:`${Math.abs(val)*100}%`,
                    background:val>=0?'#DC2626':'#059669',
                    borderRadius:2,
                  }}/>
                  <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'#9CA3AF'}}/>
                </div>
                <div style={{width:60,fontSize:12,fontFamily:'DM Mono',textAlign:'right',
                             color:val>=0?'#DC2626':'#059669'}}>
                  {val>=0?'+':''}{(val*100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-4">
        <div className="card-header"><span className="card-title">Customer Risk Rankings</span></div>
        <div className="card-body" style={{paddingTop:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Customer</th><th>Region</th>
                <th className="right">Recency (d)</th><th className="right">Freq</th>
                <th className="right">Monetary</th><th className="right">Churn Prob</th>
                <th>Risk</th>
              </tr></thead>
              <tbody>
                {filtered.map(c=>(
                  <tr key={c.customer} onClick={()=>loadShap(c.customer)}
                    style={{cursor:'pointer'}} title="Click for SHAP breakdown">
                    <td style={{fontWeight:500}}>{c.customer}</td>
                    <td style={{color:'#6B7280'}}>{c.region}</td>
                    <td className="num">{c.recency}</td>
                    <td className="num">{c.frequency}</td>
                    <td className="num">{fmtM(c.monetary)}</td>
                    <td className="num">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                        <div style={{width:48,height:4,borderRadius:2,background:'#F3F4F6',overflow:'hidden'}}>
                          <div style={{width:`${c.churn_prob*100}%`,height:'100%',background:RISK_COLOR[c.risk]}}/>
                        </div>
                        <span style={{fontFamily:'DM Mono',fontSize:12}}>{(c.churn_prob*100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td><span className={`badge badge-${c.risk.toLowerCase()}`}>{c.risk}</span></td>
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
