const mongoose = require('mongoose')

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  components: { type: Number, default: 2 },
  sampleSize: { type: Number, default: 5000 },

  // Pipeline step statuses
  pipelineSteps: {
    loaded:      { type: String, enum: ['pending','running','done','error'], default: 'pending' },
    normalized:  { type: String, enum: ['pending','running','done','error'], default: 'pending' },
    covariance:  { type: String, enum: ['pending','running','done','error'], default: 'pending' },
    eigenvalues: { type: String, enum: ['pending','running','done','error'], default: 'pending' },
    selected:    { type: String, enum: ['pending','running','done','error'], default: 'pending' },
    transformed: { type: String, enum: ['pending','running','done','error'], default: 'pending' },
  },
  pipelineDetails: {
    loaded:      String,
    normalized:  String,
    covariance:  String,
    eigenvalues: String,
    selected:    String,
    transformed: String,
  },

  // PCA output stored in DB
  result: {
    varianceRatios:      [Number],
    cumulativeVariance:  Number,
    screePlot:           [{ component: String, variance: Number }],
    topFeatures:         [{ feature: String, loading: Number }],
    scatterData:         mongoose.Schema.Types.Mixed,   // array of { x, y, activity, subject }
    transformedPreview:  mongoose.Schema.Types.Mixed,   // first 10 rows
  },

  errorMessage: String,
}, { timestamps: true })

module.exports = mongoose.model('Analysis', analysisSchema)