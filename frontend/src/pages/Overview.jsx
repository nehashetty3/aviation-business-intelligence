import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { api }   from '../utils/api.js'
import { fmtM, fmtN, fmtAvg, tooltipStyle, CHART_COLORS } from '../utils/format.js'
import PageHeader from '../components/PageHeader.jsx'
import KPICard    from '../components/KPICard.jsx'
import ExportBar   from '../components/ExportBar.jsx'
import InsightBox  from '../components/InsightBox.jsx'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function Overview() {
  const [year, setYear] = useState('all')
  const { data: filters } = useApi(() => api.filters(), [])
  const { data: kpis }    = useApi(() => api.kpis({ year }), [year])
  const { data: byCat }   = useApi(() => api.revByCategory({ year }), [year])
  const { data: byReg }   = useApi(() => api.revByRegion({ year }), [year])
  const { data: trend }   = useApi(() => api.trend(), [])

  const trendFormatted = trend?.map(d => ({
    ...d,
    month: d.month.slice(0, 7),
    revenueM: +(d.revenue / 1e6).toFixed(2),
  }))

  return (
    <div className="page">
      <PageHeader
        title="Executive Overview"
        subtitle="Revenue, demand, and regional performance at a glance"
      >
        <select className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
          <option value="all">All years</option>
          {filters?.years?.map(y => <option key={y}>{y}</option>)}
        </select>
        <ExportBar page="kpis" filters={{ year }} />
      </PageHeader>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard label="Total Revenue"       value={kpis ? fmtM(kpis.total_revenue) : '—'}       delta={kpis?.yoy_growth} />
        <KPICard label="Total Transactions"  value={kpis ? fmtN(kpis.total_transactions) : '—'}  />
        <KPICard label="Units Sold"          value={kpis ? fmtN(kpis.total_units) : '—'}          />
        <KPICard label="Avg Order Value"     value={kpis ? fmtAvg(kpis.avg_order_value) : '—'}    />
        <KPICard label="Unique Customers"    value={kpis?.unique_customers ?? '—'}                />
      </div>

      {/* Trend */}
      <div className="card mt-4">
        <div className="card-header">
          <span className="card-title">Monthly Revenue Trend</span>
        </div>
        <div className="card-body" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendFormatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#1755F4" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1755F4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} width={48} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}M`, 'Revenue']} />
              <Area type="monotone" dataKey="revenueM" stroke="#1755F4" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ padding: '0 20px 16px' }}>
          <InsightBox chart="Monthly revenue trend" data={trendFormatted?.slice(-12)} context={`Year: ${year}`} />
        </div>
      </div>

      <div className="grid-60-40 mt-4">
        {/* Revenue by Region */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue by Region</span></div>
          <div className="card-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byReg} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1e6).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtM(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#1755F4" radius={[0,4,4,0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <InsightBox chart="Revenue by region" data={byReg} context="Regional revenue breakdown" />
          </div>
        </div>

        {/* Revenue by Category donut */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue by Category</span></div>
          <div className="card-body" style={{ height: 220, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCat} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="revenue" nameKey="name" paddingAngle={2}>
                  {byCat?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtM(v), 'Revenue']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
