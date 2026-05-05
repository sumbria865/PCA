const mongoose = require('mongoose')

const rnnModelSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },

  // Config
  pcaComponentsInput: { type: Number, default: 0 },   // 0 = auto
  varianceThreshold:  { type: Number, default: 0.85 },
  sampleSize:         { type: Number, default: 10000 },
  epochs:             { type: Number, default: 30 },
  batchSize:          { type: Number, default: 64 },
  lstmUnits:          { type: Number, default: 64 },
  dropoutRate:        { type: Number, default: 0.3 },

  // Status
  status: {
    type: String,
    enum: ['pending', 'training', 'completed', 'failed'],
    default: 'pending',
  },
  trainingProgress: { type: Number, default: 0 },
  currentEpoch:     { type: Number, default: 0 },
  liveMetrics: {
    loss:         Number,
    accuracy:     Number,
    val_loss:     Number,
    val_accuracy: Number,
  },

  // PCA info
  pcaComponents:          Number,
  pcaVarianceRatios:      [Number],
  pcaCumulativeVariance:  Number,
  pcaScreenPlot:          mongoose.Schema.Types.Mixed,
  pcaTopFeatures:         mongoose.Schema.Types.Mixed,

  // Model info
  classNames:    [String],
  nClasses:      Number,
  modelParams:   Number,
  modelSummary:  String,
  windowSize:    Number,
  windowStep:    Number,
  trainSamples:  Number,
  testSamples:   Number,

  // Results
  testAccuracy:           Number,
  macroF1:                Number,
  weightedF1:             Number,
  trainingHistory:        mongoose.Schema.Types.Mixed,
  confusionMatrix:        mongoose.Schema.Types.Mixed,
  classificationReport:   mongoose.Schema.Types.Mixed,
  scatterData:            mongoose.Schema.Types.Mixed,
  perClassAccuracy:       mongoose.Schema.Types.Mixed,

  // Logs (streamed from Python)
  logs: [String],

  errorMessage: String,
}, { timestamps: true })

module.exports = mongoose.model('RNNModel', rnnModelSchema)