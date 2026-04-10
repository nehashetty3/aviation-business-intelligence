import { useState } from 'react'
import { api } from '../utils/api.js'
import PageHeader from '../components/PageHeader.jsx'
import { Send, Database, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const EXAMPLES = [
  "Top 5 customers by revenue in the Middle East",
  "Monthly revenue trend for Engine category in 2023",
  "Which products are Class A?",
  "Average unit price per region",
  "Total units sold per quarter",
  "Customers with more than 300 transactions",
]

const CHART_COLORS = ['#1755F4','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6']

function AutoChart({ columns, rows }) {
  const [type, setType] = useState('bar')
  if (!columns || rows.length === 0) return null

  // Detect if chartable: need exactly 1 text col + 1+ numeric cols
  const numericCols = columns.filter((_, i) => rows.every(r => !isNaN(parseFloat(r[i]))))
  const labelCol    = columns.find((_, i) => rows.some(r => isNaN(parseFloat(r[i]))))
  if (!labelCol || numericCols.length === 0) return null

  const labelIdx  = columns.indexOf(labelCol)
  const valueIdx  = columns.indexOf(numericCols[0])
  const chartData = rows.slice(0, 20).map(r => ({
    name:  String(r[labelIdx]).length > 20 ? String(r[labelIdx]).slice(0,18)+'…' : String(r[labelIdx]),
    value: parseFloat(r[valueIdx]) || 0,
  }))

  const isCurrency = numericCols[0].toLowerCase().includes('revenue') ||
                     numericCols[0].toLowerCase().includes('price')
  const fmtVal = v => isCurrency
    ? v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`
    : v.toLocaleString()

  return (
    <div className="card mt-4">
      <div className="card-header">
        <span className="card-title">{numericCols[0]} by {labelCol}</span>
        <div style={{ display:'flex', gap:6 }}>
          {['bar','line'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding:'4px 10px', borderRadius:4, fontSize:11, cursor:'pointer',
                       border:'1px solid', fontWeight:500,
                       borderColor: type===t ? '#1755F4' : '#E5E7EB',
                       background:  type===t ? '#1755F4' : '#fff',
                       color:       type===t ? '#fff'    : '#374151' }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={chartData} margin={{ top:4, right:8, left:0, bottom:40 }}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false}
                axisLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}
                tickFormatter={fmtVal} width={52} />
              <Tooltip formatter={v => [fmtVal(v), numericCols[0]]}
                contentStyle={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }} />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {chartData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top:4, right:8, left:0, bottom:40 }}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false}
                axisLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}
                tickFormatter={fmtVal} width={52} />
              <Tooltip formatter={v => [fmtVal(v), numericCols[0]]}
                contentStyle={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }} />
              <Line type="monotone" dataKey="value" stroke="#1755F4" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function NLQuery() {
  const [question, setQuestion] = useState('')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [history,  setHistory]  = useState([])

  const submit = async (q) => {
    const text = q || question
    if (!text.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await api.nlsql(text)
      setResult(res)
      if (!res.error) setHistory(h => [{ q: text, sql: res.sql, rows: res.rows.length }, ...h.slice(0,4)])
      if (res.error)  setError(res.error)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page">
      <PageHeader
        title="Ask the Data"
        subtitle="Natural language \u2192 SQL \u2192 results + auto-chart, powered by Claude + DuckDB"
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Ask a question about the data in plain English\u2026"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: '1px solid #E5E7EB',
                       fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
            />
            <button onClick={() => submit()} disabled={loading}
              style={{ padding: '10px 18px', borderRadius: 6, border: 'none',
                       background: '#1755F4', color: '#fff', fontSize: 13,
                       cursor: loading ? 'not-allowed' : 'pointer',
                       display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              <Send size={14} /> {loading ? 'Running\u2026' : 'Run'}
            </button>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setQuestion(ex); submit(ex) }}
                style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #E5E7EB',
                         background: '#F9FAFB', fontSize: 11, cursor: 'pointer', color: '#6B7280' }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result?.sql && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={13} /> Generated SQL
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <pre style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, background: '#F8F9FA',
                          padding: '12px 16px', borderRadius: 6, margin: 0, overflowX: 'auto',
                          border: '1px solid #E5E7EB', color: '#1755F4', lineHeight: 1.6 }}>
              {result.sql}
            </pre>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                      padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
          {error.includes('ANTHROPIC_API_KEY') ? (
            <span>Set <code style={{ fontFamily: 'DM Mono' }}>ANTHROPIC_API_KEY</code> in your <code style={{ fontFamily: 'DM Mono' }}>.env</code> file to enable AI-powered queries.</span>
          ) : error}
        </div>
      )}

      {result && !result.error && result.rows.length > 0 && (
        <>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Results \u2014 {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                <BarChart2 size={12} /> auto-chart below if chartable
              </span>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className={typeof cell === 'number' ? 'num' : ''}>
                            {typeof cell === 'number'
                              ? cell > 10000 ? `$${(cell/1e6).toFixed(2)}M` : cell.toLocaleString()
                              : String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AutoChart columns={result.columns} rows={result.rows} />
        </>
      )}

      {history.length > 0 && (
        <div className="card mt-4">
          <div className="card-header"><span className="card-title">Recent queries</span></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {history.map((h, i) => (
              <div key={i} onClick={() => { setQuestion(h.q); submit(h.q) }}
                style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                         display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{h.q}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'DM Mono' }}>{h.rows} rows</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
