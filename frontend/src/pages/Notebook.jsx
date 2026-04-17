import { useState, useRef, useEffect } from 'react'
import { Play, Plus, Save, FileText, Code, BarChart3 } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const CellType = {
  CODE: 'code',
  MARKDOWN: 'markdown',
  OUTPUT: 'output'
}

export default function Notebook() {
  const [cells, setCells] = useState([
    {
      id: 1,
      type: CellType.MARKDOWN,
      content: '# PCA Interactive Notebook\n\nExplore Principal Component Analysis step-by-step with interactive code cells. This notebook will guide you through the mathematical foundations and practical implementation of PCA.',
      output: null,
      isRunning: false
    },
    {
      id: 2,
      type: CellType.CODE,
      content: `# Import libraries
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns

print("Libraries imported successfully!")
print("NumPy version:", np.__version__)
print("Pandas version:", pd.__version__)`,
      output: null,
      isRunning: false
    },
    {
      id: 3,
      type: CellType.MARKDOWN,
      content: '## What is PCA?\n\nPrincipal Component Analysis (PCA) is a dimensionality reduction technique that transforms high-dimensional data into a lower-dimensional space while preserving as much variance as possible.\n\n### Key Concepts:\n- **Principal Components**: New axes that maximize variance\n- **Eigenvalues**: Amount of variance explained by each component\n- **Eigenvectors**: Directions of the principal components\n- **Explained Variance**: Percentage of total variance captured',
      output: null,
      isRunning: false
    },
    {
      id: 4,
      type: CellType.CODE,
      content: `# Create a sample dataset
np.random.seed(42)
n_samples = 10  # Reduced for better performance in notebook
n_features = 4

# Generate correlated data
X = np.random.randn(n_samples, n_features)
# Add correlation between features
X[:, 1] = X[:, 0] + 0.5 * np.random.randn(n_samples)
X[:, 2] = 0.8 * X[:, 0] + 0.3 * np.random.randn(n_samples)
X[:, 3] = np.random.randn(n_samples)  # Independent feature

# Create DataFrame
feature_names = ["Feature_" + str(i+1) for i in range(n_features)]
df = pd.DataFrame(X, columns=feature_names)

print("Sample dataset created:")
print("Shape:", df.shape)
print("\\nFirst 5 rows:")
print(df.head())
print("\\nCorrelation matrix:")
print(df.corr())`,
      output: null,
      isRunning: false
    }
  ])
  const [nextId, setNextId] = useState(5)

  const addCell = (type, afterId) => {
    const newCell = {
      id: nextId,
      type,
      content: type === CellType.CODE ? '# Write your Python code here' : '# Write your markdown here',
      output: null,
      isRunning: false
    }
    setCells(prev => {
      const index = prev.findIndex(c => c.id === afterId)
      const newCells = [...prev]
      newCells.splice(index + 1, 0, newCell)
      return newCells
    })
    setNextId(prev => prev + 1)
  }

  const updateCell = (id, content) => {
    setCells(prev => prev.map(cell =>
      cell.id === id ? { ...cell, content } : cell
    ))
  }

  const runCell = async (id) => {
    const cell = cells.find(c => c.id === id)
    if (!cell || cell.type !== CellType.CODE) return

    setCells(prev => prev.map(c =>
      c.id === id ? { ...c, isRunning: true, output: null } : c
    ))

    try {
      const { data } = await api.post('/api/notebook/execute', {
        code: cell.content
      })

      setCells(prev => prev.map(c =>
        c.id === id ? {
          ...c,
          isRunning: false,
          output: data.output,
          error: data.error
        } : c
      ))
    } catch (err) {
      setCells(prev => prev.map(c =>
        c.id === id ? {
          ...c,
          isRunning: false,
          output: null,
          error: 'Failed to execute code'
        } : c
      ))
      toast.error('Code execution failed')
    }
  }

  const deleteCell = (id) => {
    setCells(prev => prev.filter(c => c.id !== id))
  }

  const Cell = ({ cell, onUpdate, onRun, onDelete, onAddCell }) => {
    const [isEditing, setIsEditing] = useState(false)
    const textareaRef = useRef(null)

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
      }
    }, [isEditing])

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setIsEditing(false)
        onRun(cell.id)
      } else if (e.key === 'Escape') {
        setIsEditing(false)
      }
    }

    return (
      <div className="glass rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {cell.type === CellType.CODE ? (
              <Code size={16} className="text-indigo-400" />
            ) : (
              <FileText size={16} className="text-green-400" />
            )}
            <span className="text-xs text-white/40 uppercase tracking-wider">
              {cell.type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {cell.type === CellType.CODE && (
              <button
                onClick={() => onRun(cell.id)}
                disabled={cell.isRunning}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs transition-all disabled:opacity-50"
              >
                <Play size={12} />
                {cell.isRunning ? 'Running...' : 'Run'}
              </button>
            )}
            <button
              onClick={() => onAddCell(CellType.CODE, cell.id)}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60"
              title="Add code cell"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => onAddCell(CellType.MARKDOWN, cell.id)}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60"
              title="Add markdown cell"
            >
              <FileText size={14} />
            </button>
            <button
              onClick={() => onDelete(cell.id)}
              className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
              title="Delete cell"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4">
          {cell.type === CellType.MARKDOWN ? (
            <div
              className={`prose prose-invert max-w-none ${isEditing ? 'hidden' : 'block'}`}
              onClick={() => setIsEditing(true)}
              dangerouslySetInnerHTML={{
                __html: cell.content.replace(/\n/g, '<br>')
              }}
            />
          ) : (
            <pre
              className={`font-mono text-sm text-indigo-300 bg-black/30 p-3 rounded-xl border border-white/5 overflow-x-auto ${isEditing ? 'hidden' : 'block'}`}
              onClick={() => setIsEditing(true)}
            >
              {cell.content}
            </pre>
          )}

          {isEditing && (
            <textarea
              ref={textareaRef}
              value={cell.content}
              onChange={(e) => onUpdate(cell.id, e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsEditing(false)}
              className="w-full h-32 p-3 font-mono text-sm bg-black/50 border border-indigo-500/50 rounded-xl text-white resize-none focus:outline-none focus:border-indigo-400"
              placeholder={cell.type === CellType.CODE ? 'Write Python code...' : 'Write markdown...'}
            />
          )}

          {cell.output && (
            <div className="mt-3 p-3 bg-black/20 rounded-xl border border-green-500/20">
              <div className="text-xs text-green-400 mb-2">Output:</div>
              <pre className="font-mono text-sm text-white whitespace-pre-wrap">
                {cell.output}
              </pre>
            </div>
          )}

          {cell.error && (
            <div className="mt-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="text-xs text-red-400 mb-2">Error:</div>
              <pre className="font-mono text-sm text-red-300 whitespace-pre-wrap">
                {cell.error}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Interactive Notebook</h2>
          <p className="text-white/50 text-sm mt-1">Explore PCA with live code execution</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-white/70 hover:text-white">
            <Save size={14} /> Save Notebook
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {cells.map(cell => (
          <Cell
            key={cell.id}
            cell={cell}
            onUpdate={updateCell}
            onRun={runCell}
            onDelete={deleteCell}
            onAddCell={addCell}
          />
        ))}
      </div>

      <div className="flex gap-2 justify-center pt-4">
        <button
          onClick={() => addCell(CellType.CODE, cells[cells.length - 1]?.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
        >
          <Plus size={14} /> Add Code Cell
        </button>
        <button
          onClick={() => addCell(CellType.MARKDOWN, cells[cells.length - 1]?.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-all"
        >
          <FileText size={14} /> Add Text Cell
        </button>
      </div>
    </div>
  )
}