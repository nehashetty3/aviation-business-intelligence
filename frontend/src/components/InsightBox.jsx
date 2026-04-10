import { useState } from 'react'
import { api } from '../utils/api.js'
import { Sparkles } from 'lucide-react'

export default function InsightBox({ chart, data, context = '' }) {
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [shown,   setShown]   = useState(false)

  const load = async () => {
    if (shown) { setShown(false); return }
    setLoading(true)
    try {
      const res = await api.insight(chart, data?.slice?.(0,20) ?? data, context)
      setText(res.insight || 'No insight available.')
    } catch { setText('Insight unavailable — set ANTHROPIC_API_KEY to enable.') }
    finally { setLoading(false); setShown(true) }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={load}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
                 borderRadius:5, border:'1px solid #E5E7EB', background:'#fff',
                 fontSize:11, cursor:'pointer', color:'#6B7280' }}>
        <Sparkles size={12} />
        {loading ? 'Generating…' : shown ? 'Hide insight' : 'AI insight'}
      </button>
      {shown && text && (
        <div style={{ marginTop:8, padding:'10px 14px', background:'#F0F4FF',
                      borderLeft:'3px solid #1755F4', borderRadius:4,
                      fontSize:12, color:'#374151', lineHeight:1.65 }}>
          {text}
        </div>
      )}
    </div>
  )
}
