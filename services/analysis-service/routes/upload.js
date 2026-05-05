require('dotenv').config()
const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const authMiddleware = require('../middleware/auth')
const Analysis = require('../models/Analysis')

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.zip']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Only .csv and .zip files allowed'))
  }
})

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const { components = '2', sampleSize = '5000' } = req.body

    const analysis = await Analysis.create({
      userId: req.user._id,
      filename: req.file.originalname,
      status: 'processing',
      components: parseInt(components),
      sampleSize: parseInt(sampleSize),
    })

    res.status(201).json({ analysisId: analysis._id, message: 'Upload successful, PCA starting...' })

    runPCA(analysis._id.toString(), req.file.path, parseInt(components), parseInt(sampleSize))

  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message })
  }
})

function runPCA(analysisId, filePath, components, sampleSize) {
  const mongoUri = process.env.MONGODB_URI
  const pythonScript = path.join(__dirname, '../../python/run_pca.py')
  const pythonBin = process.env.PYTHON_PATH || 'python'

  console.log('Python Path:', pythonBin)
  console.log('Mongo URI:', mongoUri ? 'FOUND' : 'MISSING!')

  const args = [
    pythonScript,
    '--analysis-id', analysisId,
    '--file', filePath,
    '--components', String(components),
    '--sample-size', String(sampleSize),
    '--mongo-uri', mongoUri,
  ]

  const py = spawn(pythonBin, args)
  py.stdout.on('data', (d) => console.log(`[PCA ${analysisId}]`, d.toString().trim()))
  py.stderr.on('data', (d) => console.error(`[PCA ERR ${analysisId}]`, d.toString().trim()))

  py.on('close', async (code) => {
    if (code !== 0) {
      await Analysis.findByIdAndUpdate(analysisId, {
        status: 'failed',
        errorMessage: 'Python script exited with code ' + code
      })
    }
    try { fs.unlinkSync(filePath) } catch {}
  })
}

module.exports = router