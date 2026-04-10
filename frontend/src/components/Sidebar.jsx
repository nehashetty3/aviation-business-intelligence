import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, TrendingUp, BarChart2,
  Users, Grid2x2, Activity, Building2, AlertTriangle,
  Zap, MessageSquare, DollarSign, Star, Menu, X,
} from 'lucide-react'

const ANALYTICS = [
  { to: '/',           icon: LayoutDashboard, label: 'Overview' },
  { to: '/products',   icon: Package,         label: 'Products' },
  { to: '/demand',     icon: TrendingUp,      label: 'Demand' },
  { to: '/customers',  icon: Building2,       label: 'Customers' },
  { to: '/elasticity', icon: DollarSign,      label: 'Price Elasticity' },
]
const MODELS = [
  { to: '/abc',       icon: BarChart2,     label: 'ABC Analysis' },
  { to: '/rfm',       icon: Users,         label: 'RFM Segments' },
  { to: '/cohort',    icon: Grid2x2,       label: 'Cohort' },
  { to: '/forecast',  icon: Activity,      label: 'Forecast' },
  { to: '/churn',     icon: AlertTriangle, label: 'Churn (XGB+SHAP)' },
  { to: '/anomaly',   icon: Zap,           label: 'Anomaly' },
  { to: '/recommend', icon: Star,          label: 'Recommendations' },
]
const AI = [
  { to: '/nlquery', icon: MessageSquare, label: 'Ask the Data' },
]

function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <Icon size={15} strokeWidth={1.8} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const logo = (
    <div className="sidebar-logo">
      <div className="sidebar-logo-mark">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="white" fillOpacity="0.9"/>
        </svg>
      </div>
      <span className="sidebar-logo-text">AVBI</span>
    </div>
  )

  const nav = (
    <nav className="sidebar-nav">
      <div className="sidebar-section-label">Analytics</div>
      {ANALYTICS.map(item => <NavItem key={item.to} {...item} onClick={close} />)}
      <div className="sidebar-section-label">ML Models</div>
      {MODELS.map(item => <NavItem key={item.to} {...item} onClick={close} />)}
      <div className="sidebar-section-label">AI</div>
      {AI.map(item => <NavItem key={item.to} {...item} onClick={close} />)}
    </nav>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="top-bar">
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Open menu">
          <Menu size={22} color="#fff" style={{ color: '#111' }} />
        </button>
        <span className="top-bar-title">AVBI</span>
      </div>

      {/* Overlay for mobile */}
      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={close} />

      {/* Sidebar */}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {logo}
          <button className="hamburger" onClick={close}
            style={{ marginRight: 12, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        {nav}
        <div className="sidebar-footer">v3.0 · Aviation BI</div>
      </aside>
    </>
  )
}
