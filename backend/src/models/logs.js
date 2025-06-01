var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const LogSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  responseStatus: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'logs'
});


LogSchema.index({ username: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ endpoint: 1, method: 1 });
LogSchema.index({ timestamp: -1 });


var Log = mongoose.model('Log', LogSchema);
module.exports = Log;
