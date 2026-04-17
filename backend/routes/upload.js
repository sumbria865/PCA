const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const authMiddleware = require('../middleware/auth')
const Analysis = require('../models/Analysis')

const router = express.Router()

// Multer config
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
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.zip']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Only .csv and .zip files allowed'))
  }
})

// POST /api/upload
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const { components = '2', sampleSize = '5000' } = req.body

    // Create analysis document
    const analysis = await Analysis.create({
      userId: req.user._id,
      filename: req.file.originalname,
      status: 'processing',
      components: parseInt(components),
      sampleSize: parseInt(sampleSize),
    })

    // Respond immediately
    res.status(201).json({
      analysisId: analysis._id,
      message: 'Upload successful, PCA starting...'
    })

    // Run Python in background
    runPCA(
      analysis._id.toString(),
      req.file.path,
      parseInt(components),
      parseInt(sampleSize)
    )

  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message })
  }
})

// 🔥 FIXED FUNCTION
async function runPCA(analysisId, filePath, components, sampleSize) {
  try {
    const pythonScript = path.join(__dirname, '../../python/run_pca.py')

    // ✅ Use correct Python executable for both local and production
    const pythonBin = process.env.NODE_ENV === 'production' ? 'python3' : "C:/Users/prink/AppData/Local/Programs/Python/Python313/python.exe"

    const args = [
      pythonScript,
      '--analysis-id', analysisId,
      '--file', filePath,
      '--components', String(components),
      '--sample-size', String(sampleSize),
      '--mongo-uri', process.env.MONGO_URI, // ✅ FIXED
    ]

    console.log("🚀 Starting PCA...")
    console.log("Python Path:", pythonBin)
    console.log("Args:", args)
    console.log("Mongo URI:", process.env.MONGO_URI)

    const py = spawn(pythonBin, args)

    py.stdout.on('data', (d) => {
      console.log(`[PCA ${analysisId}]`, d.toString().trim())
    })

    py.stderr.on('data', (d) => {
      console.error(`[PCA ERROR ${analysisId}]`, d.toString().trim())
    })

    py.on('close', async (code) => {
      console.log(`PCA process exited with code ${code}`)

      if (code !== 0) {
        await Analysis.findByIdAndUpdate(analysisId, {
          status: 'failed',
          errorMessage: 'Python script exited with code ' + code
        })
      }

      // Cleanup uploaded file
      try {
        fs.unlinkSync(filePath)
        console.log("🧹 File cleaned up")
      } catch (e) {
        console.log("Cleanup error:", e.message)
      }
    })

  } catch (err) {
    console.error("runPCA error:", err)
  }
}

module.exports = router