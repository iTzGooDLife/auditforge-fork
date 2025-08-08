var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const LogSchema = new Schema(
  {
    //Log ID
    id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'logs',
  },
);

LogSchema.index({ username: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ endpoint: 1, method: 1 });
LogSchema.index({ timestamp: -1 });

// Create log
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
            message: 'ID already exists',
          });
        else reject(err);
      });
  });
};

// Get Last Hundred Logs
LogSchema.statics.getLastHundredLogs = () => {
  return new Promise((resolve, reject) => {
    var query = Log.find({});
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

// Get registers with filters
LogSchema.statics.getLogsFiltered = (filters, options) => {
  try {
    const {
      username,
      userId,
      role,
      endpoint,
      method,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      sortBy = 'timestamp',
      sortOrder = -1,
    } = { ...filters, ...options };

    const query = {};

    if (username) query.username = new RegExp(username, 'i');
    if (userId) query.userId = userId;
    if (role) query.role = role;
    if (endpoint) query.endpoint = new RegExp(endpoint, 'i');
    if (method) query.method = method;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder;

    return Log.find(query).sort(sort).limit(limit).skip(skip).lean();
  } catch (error) {
    console.error('Error getting logs:', error);
    throw error;
  }
};

var Log = mongoose.model('Log', LogSchema);
module.exports = Log;
