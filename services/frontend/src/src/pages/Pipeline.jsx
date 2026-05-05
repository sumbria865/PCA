import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Circle, ChevronDown, ChevronUp, Database, 
  BarChart2, GitMerge, Sigma, Target, Rocket, ArrowRight } from 'lucide-react'
import api from '../api/axios'

const STEPS = [
  { key: 'loaded', icon: Database, label: 'Data Loaded', detail: 'CSV parsed, activity labels mapped' },
  { key: 'normalized', icon: BarChart2, label: 'Data Normalized', detail: 'StandardScaler applied (mean=0, std=1)' },
  { key: 'covariance', icon: GitMerge, label: 'Covariance Matrix', detail: '12×12 covariance matrix computed' },
  { key: 'eigenvalues', icon: Sigma, label: 'Eigenvalues Computed', detail: 'Sorted descending, variance ratios calculated' },
  { key: 'selected', icon: Target, label: 'Principal Components Selected', detail: 'Top N components chosen by explained variance' },
  { key: 'transformed', icon: Rocket, label: 'Data Transformed', detail: 'Projected onto principal component axes' },
]

export default function Pipeline() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState({})
  const [details, setDetails] = useState({})
  const [expanded, setExpanded] = useState({})
  const [done, setDone] = useState(false)

useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const { data } = await api.get(`/api/analysis/${id}/pipeline-status`)

      console.log("PIPELINE DATA:", data)

      // ✅ Backend returns `steps` and `details` here
      setStatus(data.steps || {})
      setDetails(data.details || {})

      if (data.status === 'completed') {
        setDone(true)
        clearInterval(interval)
      }

      if (data.status === 'failed') {
        clearInterval(interval)
      }

    } catch (err) {
      console.error("Polling error:", err)
    }
  }, 1000)

  return () => clearInterval(interval)
}, [id])
  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const getStepStatus = (key) => {
    if (status[key] === 'done') return 'done'
    if (status[key] === 'running') return 'running'
    return 'pending'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">PCA Pipeline</h2>
        <p className="text-white/50 text-sm mt-1">Step-by-step ML processing view</p>
      </div>

      <div className="space-y-3">
        {STEPS.map(({ key, icon: Icon, label, detail }, i) => {
          const s = getStepStatus(key)
          const isExpanded = expanded[key]
          return (
            <div key={key}
              className={`glass rounded-2xl overflow-hidden transition-all duration-300
                ${s === 'done' ? 'border border-green-500/30' : s === 'running' ? 'border border-indigo-500/50' : 'border border-white/5'}`}
            >
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => toggle(key)}>
                {/* Step number */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: s === 'done' ? 'rgba(34,197,94,0.15)' : s === 'running' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)' }}>
                  {s === 'done' ? <CheckCircle2 size={16} className="text-green-400" /> :
                   s === 'running' ? <Loader2 size={16} className="text-indigo-400 animate-spin" /> :
                   <span className="text-white/30">{i + 1}</span>}
                </div>

                {/* Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center
                  ${s === 'done' ? 'bg-green-500/10' : s === 'running' ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
                  <Icon size={14} className={s === 'done' ? 'text-green-400' : s === 'running' ? 'text-indigo-400' : 'text-white/30'} />
                </div>

                <div className="flex-1">
                  <p className={`font-semibold text-sm ${s === 'done' ? 'text-white' : s === 'running' ? 'text-indigo-300' : 'text-white/40'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{detail}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium
                    ${s === 'done' ? 'bg-green-500/15 text-green-400' : s === 'running' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-white/5 text-white/30'}`}>
                    {s === 'done' ? '✓ Done' : s === 'running' ? '⚙ Processing' : 'Waiting'}
                  </span>
                  {s === 'done' && (isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />)}
                </div>
              </div>

              {/* Expandable detail */}
              {s === 'done' && isExpanded && (
                <div className="px-4 pb-4">
                  <div className="bg-black/20 rounded-xl p-3 font-mono text-xs text-indigo-300 border border-white/5">
                    {details[key] || 'Step completed successfully.'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {done && (
        <button
          onClick={() => navigate(`/visualization/${id}`)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          View Visualization <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}