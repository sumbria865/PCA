import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ScatterChart,
  Scatter, Legend
} from 'recharts'
import { Brain, TrendingUp, Target, Award, ArrowLeft, Download } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const COLORS = [
  '#6366f1','#a78bfa','#f472b6','#34d399','#fb923c',
  '#60a5fa','#facc15','#f87171','#4ade80','#38bdf8',
  '#c084fc','#fb7185','#86efac'
]

const ACTIVITY_LABELS = {
  0: 'Null', 1: 'Standing', 2: 'Sitting', 3: 'Lying Down', 4: 'Walking',
  5: 'Stairs', 6: 'Waist Bends', 7: 'Arm Elevation',
  8: 'Knee Bends', 9: 'Cycling', 10: 'Jogging', 11: 'Running', 12: 'Jump'
}

// Build training history chart data
function historyToChartData(history) {
  if (!history?.loss) return []
  return history.loss.map((_, i) => ({
    epoch:    i + 1,
    loss:     parseFloat(history.loss[i]?.toFixed(4)     || 0),
    accuracy: parseFloat((history.accuracy?.[i] * 100)?.toFixed(2) || 0),
    val_loss: parseFloat(history.val_loss?.[i]?.toFixed(4)  || 0),
    val_acc:  parseFloat((history.val_accuracy?.[i] * 100)?.toFixed(2) || 0),
  }))
}

export default function RNNResults() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('curves')

  useEffect(() => {
    axios.get(`/api/rnn/${id}/result`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="glass rounded-2xl p-12 text-center text-white/40">
      No results found.
      <button onClick={() => navigate('/rnn-train')} className="text-purple-400 ml-2">Train a model →</button>
    </div>
  )

  const chartData    = historyToChartData(data.trainingHistory)
  const classNames   = data.classNames || []
  const cm           = data.confusionMatrix || []
  const report       = data.classificationReport || []
  const perClass     = data.perClassAccuracy || []

  const downloadReport = () => {
    const rows = [['Class','Precision','Recall','F1-Score','Support']]
    report.forEach(r => rows.push([r.class, r.precision, r.recall, r.f1, r.support]))
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'classification_report.csv'; a.click()
    toast.success('Report downloaded!')
  }

  const TABS = ['curves', 'confusion', 'report', 'scatter']

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="text-purple-400" size={24} /> BiLSTM Results
          </h2>
          <p className="text-white/50 text-sm mt-1">
            PCA ({data.pcaComponents} components, {data.pcaCumulativeVariance}% variance) + BiLSTM — mHealth dataset
          </p>
        </div>
        <button onClick={() => navigate('/rnn-train')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-white/60 hover:text-white">
          <ArrowLeft size={14} /> New Training
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Award,     label: 'Test Accuracy', value: `${data.testAccuracy}%`,   color: 'text-green-400',  bg: 'from-green-500/20 to-green-600/10' },
          { icon: Target,    label: 'Macro F1',       value: `${data.macroF1}%`,        color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10' },
          { icon: TrendingUp,label: 'Weighted F1',    value: `${data.weightedF1}%`,     color: 'text-indigo-400', bg: 'from-indigo-500/20 to-indigo-600/10' },
          { icon: Brain,     label: 'PCA Components', value: data.pcaComponents,        color: 'text-fuchsia-400',bg: 'from-fuchsia-500/20 to-fuchsia-600/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`glass rounded-2xl p-5 bg-gradient-to-br ${bg}`}>
            <Icon size={18} className={color} />
            <p className={`text-3xl font-bold ${color} mt-3`}>{value}</p>
            <p className="text-xs text-white/50 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Model info strip */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-6">
        {[
          ['Epochs',       data.currentEpoch || data.epochs],
          ['Batch Size',   data.batchSize],
          ['LSTM Units',   data.lstmUnits],
          ['Window Size',  data.windowSize],
          ['Train Samples',data.trainSamples?.toLocaleString()],
          ['Test Samples', data.testSamples?.toLocaleString()],
          ['Model Params', data.modelParams?.toLocaleString()],
          ['Activities',   data.nClasses],
        ].map(([lbl, val]) => (
          <div key={lbl} className="text-center">
            <p className="text-xs text-white/30 uppercase tracking-wider">{lbl}</p>
            <p className="font-bold text-white mt-0.5">{val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {[
          { key: 'curves',    label: 'Loss & Accuracy' },
          { key: 'confusion', label: 'Confusion Matrix' },
          { key: 'report',    label: 'Classification Report' },
          { key: 'scatter',   label: 'PCA Scatter' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.key
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-white/50 hover:text-white/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Loss & Accuracy Curves ─────────────────────────────── */}
      {activeTab === 'curves' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Loss */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Training & Validation Loss</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="epoch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  label={{ value: 'Epoch', position: 'insideBottom', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                <Line type="monotone" dataKey="loss"     name="Train Loss" stroke="#f87171" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="val_loss" name="Val Loss"   stroke="#fb923c" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Training & Validation Accuracy</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="epoch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  label={{ value: 'Epoch', position: 'insideBottom', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                <Line type="monotone" dataKey="accuracy" name="Train Acc" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="val_acc"  name="Val Acc"   stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-class accuracy bar */}
          <div className="col-span-2 glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Per-Class Accuracy</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perClass} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} unit="%" />
                <YAxis dataKey="class" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} formatter={v => [`${v}%`, 'Accuracy']} />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {perClass.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tab: Confusion Matrix ──────────────────────────────────── */}
      {activeTab === 'confusion' && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Confusion Matrix</h3>
          {cm.length > 0 ? (
            <div className="overflow-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 text-white/30 font-medium text-left">True ↓ / Pred →</th>
                    {classNames.map((c, i) => (
                      <th key={i} className="p-1.5 font-semibold text-center"
                        style={{ color: COLORS[i % COLORS.length] }}
                        title={c}>
                        {c.substring(0, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cm.map((row, i) => {
                    const rowSum = row.reduce((a, b) => a + b, 0)
                    return (
                      <tr key={i}>
                        <td className="p-1.5 font-semibold text-xs whitespace-nowrap"
                          style={{ color: COLORS[i % COLORS.length] }}>
                          {classNames[i]}
                        </td>
                        {row.map((val, j) => {
                          const intensity = rowSum > 0 ? val / rowSum : 0
                          const isCorrect = i === j
                          return (
                            <td key={j} className="p-1.5 text-center rounded font-mono font-medium"
                              style={{
                                background: isCorrect
                                  ? `rgba(52,211,153,${Math.max(0.05, intensity * 0.8)})`
                                  : val > 0 ? `rgba(248,113,113,${Math.max(0.05, intensity * 0.6)})` : 'transparent',
                                color: isCorrect ? '#34d399' : val > 0 ? '#f87171' : 'rgba(255,255,255,0.2)',
                              }}>
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-white/30 mt-3">
                Green diagonal = correct predictions · Red = misclassifications
              </p>
            </div>
          ) : (
            <p className="text-white/30 text-sm">No confusion matrix data.</p>
          )}
        </div>
      )}

      {/* ── Tab: Classification Report ───────────────────────────────── */}
      {activeTab === 'report' && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Classification Report</h3>
            <button onClick={downloadReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass glass-hover text-xs text-white/60 hover:text-white">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  {['Class','Precision','Recall','F1-Score','Support'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2.5 px-3 font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{row.class}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-300">{(row.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-green-300">{(row.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">{(row.f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-white/50">{row.support}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td className="py-2.5 px-3 font-bold text-white">Weighted Avg</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-300">—</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-green-300">—</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-300">{data.weightedF1}%</td>
                  <td className="py-2.5 px-3 text-white/50">{data.testSamples}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: PCA Scatter (test set predictions) ───────────────── */}
      {activeTab === 'scatter' && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-1">PCA Scatter — Test Set Predictions</h3>
          <p className="text-xs text-white/40 mb-4">Points colored by true activity label (PC1 vs PC2 of test windows)</p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="x" name="PC1" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                label={{ value: 'PC1', position: 'insideBottomRight', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <YAxis dataKey="y" name="PC2" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: 'rgba(139,92,246,0.3)' }}
                contentStyle={{ background: 'rgba(15,12,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                formatter={(_, name, props) => [
                  `${ACTIVITY_LABELS[props.payload?.activity] || props.payload?.activity}`,
                  'True Activity'
                ]}
              />
              {/* Group by activity for coloring */}
              {[...new Set(data.scatterData?.map(d => d.activity))].map(act => (
                <Scatter
                  key={act}
                  name={ACTIVITY_LABELS[act] || String(act)}
                  data={data.scatterData?.filter(d => d.activity === act)}
                  fill={COLORS[act % COLORS.length]}
                  opacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Paper comparison box */}
      <div className="glass rounded-2xl p-5 border border-purple-500/20">
        <h3 className="font-semibold text-white text-sm mb-3">📄 Paper Comparison</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Paper Accuracy (BiLSTM)', value: '97.64%', color: 'text-yellow-400', sub: 'Aljarrah & Ali, 2019' },
            { label: 'Your Model Accuracy',     value: `${data.testAccuracy}%`, color: 'text-green-400', sub: 'This training run' },
            { label: 'Paper Baseline (SVM)',     value: '64.67%', color: 'text-red-400',   sub: 'Without PCA+BiLSTM' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="glass rounded-xl p-4">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-semibold text-white/70 mt-1">{label}</p>
              <p className="text-xs text-white/30 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}