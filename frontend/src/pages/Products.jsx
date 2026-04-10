import { useState, useMemo } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../utils/api.js'
import { fmtM, fmtN, tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import ExportBar   from '../components/ExportBar.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Products() {
  const [year, setYear]   = useState('all')
  const [by,   setBy]     = useState('revenue')
  const [sort, setSort]   = useState({ col: 'revenue', dir: 'desc' })

  const { data: filters } = useApi(() => api.filters(), [])
  const { data: top }     = useApi(() => api.productsTop({ year, by, n: 10 }), [year, by])
  const { data: all }     = useApi(() => api.productsAll({ year }), [year])

  const sorted = useMemo(() => {
    if (!all) return []
    return [...all].sort((a, b) =>
      sort.dir === 'desc' ? b[sort.col] - a[sort.col] : a[sort.col] - b[sort.col]
    )
  }, [all, sort])

  const toggle = col => setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))
  const arrow  = col => sort.col === col ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''

  const chartKey  = by === 'revenue' ? 'Revenue' : 'Units'
  const chartData = top?.map(p => ({ name: p.name.replace(' ', '\n'), value: by === 'revenue' ? +(p.Revenue/1e6).toFixed(2) : p.units }))

  return (
    <div className="page">
      <PageHeader title="Product Performance" subtitle="Revenue and unit analysis across all 20 SKUs">
        <select className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
          <option value="all">All years</option>
          {filters?.years?.map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={by} onChange={e => setBy(e.target.value)}>
          <option value="revenue">By Revenue</option>
          <option value="units">By Units</option>
        </select>
        <ExportBar page="products" filters={{ year }} />
      </PageHeader>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top 10 Products — {by === 'revenue' ? 'Revenue ($M)' : 'Units Sold'}</span>
        </div>
        <div className="card-body" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => by === 'revenue' ? `$${v}M` : v} width={44} />
              <Tooltip contentStyle={{ backgroundColor:'#fff', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }}
                formatter={v => [by === 'revenue' ? `$${v}M` : v, chartKey]} />
              <Bar dataKey="value" fill="#1755F4" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ padding: '0 20px 16px' }}>
          <InsightBox chart="Top 10 products by revenue" data={top} context={`Metric: ${by}, Year: ${year}`} />
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><span className="card-title">All Products</span></div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggle('revenue')}>Revenue{arrow('revenue')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggle('units')}>Units{arrow('units')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggle('avg_price')}>Avg Price{arrow('avg_price')}</th>
                  <th>ABC</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ color: '#6B7280' }}>{p.category}</td>
                    <td className="num">{fmtM(p.revenue)}</td>
                    <td className="num">{fmtN(p.units)}</td>
                    <td className="num">${fmtN(p.avg_price)}</td>
                    <td><span className={`badge badge-${p.abc}`}>{p.abc}</span></td>
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
