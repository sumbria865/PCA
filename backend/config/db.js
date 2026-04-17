const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'pca_insight',
    })
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message)
    console.log('⚠️  Server will continue without database connection for development')
    // process.exit(1)  // Commented out to prevent crash
  }
}

module.exports = connectDB