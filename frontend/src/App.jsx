import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Pipeline from './pages/Pipeline'
import Processing from './pages/Processing'
import Visualization from './pages/Visualization'
import Insights from './pages/Insights'
import History from './pages/History'
import Notebook from './pages/Notebook'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-mesh">
      <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/upload" element={
        <ProtectedRoute>
          <AppLayout><Upload /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/pipeline/:id" element={
        <ProtectedRoute>
          <AppLayout><Pipeline /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/processing/:id" element={
        <ProtectedRoute>
          <AppLayout><Processing /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/visualization/:id" element={
        <ProtectedRoute>
          <AppLayout><Visualization /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/insights/:id" element={
        <ProtectedRoute>
          <AppLayout><Insights /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <AppLayout><History /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/notebook" element={
        <ProtectedRoute>
          <AppLayout><Notebook /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}