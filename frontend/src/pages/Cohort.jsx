import { useApi } from '../hooks/useApi.js'
import { api }    from '../utils/api.js'
import PageHeader from '../components/PageHeader.jsx'
import InsightBox from '../components/InsightBox.jsx'

function pct2color(v) {
  if (v === undefined || v === null) return '#F9FAFB'
  if (v >= 80) return '#1755F4'
  if (v >= 60) return '#3B82F6'
  if (v >= 40) return '#93C5FD'
  if (v >= 20) return '#DBEAFE'
  return '#EFF6FF'
}
function textColor(v) {
  return v >= 60 ? '#fff' : '#1e40af'
}

export default function Cohort() {
  const { data, loading } = useApi(() => api.cohort(), [])

  const cohorts = data?.cohorts?.slice(-16) ?? []
  const maxAge  = Math.min(data?.max_age ?? 0, 12)

  return (
    <div className="page">
      <PageHeader
        title="Cohort Retention"
        subtitle="Monthly customer retention by acquisition cohort"
      />

      {loading && <div className="empty">Loading cohort data…</div>}

      {data && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Retention Heatmap (%)</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#6B7280' }}>
              <span>Low</span>
              {['#EFF6FF','#DBEAFE','#93C5FD','#3B82F6','#1755F4'].map(c => (
                <div key={c} style={{ width:16, height:12, background:c, borderRadius:2 }} />
              ))}
              <span>High</span>
            </div>
          </div>
          <div className="card-body" style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'separate', borderSpacing:3, width:'auto' }}>
              <thead>
                <tr>
                  <th style={{ fontSize:10, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', paddingBottom:8, minWidth:90 }}>Cohort</th>
                  <th style={{ fontSize:10, color:'#9CA3AF', fontWeight:600, paddingBottom:8, minWidth:60, textAlign:'center' }}>Size</th>
                  {Array.from({ length: maxAge + 1 }, (_, i) => (
                    <th key={i} style={{ fontSize:10, color:'#9CA3AF', fontWeight:600, paddingBottom:8, minWidth:48, textAlign:'center' }}>
                      M+{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(c => (
                  <tr key={c}>
                    <td style={{ fontSize:11, fontFamily:'DM Mono', color:'#374151', paddingRight:12, whiteSpace:'nowrap' }}>{c}</td>
                    <td style={{ fontSize:11, fontFamily:'DM Mono', color:'#9CA3AF', textAlign:'center' }}>
                      —
                    </td>
                    {Array.from({ length: maxAge + 1 }, (_, age) => {
                      const v = data.matrix[c]?.[age]
                      return (
                        <td key={age} style={{ padding:0 }}>
                          <div style={{
                            width:44, height:28, borderRadius:4,
                            background: pct2color(v),
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontFamily:'DM Mono',
                            color: v != null ? textColor(v) : '#D1D5DB',
                          }}>
                            {v != null ? `${v}%` : '·'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid-2 mt-4">
        <div className="card">
          <div className="card-header"><span className="card-title">How to read this</span></div>
          <div className="card-body" style={{ fontSize:13, color:'#6B7280', lineHeight:1.7 }}>
            <p>Each row is a group of customers who made their first purchase in that month (the cohort). Each column shows what % of those customers were still active N months later.</p>
            <p style={{ marginTop:10 }}>M+0 is always 100% (the month they joined). Deeper blue = higher retention.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Key observations</span></div>
          <div className="card-body" style={{ fontSize:13, color:'#6B7280', lineHeight:1.7 }}>
            <p>Aviation MRO customers typically show high 3-month retention (maintenance contracts) with a drop-off at M+6 when contracts are renegotiated.</p>
            <p style={{ marginTop:10 }}>Cohorts from Q4 show slightly higher long-term retention — consistent with annual budget cycles.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
