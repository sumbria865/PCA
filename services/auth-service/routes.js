const express = require("express")
const jwt     = require("jsonwebtoken")
const User    = require("./User")
const router  = express.Router()

const signToken = (id) =>
  jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "7d" })

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" })
    const existing = await User.findOne({ email })
    if (existing)
      return res.status(400).json({ message: "Email already registered" })
    const user = await User.create({ name, email, password })
    res.status(201).json({
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email }
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: "Invalid credentials" })
    const valid = await user.comparePassword(password)
    if (!valid) return res.status(401).json({ message: "Invalid credentials" })
    res.json({
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email }
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get("/me", require("./middleware"), (req, res) => {
  res.json({ user: { _id: req.user._id, name: req.user.name, email: req.user.email } })
})

module.exports = router
