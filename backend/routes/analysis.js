const express = require('express')
const authMiddleware = require('../middleware/auth')
const Analysis = require('../models/Analysis')

const router = express.Router()

// ✅ Default pipeline (fallback fix)
const DEFAULT_STEPS = {
  loaded: 'pending',
  normalized: 'pending',
  covariance: 'pending',
  eigenvalues: 'pending',
  selected: 'pending',
  transformed: 'pending'
}

// GET /api/analysis/stats  — dashboard summary
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const total = await Analysis.countDocuments({ userId: req.user._id })
    const last = await Analysis.findOne(
      { userId: req.user._id, status: 'completed' },
      null,
      { sort: { createdAt: -1 } }
    )

    res.json({
      total,
      lastDataset: last?.filename || null,
      lastVariance: last?.result?.cumulativeVariance?.toFixed(1) || null,
      lastReduced: last
        ? `${last.sampleSize?.toLocaleString()} rows · ${last.components}D`
        : null,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/analysis/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const list = await Analysis.find(
      { userId: req.user._id },
      'filename status components sampleSize createdAt result.cumulativeVariance'
    ).sort({ createdAt: -1 }).limit(50)

    res.json(
      list.map(a => ({
        _id: a._id,
        filename: a.filename,
        status: a.status,
        components: a.components,
        sampleSize: a.sampleSize,
        createdAt: a.createdAt,
        cumulativeVariance: a.result?.cumulativeVariance?.toFixed(1) || null,
      }))
    )
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/analysis/:id/status
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const a = await Analysis.findOne(
      { _id: req.params.id, userId: req.user._id },
      'status errorMessage'
    )

    if (!a) return res.status(404).json({ message: 'Not found' })

    res.json({ status: a.status, error: a.errorMessage })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ✅ FIXED: GET /api/analysis/:id/pipeline-status
router.get('/:id/pipeline-status', authMiddleware, async (req, res) => {
  try {
    const a = await Analysis.findOne(
      { _id: req.params.id, userId: req.user._id },
      'status pipelineSteps pipelineDetails'
    )

    if (!a) return res.status(404).json({ message: 'Not found' })

    // ✅ CRITICAL FIX: fallback + merge
    const steps = { ...DEFAULT_STEPS, ...(a.pipelineSteps || {}) }
    const details = a.pipelineDetails || {}

    res.json({
      status: a.status,
      steps,
      details,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/analysis/:id/result
router.get('/:id/result', authMiddleware, async (req, res) => {
  try {
    const a = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!a) return res.status(404).json({ message: 'Not found' })

    if (a.status !== 'completed') {
      return res.status(400).json({
        message: 'Analysis not complete yet',
        status: a.status
      })
    }

    res.json({
      _id: a._id,
      filename: a.filename,
      components: a.components,
      sampleSize: a.sampleSize,
      varianceRatios: a.result?.varianceRatios || [],
      cumulativeVariance: a.result?.cumulativeVariance || 0,
      screePlot: a.result?.screePlot || [],
      topFeatures: a.result?.topFeatures || [],
      scatterData: a.result?.scatterData || [],
      transformedPreview: a.result?.transformedPreview || [],
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/analysis/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const a = await Analysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!a) return res.status(404).json({ message: 'Not found' })

    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router