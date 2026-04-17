import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Database, TrendingUp, Layers, ArrowRight, Clock, CheckCircle2, Activity } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, lastDataset: null, lastVariance: null, lastReduced: null })

  useEffect(() => {
    api.get('/api/analysis/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const statCards = [
    {
      icon: Database, label: 'Last Dataset',
      value: stats.lastDataset || 'None yet',
      sub: 'Most recent upload',
      color: 'from-indigo-500/20 to-indigo-600/10',
      accent: 'text-indigo-400'
    },
    {
      icon: TrendingUp, label: 'Variance Explained',
      value: stats.lastVariance ? `${stats.lastVariance}%` : '—',
      sub: 'Top 2 principal components',
      color: 'from-purple-500/20 to-purple-600/10',
      accent: 'text-purple-400'
    },
    {
      icon: Layers, label: 'Features Reduced',
      value: stats.lastReduced || '—',
      sub: 'Dimensions eliminated',
      color: 'from-fuchsia-500/20 to-fuchsia-600/10',
      accent: 'text-fuchsia-400'
    },
    {
      icon: Activity, label: 'Total Analyses',
      value: stats.total,
      sub: 'PCA runs completed',
      color: 'from-blue-500/20 to-blue-600/10',
      accent: 'text-blue-400'
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome */}
      <div className="glass rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.name}</span> 👋
          </h2>
          <p className="text-white/50 text-sm mt-1">
            mHealth Dataset — 1.2M rows · 12 features · 13 activity classes
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/30"
        >
          <Upload size={15} /> New Analysis <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, sub, color, accent }) => (
          <div key={label} className={`glass rounded-2xl p-5 bg-gradient-to-br ${color} hover:scale-[1.02] transition-all cursor-default`}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={18} className={accent} />
              <span className="text-xs text-white/30 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${accent} mb-1`}>{value}</p>
            <p className="text-xs text-white/40">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Upload & Analyze', desc: 'Upload your mHealth CSV and run PCA', icon: Upload, to: '/upload', cta: 'Get Started' },
          { title: 'View History', desc: 'See all previous PCA analyses', icon: Clock, to: '/history', cta: 'Browse' },
          { title: 'Activity Classes', desc: '13 classes: Walking, Sitting, Jogging…', icon: CheckCircle2, to: null, cta: null },
        ].map(({ title, desc, icon: Icon, to, cta }) => (
          <div key={title} className="glass rounded-2xl p-5 glass-hover flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon size={18} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{title}</h3>
              <p className="text-xs text-white/40 mt-1">{desc}</p>
            </div>
            {cta && (
              <button onClick={() => navigate(to)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-auto">
                {cta} <ArrowRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Activity labels reference */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4 text-sm">Dataset Activity Classes</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 0, label: 'Null' }, { id: 1, label: 'Standing Still' }, { id: 2, label: 'Sitting & Relaxing' },
            { id: 3, label: 'Lying Down' }, { id: 4, label: 'Walking' }, { id: 5, label: 'Climbing Stairs' },
            { id: 6, label: 'Waist Bends Forward' }, { id: 7, label: 'Frontal Elevation Arms' },
            { id: 8, label: 'Knees Bending' }, { id: 9, label: 'Cycling' }, { id: 10, label: 'Jogging' },
            { id: 11, label: 'Running' }, { id: 12, label: 'Jump Front & Back' },
          ].map(({ id, label }) => (
            <span key={id}
              className="px-3 py-1 rounded-full text-xs font-medium glass border border-white/10"
              style={{ color: `hsl(${id * 28}, 70%, 70%)` }}>
              {id}: {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}