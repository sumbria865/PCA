import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload as UploadIcon, FileText, CheckCircle, ArrowRight, X } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [components, setComponents] = useState('2')
  const [sampleSize, setSampleSize] = useState('5000')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback((accepted) => {
    if (accepted.length) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/zip': ['.zip'] },
    maxFiles: 1,
  })

  const handleStart = async () => {
    if (!file) return toast.error('Please select a file')
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('components', components)
    form.append('sampleSize', sampleSize)
    try {
      const { data } = await api.post('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('File uploaded! Starting pipeline...')
      navigate(`/pipeline/${data.analysisId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Upload Dataset</h2>
        <p className="text-white/50 text-sm mt-1">Upload your mHealth CSV to run PCA analysis</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`glass rounded-2xl p-12 border-2 border-dashed transition-all duration-200 cursor-pointer text-center
          ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'}
          ${file ? 'border-green-500/50 bg-green-500/5' : ''}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="space-y-3">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <p className="font-semibold text-white">{file.name}</p>
            <p className="text-sm text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mx-auto mt-2">
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
              <UploadIcon size={28} className="text-indigo-400" />
            </div>
            <p className="font-semibold text-white">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your CSV file'}
            </p>
            <p className="text-sm text-white/40">or click to browse • .csv, .zip supported</p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-white flex items-center gap-2"><FileText size={16} className="text-indigo-400" /> Analysis Options</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">PCA Components</label>
            <select value={components} onChange={e => setComponents(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white transition-all">
              <option value="2">2D (2 Components)</option>
              <option value="3">3D (3 Components)</option>
              <option value="5">5 Components</option>
              <option value="10">10 Components</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Sample Size</label>
            <select value={sampleSize} onChange={e => setSampleSize(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white transition-all">
              <option value="2000">2,000 rows (fast)</option>
              <option value="5000">5,000 rows</option>
              <option value="10000">10,000 rows</option>
              <option value="50000">50,000 rows (slow)</option>
            </select>
          </div>
        </div>

        <div className="glass rounded-xl p-4 text-xs text-white/40 border border-indigo-500/10">
          <strong className="text-indigo-400">Dataset Info:</strong> mHealth has 1.2M rows, 12 sensor features (accelerometer + gyroscope from ankle, arm, chest), 13 activity classes, 10 subjects.
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!file || loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading
          ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading...</>
          : <> <ArrowRight size={16} /> Start PCA Analysis</>
        }
      </button>
    </div>
  )
}