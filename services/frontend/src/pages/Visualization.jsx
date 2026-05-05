import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts'
import { Download, Image, ArrowRight, Layers } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const ACTIVITY_LABELS = {
  0: 'Null', 1: 'Standing', 2: 'Sitting', 3: 'Lying Down', 4: 'Walking',
  5: 'Climbing Stairs', 6: 'Waist Bends', 7: 'Elevation Arms',
  8: 'Knees Bending', 9: 'Cycling', 10: 'Jogging', 11: 'Running', 12: 'Jump'
}

const COLORS = [
  '#6366f1','#a78bfa','#f472b6','#34d399','#fb923c',
  '#60a5fa','#facc15','#f87171','#4ade80','#38bdf8',
  '#c084fc','#fb7185','#86efac'
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="glass rounded-xl px-4 py-3 text-xs space-y-1 border border-white/10">
      <p className="font-semibold text-white">{ACTIVITY_LABELS[d?.activity] || 'Unknown'}</p>
      <p className="text-white/60">PC1: <span className="text-indigo-300">{d?.x?.toFixed(3)}</span></p>
      <p className="text-white/60">PC2: <span className="text-purple-300">{d?.y?.toFixed(3)}</span></p>
      <p className="text-white/40">Subject: {d?.subject}</p>
    </div>
  )
}

export default function Visualization() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeActivities, setActiveActivities] = useState(new Set())

  useEffect(() => {
    api.get(`/api/analysis/${id}/result`)
      .then(({ data }) => {
        setResult(data)
        const acts = new Set(data.scatterData?.map(d => d.activity))
        setActiveActivities(acts)
      })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!result) return (
    <div className="glass rounded-2xl p-12 text-center text-white/40">
      <p>No results found. <button onClick={() => navigate('/upload')} className="text-indigo-400">Run an analysis first →</button></p>
    </div>
  )

  const { scatterData, varianceRatios, screePlot, topFeatures, transformedPreview, components } = result

  // Group scatter data by activity
  const byActivity = {}
  scatterData?.forEach(d => {
    if (!byActivity[d.activity]) byActivity[d.activity] = []
    byActivity[d.activity].push(d)
  })

  const downloadCSV = () => {
    const rows = [['PC1', 'PC2', 'Activity', 'Subject']]
    scatterData?.forEach(d => rows.push([d.x, d.y, ACTIVITY_LABELS[d.activity], d.subject]))
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'pca_transformed.csv'; a.click()
    toast.success('CSV downloaded!')
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Visualization</h2>
          <p className="text-white/50 text-sm mt-1">PCA scatter plot · {scatterData?.length?.toLocaleString()} data points</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-white/70 hover:text-white transition-all">
            <Download size={14} /> Download CSV
          </button>
          <button
            onClick={() => navigate(`/insights/${id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold">
            View Insights <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main scatter plot */}
        <div className="col-span-2 glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">PCA Scatter Plot — PC1 vs PC2</h3>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="x" name="PC1" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                label={{ value: 'PC1', position: 'insideBottomRight', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <YAxis dataKey="y" name="PC2" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,92,246,0.3)' }} />
              {Object.entries(byActivity).map(([act, pts]) =>
                activeActivities.has(parseInt(act)) && (
                  <Scatter key={act} name={ACTIVITY_LABELS[act]} data={pts}
                    fill={COLORS[parseInt(act) % COLORS.length]} opacity={0.75} />
                )
              )}
            </ScatterChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.keys(byActivity).map(act => (
              <button key={act}
                onClick={() => {
                  setActiveActivities(prev => {
                    const next = new Set(prev)
                    next.has(parseInt(act)) ? next.delete(parseInt(act)) : next.add(parseInt(act))
                    return next
                  })
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all
                  ${activeActivities.has(parseInt(act)) ? 'bg-white/10 text-white' : 'bg-white/5 text-white/30'}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[parseInt(act) % COLORS.length] }} />
                {ACTIVITY_LABELS[act]}
              </button>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Explained variance */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Explained Variance Ratio</h3>
            <div className="space-y-3">
              {varianceRatios?.map((v, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">PC{i + 1}</span>
                    <span className="font-semibold" style={{ color: COLORS[i] }}>{(v * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${v * 100}%`, background: COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-center">
              <p className="text-xs text-white/40">Cumulative</p>
              <p className="text-2xl font-bold gradient-text mt-1">
                {varianceRatios ? (varianceRatios.slice(0, components || 2).reduce((a, b) => a + b, 0) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Feature reduction */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Layers size={14} className="text-indigo-400" /> Feature Reduction
            </h3>
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-white/60">12</p>
                <p className="text-xs text-white/30 mt-1">Original</p>
              </div>
              <div className="text-white/20">→</div>
              <div className="text-center">
                <p className="text-3xl font-bold gradient-text">{components || 2}</p>
                <p className="text-xs text-white/30 mt-1">Reduced</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Scree plot */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Scree Plot</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={screePlot}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="component" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                label={{ value: 'Component', position: 'insideBottom', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="variance" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top features */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Top Contributing Features (PC1)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topFeatures} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
              <YAxis dataKey="feature" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="loading" radius={[0, 4, 4, 0]}>
                {topFeatures?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold text-white text-sm mb-4">Transformed Data Preview (first 10 rows)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['#', ...Array.from({ length: components || 2 }, (_, i) => `PC${i + 1}`), 'Activity', 'Subject'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transformedPreview?.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-2 px-3 text-white/30">{i + 1}</td>
                  {row.pcs?.map((v, j) => (
                    <td key={j} className="py-2 px-3 font-mono" style={{ color: COLORS[j] }}>{v.toFixed(4)}</td>
                  ))}
                  <td className="py-2 px-3 text-white/70">{ACTIVITY_LABELS[row.activity]}</td>
                  <td className="py-2 px-3 text-white/40">{row.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}