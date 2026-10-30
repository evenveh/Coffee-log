import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import BeanDetail from './pages/BeanDetail'
import BeanForm from './pages/BeanForm'
import Beans from './pages/Beans'
import BrewDetail from './pages/BrewDetail'
import BrewForm from './pages/BrewForm'
import BrewList from './pages/BrewList'
import Friends from './pages/Friends'
import GrinderDetail from './pages/GrinderDetail'
import Login from './pages/Login'
import Settings from './pages/Settings'
import FriendBrew from './pages/FriendBrew'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Every page inside this route requires sign-in and gets the shared Layout (header + bottom nav) */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<BrewList />} />
        <Route path="/brews/new" element={<BrewForm />} />
        <Route path="/brews/:id" element={<BrewDetail />} />
        <Route path="/brews/:id/edit" element={<BrewForm />} />
        <Route path="/beans" element={<Beans />} />
        <Route path="/beans/new" element={<BeanForm />} />
        <Route path="/beans/:id" element={<BeanDetail />} />
        <Route path="/beans/:id/edit" element={<BeanForm />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/friends/:id" element={<FriendBrew />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/grinders/:id" element={<GrinderDetail />} />
      </Route>

      {/* Unknown URL -> back to the brew list */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
