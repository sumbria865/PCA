require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDB = require('./config/db')

const app = express()

// Connect DB
connectDB()

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true })) // updated for dev ports
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/upload',   require('./routes/upload'))
app.use('/api/analysis', require('./routes/analysis'))
app.use('/api/rnn',      require('./routes/rnn'))

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

// Production: serve React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')))
}

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))