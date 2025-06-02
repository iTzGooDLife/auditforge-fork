var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const LogSchema = new Schema({
  id: {
    type: String,
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

// Create log
// TODO: change error message
LogSchema.statics.create = log => {
  return new Promise((resolve, reject) => {
    var query = new Log(log);
    query
      .save(log)
      .then(row => {
        resolve({ _id: row._id });
      })
      .catch(err => {
        if (err.code === 11000)
          reject({
            fn: 'BadParameters',
            message: 'Error',
          });
        else reject(err);
      });
  });
};


LogSchema.statics.getLastHundredLogs = () => {
  return new Promise((resolve, reject) => {
    var query = Log.find({}, 'username role endpoint method responseStatus timestamp');
    query
      .sort({ timestamp: -1 })
      .limit(100)
      .exec()
      .then(rows => {
        resolve(rows);
      })
      .catch(err => {
        reject(err);
      });
  });
};

var Log = mongoose.model('Log', LogSchema);
module.exports = Log;
