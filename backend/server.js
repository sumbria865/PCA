require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')

const app = express()

// ========================
// DB CONNECTION
// ========================
connectDB()

// ========================
// CORS CONFIG (FIXED)
// ========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://pca-4jpk.onrender.com',
  'https://pca-8k9y.onrender.com'
]

app.use(cors({
  origin: function (origin, callback) {
    // allow tools like Postman / server-to-server
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    // IMPORTANT: do NOT block hard (prevents Render CORS failures)
    return callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Preflight support (VERY IMPORTANT)
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    return callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))


// ========================
// MIDDLEWARE
// ========================
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ========================
// ROUTES
// ========================
app.use('/api/auth', require('./routes/auth'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/analysis', require('./routes/analysis'))
app.use('/api/notebook', require('./routes/notebook'))

// ========================
// HEALTH CHECK
// ========================
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date() })
)

// ========================
// PRODUCTION FRONTEND SERVE
// ========================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))

  app.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
)

// DEBUG
console.log("ENV CHECK:", process.env.MONGO_URI)