import { useState } from 'react'
import { useApi }   from '../hooks/useApi.js'
import { api }      from '../utils/api.js'
import { fmtM, tooltipStyle, CHART_COLORS } from '../utils/format.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar  from '../components/ExportBar.jsx'
import InsightBox from '../components/InsightBox.jsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

export default function Demand() {
  const [category, setCategory] = useState('all')
  const [region,   setRegion]   = useState('all')

  const { data: filters } = useApi(() => api.filters(), [])
  const { data: trend }   = useApi(() => api.trend({ category, region }), [category, region])
  const { data: byCat }   = useApi(() => api.revByCategory({ region }), [region])

  const yoyData = (() => {
    if (!trend) return []
    const byMonth = {}
    trend.forEach(d => {
      const [yr, mo] = d.month.split('-')
      if (!byMonth[mo]) byMonth[mo] = { month: mo }
      byMonth[mo][yr] = +(d.revenue / 1e6).toFixed(2)
    })
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
  })()

  const trendFmt = trend?.map(d => ({
    ...d,
    month: d.month.slice(0, 7),
    revenueM: +(d.revenue / 1e6).toFixed(2),
  }))

  const years = filters?.years?.map(String) ?? []

  return (
    <div className="page">
      <PageHeader title="Demand Trends" subtitle="Monthly patterns, seasonality, and year-over-year comparison">
        <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {filters?.categories?.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={region} onChange={e => setRegion(e.target.value)}>
          <option value="all">All regions</option>
          {filters?.regions?.map(r => <option key={r}>{r}</option>)}
        </select>
        <ExportBar page="kpis" />
      </PageHeader>

      <div className="card">
        <div className="card-header"><span className="card-title">Monthly Revenue ($M)</span></div>
        <div className="card-body" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendFmt} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="demGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#1755F4" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1755F4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}M`, 'Revenue']} />
              <Area type="monotone" dataKey="revenueM" stroke="#1755F4" strokeWidth={1.8} fill="url(#demGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ padding: '0 20px 16px' }}>
          <InsightBox chart="Monthly revenue demand" data={trendFmt?.slice(-12)} context={`Category: ${category}, Region: ${region}`} />
        </div>
      </div>

      <div className="grid-2 mt-4">
        <div className="card">
          <div className="card-header"><span className="card-title">Year-over-Year by Month</span></div>
          <div className="card-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}M`]} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                {years.map((y, i) => (
                  <Bar key={y} dataKey={y} fill={CHART_COLORS[i]} radius={[2, 2, 0, 0]} barSize={12} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Revenue by Category</span></div>
          <div className="card-body" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1e6).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtM(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18}>
                  {byCat?.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
