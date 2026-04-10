import { Routes, Route } from 'react-router-dom'
import Sidebar     from './components/Sidebar.jsx'
import Overview    from './pages/Overview.jsx'
import Products    from './pages/Products.jsx'
import Demand      from './pages/Demand.jsx'
import ABC         from './pages/ABC.jsx'
import RFM         from './pages/RFM.jsx'
import Cohort      from './pages/Cohort.jsx'
import Forecast    from './pages/Forecast.jsx'
import Customers   from './pages/Customers.jsx'
import Churn       from './pages/Churn.jsx'
import Anomaly     from './pages/Anomaly.jsx'
import NLQuery     from './pages/NLQuery.jsx'
import Elasticity  from './pages/Elasticity.jsx'
import Recommend   from './pages/Recommend.jsx'

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/"            element={<Overview />}   />
          <Route path="/products"    element={<Products />}   />
          <Route path="/demand"      element={<Demand />}     />
          <Route path="/abc"         element={<ABC />}        />
          <Route path="/rfm"         element={<RFM />}        />
          <Route path="/cohort"      element={<Cohort />}     />
          <Route path="/forecast"    element={<Forecast />}   />
          <Route path="/customers"   element={<Customers />}  />
          <Route path="/churn"       element={<Churn />}      />
          <Route path="/anomaly"     element={<Anomaly />}    />
          <Route path="/nlquery"     element={<NLQuery />}    />
          <Route path="/elasticity"  element={<Elasticity />} />
          <Route path="/recommend"   element={<Recommend />}  />
        </Routes>
      </div>
    </div>
  )
}
