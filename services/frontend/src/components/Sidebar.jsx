import { NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Upload, GitBranch, BarChart3, 
  Lightbulb, History, LogOut, Cpu, Brain
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',    icon: Upload,          label: 'Upload Dataset' },
  { to: '/rnn-train', icon: Brain,           label: 'BiLSTM Training' },
  { to: '/history',   icon: History,         label: 'PCA History' },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="w-64 glass border-r border-white/10 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base gradient-text">PCA Insight</h1>
            <p className="text-xs text-white/40">ML Analytics Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
              ${isActive 
                ? 'nav-active text-indigo-300' 
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-indigo-400' : 'text-white/40 group-hover:text-white/70'} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest px-3 mb-3">Analysis</p>
          <div className="space-y-1">
            {[
              { icon: GitBranch, label: 'PCA Pipeline', note: 'Select from History' },
              { icon: BarChart3, label: 'Visualization', note: 'Select from History' },
              { icon: Lightbulb, label: 'Insights', note: 'Select from History' },
            ].map(({ icon: Icon, label, note }) => (
              <div key={label} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 cursor-not-allowed"
                title={note}
              >
                <Icon size={17} className="text-white/20" />
                {label}
                <span className="ml-auto text-xs bg-white/5 px-1.5 py-0.5 rounded text-white/20">↑</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}