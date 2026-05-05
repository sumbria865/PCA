require("dotenv").config()
const express   = require("express")
const cors      = require("cors")
const path      = require("path")
const fs        = require("fs")
const connectDB = require("./db")

const app = express()
connectDB()
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

app.use("/api/upload",   require("./routes/upload"))
app.use("/api/analysis", require("./routes/analysis"))
app.use("/api/rnn",      require("./routes/rnn"))
app.get("/health", (_, res) => res.json({ service: "analysis", status: "ok" }))

const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log("Analysis service running on port " + PORT))
