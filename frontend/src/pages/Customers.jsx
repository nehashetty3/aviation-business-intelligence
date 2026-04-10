import { useState } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../utils/api.js'
import { fmtM, fmtN, tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import ExportBar   from '../components/ExportBar.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function heatColor(v, max) {
  const t = max > 0 ? v / max : 0
  const alpha = 0.08 + t * 0.72
  return `rgba(23,85,244,${alpha.toFixed(2)})`
}
function textCol(v, max) {
  return (max > 0 ? v / max : 0) > 0.5 ? '#fff' : '#1755F4'
}

export default function Customers() {
  const [region, setRegion] = useState('all')
  const [year,   setYear]   = useState('all')
  const { data: filters }  = useApi(() => api.filters(), [])
  const { data: customers } = useApi(() => api.customers({ year, region }), [year, region])
  const { data: matrix }   = useApi(() => api.matrix({ year }), [year])

  const top10 = customers?.slice(0, 10).map(c => ({
    name: c.customer.length > 22 ? c.customer.slice(0, 20) + '…' : c.customer,
    revenue: +(c.revenue / 1e6).toFixed(2),
  }))

  const maxVal = matrix
    ? Math.max(...matrix.regions.flatMap(r => matrix.categories.map(c => matrix.data[r]?.[c] ?? 0)))
    : 1

  return (
    <div className="page">
      <PageHeader title="Customer Analysis" subtitle="Revenue by customer and regional category breakdown">
        <select className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
          <option value="all">All years</option>
          {filters?.years?.map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={region} onChange={e => setRegion(e.target.value)}>
          <option value="all">All regions</option>
          {filters?.regions?.map(r => <option key={r}>{r}</option>)}
        </select>
        <ExportBar page="customers" filters={{ year, region }} />
      </PageHeader>

      <div className="grid-60-40">
        <div className="card">
          <div className="card-header"><span className="card-title">Top 10 Customers by Revenue</span></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}M`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#1755F4" radius={[0,4,4,0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Customer Summary</span></div>
          <div className="card-body">
            {customers?.slice(0, 6).map(c => (
              <div key={c.customer} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #F3F4F6' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{c.customer}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF' }}>{c.region} · {c.transactions} txns</div>
                </div>
                <div style={{ fontFamily:'DM Mono', fontSize:13, fontWeight:500 }}>{fmtM(c.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 20px 16px' }}>
          <InsightBox chart="Top customers by revenue" data={customers?.slice(0,10)} context={`Region: ${region}`} />
        </div>
      </div>

      {/* Region × Category Matrix */}
      {matrix && (
        <div className="card mt-4">
          <div className="card-header"><span className="card-title">Revenue Matrix — Region × Category</span></div>
          <div className="card-body" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th>Region</th>
                  {matrix.categories.map(c => <th key={c} className="right">{c}</th>)}
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.regions.map(r => {
                  const rowTotal = matrix.categories.reduce((s, c) => s + (matrix.data[r]?.[c] ?? 0), 0)
                  return (
                    <tr key={r}>
                      <td style={{ fontWeight:500 }}>{r}</td>
                      {matrix.categories.map(c => {
                        const v = matrix.data[r]?.[c] ?? 0
                        return (
                          <td key={c} style={{ textAlign:'right', padding:'6px 14px' }}>
                            <div style={{
                              display:'inline-block', padding:'4px 8px', borderRadius:4,
                              background: heatColor(v, maxVal), color: textCol(v, maxVal),
                              fontFamily:'DM Mono', fontSize:12, minWidth:70, textAlign:'right',
                            }}>
                              {fmtM(v)}
                            </div>
                          </td>
                        )
                      })}
                      <td className="num" style={{ fontWeight:600, fontFamily:'DM Mono', fontSize:12 }}>{fmtM(rowTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
