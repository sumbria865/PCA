require("dotenv").config()
const express   = require("express")
const cors      = require("cors")
const connectDB = require("./db")

const app = express()
connectDB()
app.use(cors())
app.use(express.json())
app.use("/api/auth", require("./routes"))
app.get("/health", (_, res) => res.json({ service: "auth", status: "ok" }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log("Auth service running on port " + PORT))
