import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  Upload, CheckCircle, X, Brain, ArrowRight, Settings,
  ChevronDown, ChevronUp, Info
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const PAPER_DEFAULTS = {
  pcaComponents:     '0',
  varianceThreshold: '0.85',
  sampleSize:        '10000',
  epochs:            '30',
  batchSize:         '64',
  lstmUnits:         '64',
  dropoutRate:       '0.3',
}

export default function RNNTrain() {
  const [file,    setFile]    = useState(null)
  const [config,  setConfig]  = useState(PAPER_DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [rnnId,   setRnnId]   = useState(null)
  const [status,  setStatus]  = useState(null)   // live polling data
  const [showAdv, setShowAdv] = useState(false)
  const logsEndRef = useRef(null)
  const navigate   = useNavigate()

  // Auto-scroll logs
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [status?.logs])

  // Poll status while training
  useEffect(() => {
    if (!rnnId) return
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/rnn/${rnnId}/status`)
        setStatus(data)
        if (data.status === 'completed') {
          clearInterval(interval)
          toast.success('Training complete!')
          setTimeout(() => navigate(`/rnn-results/${rnnId}`), 800)
        }
        if (data.status === 'failed') {
          clearInterval(interval)
          toast.error('Training failed: ' + (data.errorMessage || 'Unknown error'))
        }
      } catch {}
    }, 1500)
    return () => clearInterval(interval)
  }, [rnnId, navigate])

  const onDrop = useCallback(accepted => {
    if (accepted.length) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/zip': ['.zip'] },
    maxFiles: 1,
  })

  const set = (key, val) => setConfig(p => ({ ...p, [key]: val }))

  const handleTrain = async () => {
    if (!file) return toast.error('Please select a file first')
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    Object.entries(config).forEach(([k, v]) => form.append(k, v))
    try {
      const { data } = await axios.post('/api/rnn/train', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setRnnId(data.rnnId)
      toast.success('Training started!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start training')
      setLoading(false)
    }
  }

  const isTraining = !!rnnId

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Brain className="text-purple-400" size={24} />
          PCA + BiLSTM Training
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Based on: <span className="text-indigo-400 font-medium">Aljarrah & Ali, IEEE IICETA 2019</span> — 97.64% accuracy on mHealth
        </p>
      </div>

      {/* Paper reference card */}
      <div className="glass rounded-2xl p-4 border border-indigo-500/20 flex gap-3">
        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50 leading-relaxed">
          This implements the exact pipeline from the paper: <strong className="text-white/70">StandardScaler → PCA (≥85% variance) → Sliding Window → BiLSTM → Softmax</strong>.
          The paper achieved <strong className="text-green-400">97.64% accuracy</strong> on the mHealth dataset.
          Default hyperparameters match the paper's configuration.
        </p>
      </div>

      {!isTraining ? (
        <>
          {/* File upload */}
          <div {...getRootProps()}
            className={`glass rounded-2xl p-10 border-2 border-dashed transition-all cursor-pointer text-center
              ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/50'}
              ${file ? 'border-green-500/50 bg-green-500/5' : ''}`}>
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="flex items-center gap-1 text-xs text-red-400 mx-auto mt-1">
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={28} className="text-purple-400 mx-auto" />
                <p className="font-semibold text-white">Drop mHealth CSV here</p>
                <p className="text-xs text-white/40">.csv or .zip — up to 300 MB</p>
              </div>
            )}
          </div>

          {/* Core config */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Settings size={15} className="text-purple-400" /> Training Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'sampleSize',   label: 'Sample Size', opts: [['2000','2,000 (fast)'],['5000','5,000'],['10000','10,000 (paper)'],['30000','30,000 (slow)']] },
                { key: 'epochs',       label: 'Epochs',      opts: [['20','20'],['30','30 (paper)'],['50','50'],['100','100']] },
                { key: 'batchSize',    label: 'Batch Size',  opts: [['32','32'],['64','64 (paper)'],['128','128']] },
                { key: 'lstmUnits',    label: 'LSTM Units',  opts: [['32','32'],['64','64 (paper)'],['128','128']] },
              ].map(({ key, label, opts }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">{label}</label>
                  <select value={config[key]} onChange={e => set(key, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white transition-all">
                    {opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Advanced */}
            <button onClick={() => setShowAdv(!showAdv)}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-all">
              {showAdv ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Advanced PCA options
            </button>

            {showAdv && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">PCA Components</label>
                  <select value={config.pcaComponents} onChange={e => set('pcaComponents', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                    <option value="0">Auto (by variance threshold)</option>
                    <option value="2">2 Components</option>
                    <option value="3">3 Components</option>
                    <option value="5">5 Components</option>
                    <option value="8">8 Components</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Variance Threshold</label>
                  <select value={config.varianceThreshold} onChange={e => set('varianceThreshold', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                    <option value="0.80">80%</option>
                    <option value="0.85">85% (paper)</option>
                    <option value="0.90">90%</option>
                    <option value="0.95">95%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Dropout Rate</label>
                  <select value={config.dropoutRate} onChange={e => set('dropoutRate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                    <option value="0.2">0.2</option>
                    <option value="0.3">0.3 (paper)</option>
                    <option value="0.4">0.4</option>
                    <option value="0.5">0.5</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleTrain} disabled={!file || loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Starting...</>
              : <><Brain size={16} /> Train PCA + BiLSTM Model <ArrowRight size={14} /></>
            }
          </button>
        </>
      ) : (
        /* ── Live Training View ─────────────────────────────────── */
        <div className="space-y-4">
          {/* Progress */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Brain size={18} className="text-purple-400 animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Training BiLSTM...</p>
                  <p className="text-xs text-white/40">
                    Epoch {status?.currentEpoch || 0} / {config.epochs}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold gradient-text">
                {status?.trainingProgress || 0}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                style={{ width: `${status?.trainingProgress || 0}%` }} />
            </div>

            {/* Live metrics */}
            {status?.liveMetrics && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Train Loss',   val: status.liveMetrics.loss?.toFixed(4),         color: 'text-red-400' },
                  { label: 'Train Acc',    val: `${((status.liveMetrics.accuracy || 0)*100).toFixed(1)}%`, color: 'text-green-400' },
                  { label: 'Val Loss',     val: status.liveMetrics.val_loss?.toFixed(4),      color: 'text-orange-400' },
                  { label: 'Val Acc',      val: `${((status.liveMetrics.val_accuracy || 0)*100).toFixed(1)}%`, color: 'text-blue-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="glass rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold ${color}`}>{val || '—'}</p>
                    <p className="text-xs text-white/40 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Python logs terminal */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/20">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="text-xs text-white/30 ml-2 font-mono">rnn_engine.log</span>
            </div>
            <div className="p-4 font-mono text-xs space-y-1 h-52 overflow-y-auto bg-black/10">
              {(status?.logs || []).map((log, i) => (
                <div key={i} className={`leading-relaxed ${log.includes('ERROR') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-purple-300'}`}>
                  <span className="text-white/20 mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {log}
                </div>
              ))}
              {status?.status === 'training' && (
                <div className="text-purple-400 cursor-blink" />
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}