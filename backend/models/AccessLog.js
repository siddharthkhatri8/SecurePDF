const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spdfFile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SPDFFile'
  },
  action: {
    type: String,
    enum: ['view', 'upload', 'download', 'otp_request', 'otp_verify', 'access_denied', 'delete', 'update'],
    required: true
  },
  success: {
    type: Boolean,
    default: true
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
accessLogSchema.index({ user: 1, timestamp: -1 });
accessLogSchema.index({ spdfFile: 1, timestamp: -1 });
accessLogSchema.index({ action: 1, timestamp: -1 });

// Static method to log access
accessLogSchema.statics.logAccess = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging access:', error);
    // Don't throw - logging should not break the main flow
  }
};

// Static method to get recent access for a file
accessLogSchema.statics.getRecentAccess = async function(spdfFileId, limit = 10) {
  return this.find({ spdfFile: spdfFileId })
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get user's access history
accessLogSchema.statics.getUserHistory = async function(userId, limit = 50) {
  return this.find({ user: userId })
    .populate('spdfFile', 'originalFilename ownerUsername')
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AccessLog', accessLogSchema);