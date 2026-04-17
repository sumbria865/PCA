import { Bell, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <header className="glass border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
      <div>
        <p className="text-xs text-white/40">mHealth Sensor Dataset • 12 Activities • 10 Subjects</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center text-white/50 hover:text-white/80 transition-all">
          <Bell size={15} />
        </button>
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <User size={12} className="text-white" />
          </div>
          <span className="text-sm font-medium text-white/80">{user?.name || 'User'}</span>
        </div>
      </div>
    </header>
  )
}