const mongoose = require('mongoose');

const spdfFileSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true
  },
  spdfFilename: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerUsername: {
    type: String,
    required: true
  },
  // Access control lists
  allowedUsernames: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  allowedEmails: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  allowedPhones: [{
    type: String,
    trim: true
  }],
  // Metadata embedded in PDF
  metadata: {
    ownerUsername: String,
    allowedUsernames: [String],
    allowedEmails: [String],
    allowedPhones: [String],
    createdAt: Date,
    securedBy: {
      type: String,
      default: 'SPDF System'
    }
  },
  // Access statistics
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
spdfFileSchema.index({ owner: 1, createdAt: -1 });
spdfFileSchema.index({ ownerUsername: 1 });
spdfFileSchema.index({ allowedUsernames: 1 });
spdfFileSchema.index({ allowedEmails: 1 });
spdfFileSchema.index({ allowedPhones: 1 });

// Method to check if user has access
// spdfFileSchema.methods.hasAccess = function(user) {
  // Owner always has access
  // if (this.owner.toString() === user._id.toString()) {
  //   return true;
  // }

  // Check if user is in allowed lists
//   const usernameMatch = this.allowedUsernames.includes(user.username.toLowerCase());
//   const emailMatch = this.allowedEmails.includes(user.email.toLowerCase());
//   const phoneMatch = this.allowedPhones.includes(user.phone);

//   return usernameMatch || emailMatch || phoneMatch;
// };

spdfFileSchema.methods.hasAccess = function(user) {
  const isOwner = this.owner.toString() === user._id.toString();
  const usernameMatch = this.allowedUsernames.includes((user.username || "").toLowerCase());
  const emailMatch = this.allowedEmails.includes((user.email || "").toLowerCase());
  const phoneMatch = this.allowedPhones.includes(user.phone);

  console.log("========== ACCESS CHECK ==========");
  console.log("Owner ID:", this.owner.toString());
  console.log("Logged User ID:", user._id.toString());

  console.log("Allowed Usernames:", this.allowedUsernames);
  console.log("User Username:", user.username);

  console.log("Allowed Emails:", this.allowedEmails);
  console.log("User Email:", user.email);

  console.log("Allowed Phones:", this.allowedPhones);
  console.log("User Phone:", user.phone);

  console.log({
    isOwner,
    usernameMatch,
    emailMatch,
    phoneMatch
  });

  return isOwner || usernameMatch || emailMatch || phoneMatch;
};

// Method to add user access
spdfFileSchema.methods.addAccess = function(username, email, phone) {
  if (username && !this.allowedUsernames.includes(username.toLowerCase())) {
    this.allowedUsernames.push(username.toLowerCase());
  }
  if (email && !this.allowedEmails.includes(email.toLowerCase())) {
    this.allowedEmails.push(email.toLowerCase());
  }
  if (phone && !this.allowedPhones.includes(phone)) {
    this.allowedPhones.push(phone);
  }
};

// Method to remove user access
spdfFileSchema.methods.removeAccess = function(username, email, phone) {
  if (username) {
    this.allowedUsernames = this.allowedUsernames.filter(u => u !== username.toLowerCase());
  }
  if (email) {
    this.allowedEmails = this.allowedEmails.filter(e => e !== email.toLowerCase());
  }
  if (phone) {
    this.allowedPhones = this.allowedPhones.filter(p => p !== phone);
  }
};

module.exports = mongoose.model('SPDFFile', spdfFileSchema);