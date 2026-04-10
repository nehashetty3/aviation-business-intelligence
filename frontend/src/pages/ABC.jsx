import { useState } from 'react'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../utils/api.js'
import { fmtM, fmtPctRaw, tooltipStyle } from '../utils/format.js'
import PageHeader  from '../components/PageHeader.jsx'
import ExportBar  from '../components/ExportBar.jsx'
import InsightBox from '../components/InsightBox.jsx'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'

const ABC_COLORS = { A: '#059669', B: '#D97706', C: '#9CA3AF' }

export default function ABC() {
  const [year, setYear] = useState('all')
  const { data: filters } = useApi(() => api.filters(), [])
  const { data: abc }     = useApi(() => api.abc({ year }), [year])

  const paretoData = abc?.products?.map(p => ({
    name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
    revenue: +(p.revenue / 1e6).toFixed(2),
    cumulative: p.cumulative_pct,
    abc: p.abc,
  }))

  const pieData = abc?.summary
    ? Object.entries(abc.summary).map(([cls, s]) => ({ name: `Class ${cls}`, value: s.revenue, count: s.count }))
    : []

  return (
    <div className="page">
      <PageHeader title="ABC Classification" subtitle="Pareto-based inventory segmentation across all products">
        <select className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
          <option value="all">All years</option>
          {filters?.years?.map(y => <option key={y}>{y}</option>)}
        </select>
        <ExportBar page="abc" />
      </PageHeader>

      {/* Summary cards */}
      {abc?.summary && (
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {Object.entries(abc.summary).map(([cls, s]) => (
            <div key={cls} className="kpi-card" style={{ borderLeft: `3px solid ${ABC_COLORS[cls]}` }}>
              <div className="kpi-label">Class {cls}</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{fmtM(s.revenue)}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                {s.count} products · {s.revenue_pct}% of revenue
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-60-40">
        {/* Pareto chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Pareto Curve</span></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 4, right: 40, left: 0, bottom: 60 }}>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} width={44} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => n === 'cumulative' ? [`${v}%`, 'Cumulative'] : [`$${v}M`, 'Revenue']} />
                <Bar yAxisId="left" dataKey="revenue" radius={[3,3,0,0]} barSize={18}>
                  {paretoData?.map((d, i) => <Cell key={i} fill={ABC_COLORS[d.abc]} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#1755F4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <InsightBox chart="ABC Pareto analysis" data={abc?.products?.slice(0,10)} context="ABC classification cumulative revenue" />
          </div>
        </div>

        {/* Pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue Share by Class</span></div>
          <div className="card-body" style={{ height: 280, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={Object.values(ABC_COLORS)[i]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtM(v), 'Revenue']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product table */}
      <div className="card mt-4">
        <div className="card-header"><span className="card-title">Full Classification</span></div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th className="right">Revenue</th>
                  <th className="right">Cumulative %</th>
                  <th>Class</th>
                </tr>
              </thead>
              <tbody>
                {abc?.products?.map((p, i) => (
                  <tr key={p.name}>
                    <td style={{ color:'#9CA3AF', fontFamily:'DM Mono', fontSize:12 }}>{String(i+1).padStart(2,'0')}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="num">{fmtM(p.revenue)}</td>
                    <td className="num">{fmtPctRaw(p.cumulative_pct)}%</td>
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
