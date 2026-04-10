import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import { fmtM }   from '../utils/format.js'
import PageHeader from '../components/PageHeader.jsx'
import { Star, TrendingUp } from 'lucide-react'

const REGION_COLORS = {
  'Middle East': '#1755F4',
  'Asia':        '#06B6D4',
  'Europe':      '#10B981',
  'Americas':    '#F59E0B',
}

export default function Recommend() {
  const [customer, setCustomer] = useState('')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)

  const { data: overview } = useApi(() => api.recommend({}), [])

  const lookup = async (c) => {
    if (!c) return
    setLoading(true)
    try { setResult(await api.recommend({ customer: c })) }
    catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <PageHeader
        title="Product Recommendations"
        subtitle="ALS collaborative filtering — trained on customer × product purchase matrix"
      />

      <div style={{ background:'#F0F4FF', border:'1px solid #C7D7FD', borderRadius:8,
                    padding:'10px 16px', marginBottom:16, fontSize:12, color:'#374151' }}>
        <strong style={{ color:'#1755F4' }}>Model:</strong> Alternating Least Squares (implicit library).
        Learns latent customer and product embeddings from revenue-weighted purchase interactions.
        Recommends products the customer hasn't bought that similar customers purchase heavily.
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><span className="card-title">Customer lookup</span></div>
        <div className="card-body">
          <div style={{ display:'flex', gap:8 }}>
            <select className="filter-select" style={{ flex:1, padding:'9px 14px' }}
              value={customer} onChange={e => { setCustomer(e.target.value); lookup(e.target.value) }}>
              <option value="">Select a customer…</option>
              {overview?.customers?.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="empty">Generating recommendations…</div>}

      {result && (
        <div className="grid-2" style={{ marginBottom:16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Star size={13} style={{ color:'#1755F4' }} /> Recommended for {result.customer}
              </span>
            </div>
            <div className="card-body" style={{ paddingTop:0 }}>
              {result.recommendations.map((r, i) => (
                <div key={r.product} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                              padding:'10px 0', borderBottom:'1px solid #F3F4F6' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#1755F4',
                                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:11, fontWeight:600, flexShrink:0 }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:500 }}>{r.product}</span>
                  </div>
                  <div style={{ fontFamily:'DM Mono', fontSize:12, color:'#6B7280' }}>
                    score {r.score.toFixed(3)}
                  </div>
                </div>
              ))}
              {result.recommendations.length === 0 && (
                <div style={{ fontSize:13, color:'#9CA3AF', padding:'8px 0' }}>
                  No new recommendations — this customer has purchased most products.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <TrendingUp size={13} /> Already purchased
              </span>
            </div>
            <div className="card-body" style={{ paddingTop:0 }}>
              {result.already_purchased.map(p => (
                <div key={p.product} style={{ display:'flex', justifyContent:'space-between',
                                              padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
                  <span style={{ fontSize:13 }}>{p.product}</span>
                  <span style={{ fontFamily:'DM Mono', fontSize:12 }}>{fmtM(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Top products by region</span></div>
        <div className="card-body" style={{ paddingTop:0 }}>
          <div className="grid-2">
            {overview?.popular_by_region && Object.entries(overview.popular_by_region).map(([region, prods]) => (
              <div key={region}>
                <div style={{ fontWeight:600, fontSize:12, color:REGION_COLORS[region] ?? '#374151',
                              padding:'10px 0 6px', borderBottom:'1px solid #E5E7EB' }}>
                  {region}
                </div>
                {prods.map((p,i) => (
                  <div key={p.product} style={{ display:'flex', justifyContent:'space-between',
                                               padding:'6px 0', borderBottom:'1px solid #F3F4F6' }}>
                    <span style={{ fontSize:12 }}>{i+1}. {p.product}</span>
                    <span style={{ fontFamily:'DM Mono', fontSize:11, color:'#6B7280' }}>{fmtM(p.revenue)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
