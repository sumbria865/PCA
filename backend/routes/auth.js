const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' })

    const existing = await User.findOne({ email })
    if (existing)
      return res.status(400).json({ message: 'Email already registered' })

    const user = await User.create({ name, email, password })
    const token = signToken(user._id)

    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await user.comparePassword(password)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = signToken(user._id)
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { _id: req.user._id, name: req.user.name, email: req.user.email } })
})

module.exports = router