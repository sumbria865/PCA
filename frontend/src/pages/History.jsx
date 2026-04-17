import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, BarChart3, Eye, RefreshCw, Trash2, Plus } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  completed: 'bg-green-500/15 text-green-400',
  processing: 'bg-indigo-500/15 text-indigo-400',
  pending: 'bg-yellow-500/15 text-yellow-400',
  failed: 'bg-red-500/15 text-red-400',
}

export default function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchHistory = () => {
    setLoading(true)
    api.get('/api/analysis/history')
      .then(({ data }) => setAnalyses(data))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHistory() }, [])

  const deleteAnalysis = async (id) => {
    try {
      await api.delete(`/api/analysis/${id}`)
      setAnalyses(prev => prev.filter(a => a._id !== id))
      toast.success('Analysis deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">History</h2>
          <p className="text-white/50 text-sm mt-1">{analyses.length} PCA analyses found</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-white/60 hover:text-white">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold">
            <Plus size={14} /> New Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-2xl p-5 shimmer h-20" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BarChart3 size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No analyses yet.</p>
          <button onClick={() => navigate('/upload')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold">
            Run Your First PCA →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <div key={a._id} className="glass rounded-2xl p-5 glass-hover flex items-center gap-5">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                <BarChart3 size={18} className="text-indigo-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-white text-sm truncate">{a.filename || 'mhealth_raw_data.csv'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[a.status] || STATUS_STYLE.pending}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Clock size={11} /> {new Date(a.createdAt).toLocaleString()}</span>
                  <span>{a.components}D PCA</span>
                  <span>{a.sampleSize?.toLocaleString()} rows</span>
                  {a.cumulativeVariance && <span className="text-indigo-400 font-medium">{a.cumulativeVariance}% variance</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {a.status === 'completed' && (
                  <>
                    <button onClick={() => navigate(`/visualization/${a._id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs text-indigo-400 hover:text-indigo-300 transition-all">
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => navigate(`/pipeline/${a._id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs text-white/50 hover:text-white/70 transition-all">
                      <RefreshCw size={12} /> Pipeline
                    </button>
                  </>
                )}
                <button onClick={() => deleteAnalysis(a._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-xs text-red-400/50 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}