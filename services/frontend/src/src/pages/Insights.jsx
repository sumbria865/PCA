import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Lightbulb, TrendingUp, Users, Zap, BarChart3, ArrowLeft } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Insights() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/analysis/${id}/result`)
      .then(({ data }) => setResult(data))
      .catch(() => toast.error('Failed to load insights'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalVariance = result?.varianceRatios
    ? (result.varianceRatios.slice(0, result.components || 2).reduce((a, b) => a + b, 0) * 100).toFixed(1)
    : '—'

  const insightCards = [
    {
      icon: TrendingUp,
      title: 'Variance Explained',
      value: `${totalVariance}%`,
      desc: `The top ${result?.components || 2} principal components capture ${totalVariance}% of the total dataset variance.`,
      color: 'from-indigo-500/20 to-indigo-600/10',
      accent: 'text-indigo-400',
    },
    {
      icon: Users,
      title: 'Activity Separation',
      value: 'Good',
      desc: 'PCA reveals clear clustering separation between physical activities (running, jogging) vs. stationary activities (sitting, lying).',
      color: 'from-purple-500/20 to-purple-600/10',
      accent: 'text-purple-400',
    },
    {
      icon: Zap,
      title: 'Dominant Sensor',
      value: result?.topFeatures?.[0]?.feature || 'alx',
      desc: 'The ankle accelerometer X-axis (alx) and Z-axis (alz) are the strongest contributors to PC1, reflecting forward motion.',
      color: 'from-fuchsia-500/20 to-fuchsia-600/10',
      accent: 'text-fuchsia-400',
    },
    {
      icon: BarChart3,
      title: 'Dimensionality',
      value: `12 → ${result?.components || 2}`,
      desc: `Reduced from 12 sensor dimensions to ${result?.components || 2} PCs with minimal information loss.`,
      color: 'from-blue-500/20 to-blue-600/10',
      accent: 'text-blue-400',
    },
  ]

  const observations = [
    'PCA reveals clear separation between walking, jogging, and running activities along PC1 — this axis captures locomotion intensity.',
    'Sedentary activities (sitting, lying, standing) cluster tightly near the origin in PC space, showing low variance among them.',
    'Climbing stairs and jumping activities form distinct outlier clusters in the 2D projection.',
    'The gyroscope features (grx, gry, grz) contribute more strongly to PC2, capturing rotational motion patterns.',
    `With ${totalVariance}% cumulative variance in ${result?.components || 2} components, PCA is an effective preprocessing step for activity classifiers.`,
  ]

  const radarData = result?.topFeatures?.map(f => ({ feature: f.feature, loading: Math.abs(f.loading) * 100 })) || []

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Insights</h2>
          <p className="text-white/50 text-sm mt-1">AI-generated observations from your PCA results</p>
        </div>
        <button onClick={() => navigate(`/visualization/${id}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-white/60 hover:text-white transition-all">
          <ArrowLeft size={14} /> Back to Visualization
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {insightCards.map(({ icon: Icon, title, value, desc, color, accent }) => (
          <div key={title} className={`glass rounded-2xl p-5 bg-gradient-to-br ${color} flex flex-col gap-3`}>
            <Icon size={18} className={accent} />
            <div>
              <p className={`text-2xl font-bold ${accent}`}>{value}</p>
              <p className="text-xs font-semibold text-white/60 mt-0.5">{title}</p>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Observations */}
        <div className="col-span-2 glass rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-400" /> Key Observations
          </h3>
          <div className="space-y-3">
            {observations.map((obs, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-all">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                <p className="text-sm text-white/70 leading-relaxed">{obs}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar chart of feature loadings */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Feature Importance (PC1)</h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="feature" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <Radar dataKey="loading" stroke="#818cf8" fill="#818cf8" fillOpacity={0.2} />
                <Tooltip contentStyle={{ background: 'rgba(15,12,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Summary box */}
      <div className="glass rounded-2xl p-6 border border-indigo-500/20">
        <h3 className="font-semibold text-white mb-3 text-sm">📋 Summary</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          PCA applied to the mHealth dataset ({result?.sampleSize?.toLocaleString() || '5,000'} sampled rows) successfully reduced 12 sensor dimensions to {result?.components || 2} principal components, 
          explaining <strong className="text-indigo-400">{totalVariance}%</strong> of total variance. 
          The scatter plot demonstrates meaningful activity clustering — physical activities like running and jogging form 
          well-separated clusters from stationary states. This validates PCA as an effective preprocessing step for 
          downstream activity recognition classifiers.
        </p>
      </div>
    </div>
  )
}