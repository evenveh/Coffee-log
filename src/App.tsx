import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Beans from './pages/Beans'
import BrewList from './pages/BrewList'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      {/* Every page inside this route gets the shared Layout (header + bottom nav) */}
      <Route element={<Layout />}>
        <Route path="/" element={<BrewList />} />
        <Route path="/beans" element={<Beans />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      {/* Unknown URL -> back to the brew list */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
