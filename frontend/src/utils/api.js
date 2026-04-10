const BASE = import.meta.env.VITE_API_URL || '/api'

async function get(path, params = {}) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all'))
  ).toString()
  const res = await fetch(`${BASE}${path}${q ? '?' + q : ''}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  filters:       ()       => get('/filters'),
  kpis:          (p)      => get('/kpis', p),
  revByCategory: (p)      => get('/revenue/by-category', p),
  revByRegion:   (p)      => get('/revenue/by-region', p),
  trend:         (p)      => get('/trend/monthly', p),
  productsTop:   (p)      => get('/products/top', p),
  productsAll:   (p)      => get('/products/all', p),
  abc:           (p)      => get('/abc', p),
  rfm:           ()       => get('/rfm'),
  cohort:        ()       => get('/cohort'),
  matrix:        (p)      => get('/matrix/region-category', p),
  customers:     (p)      => get('/customers', p),
  forecast:      (p)      => get('/forecast', p),
  churn:         ()       => get('/churn'),
  churnShap:     (c)      => get(`/churn/shap/${encodeURIComponent(c)}`),
  anomaly:       ()       => get('/anomaly'),
  recommend:     (p)      => get('/recommend', p),
  elasticity:    ()       => get('/elasticity'),
  schema:        ()       => get('/schema'),
  nlsql:         (q)      => post('/nlsql', { question: q }),
  insight:       (chart, data, context='') => post('/insight', { chart, data, context }),
  export:        (page, format, params={}) => `${BASE}/export/${page}?format=${format}&${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v&&v!=='all')))}`,
}
