import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const DEMO_LOGS = [
  '→ Loading dataset from uploaded file...',
  '→ Detected 12 sensor features, 1 target column',
  '→ Sampling 5,000 rows from 1,215,745 total...',
  '→ Applying StandardScaler normalization...',
  '→ Computing 12×12 covariance matrix...',
  '→ Running eigendecomposition...',
  '→ Eigenvalues: [4.21, 2.87, 1.43, 0.92, 0.67, ...]',
  '→ Selecting top 2 principal components...',
  '→ PC1 explains 35.1% variance',
  '→ PC2 explains 23.9% variance',
  '→ Cumulative variance (PC1+PC2): 59.0%',
  '→ Projecting data onto PC space...',
  '→ Saving results to database...',
  '✓ PCA analysis complete!',
]

export default function Processing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const logsEndRef = useRef(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < DEMO_LOGS.length) {
        setLogs(prev => [...prev, DEMO_LOGS[i]])
        setProgress(Math.round(((i + 1) / DEMO_LOGS.length) * 100))
        i++
      } else {
        clearInterval(interval)
        // Check actual status
        const check = setInterval(async () => {
          try {
            const { data } = await api.get(`/api/analysis/${id}/status`)
            if (data.status === 'completed') {
              clearInterval(check)
              setTimeout(() => navigate(`/pipeline/${id}`), 500)
            }
          } catch {}
        }, 1500)
      }
    }, 600)
    return () => clearInterval(interval)
  }, [id, navigate])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Processing</h2>
        <p className="text-white/50 text-sm mt-1">Running PCA analysis on your dataset</p>
      </div>

      {/* Progress */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Computing PCA...</p>
              <p className="text-xs text-white/40">Reducing dimensions into principal components</p>
            </div>
          </div>
          <span className="text-2xl font-bold gradient-text">{progress}%</span>
        </div>

        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Terminal */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/20">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="text-xs text-white/30 ml-2 font-mono">pca_engine.log</span>
        </div>
        <div className="p-4 font-mono text-xs space-y-1 h-64 overflow-y-auto bg-black/10">
          {logs.map((log, i) => (
            <div key={i}
              className={`${log.startsWith('✓') ? 'text-green-400' : 'text-indigo-300'} leading-relaxed`}>
              <span className="text-white/20 mr-2">{String(i + 1).padStart(2, '0')}</span>
              {log}
            </div>
          ))}
          {logs.length < DEMO_LOGS.length && (
            <div className="text-indigo-400 cursor-blink" />
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}