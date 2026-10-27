const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spdfFile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SPDFFile',
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true
  },
  verifiedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries and auto-expiry
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpRequestSchema.index({ user: 1, spdfFile: 1, createdAt: -1 });

// Hash OTP before saving
otpRequestSchema.pre('save', async function(next) {
  if (!this.isModified('otp')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

// Method to verify OTP
otpRequestSchema.methods.verifyOTP = async function(enteredOTP) {
  // Check if expired
  if (new Date() > this.expiresAt) {
    return { success: false, message: 'OTP has expired' };
  }

  // Check if already verified
  if (this.verified) {
    return { success: false, message: 'OTP already used' };
  }

  // Check attempts
  if (this.attempts >= this.maxAttempts) {
    return { success: false, message: 'Maximum verification attempts exceeded' };
  }

  // Increment attempts
  this.attempts += 1;
  await this.save();

  // Verify OTP
  const isMatch = await bcrypt.compare(enteredOTP, this.otp);
  
  if (isMatch) {
    this.verified = true;
    this.verifiedAt = new Date();
    await this.save();
    return { success: true, message: 'OTP verified successfully' };
  }

  return { success: false, message: 'Invalid OTP' };
};

// Static method to cleanup expired OTPs (optional manual cleanup)
otpRequestSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

module.exports = mongoose.model('OTPRequest', otpRequestSchema);