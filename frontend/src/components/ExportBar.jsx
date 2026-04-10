import { Download } from 'lucide-react'
import { api } from '../utils/api.js'

export default function ExportBar({ page, filters = {} }) {
  const dl = (format) => {
    window.open(api.export(page, format, filters), '_blank')
  }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={() => dl('xlsx')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                 borderRadius:6, border:'1px solid #E5E7EB', background:'#fff',
                 fontSize:12, cursor:'pointer', color:'#374151' }}>
        <Download size={13} /> Excel
      </button>
      <button onClick={() => dl('pdf')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                 borderRadius:6, border:'1px solid #E5E7EB', background:'#fff',
                 fontSize:12, cursor:'pointer', color:'#374151' }}>
        <Download size={13} /> PDF
      </button>
    </div>
  )
}
