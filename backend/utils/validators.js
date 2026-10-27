const { body, param, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User Registration Validation
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Phone number must be between 10 and 15 digits'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*[0-9])|(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage('Password must contain at least 2 of: uppercase, lowercase, numbers'),
  
  validate
];

// User Login Validation
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email, username, or phone is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate
];

// File Upload Validation
const validateFileUpload = [
  body('allowedUsernames')
    .optional()
    .isJSON()
    .withMessage('allowedUsernames must be a valid JSON array'),
  
  body('allowedEmails')
    .optional()
    .isJSON()
    .withMessage('allowedEmails must be a valid JSON array'),
  
  body('allowedPhones')
    .optional()
    .isJSON()
    .withMessage('allowedPhones must be a valid JSON array'),
  
  validate
];

// Access Control Validation
const validateAccessControl = [
  param('fileId')
    .isMongoId()
    .withMessage('Invalid file ID'),
  
  body('usernames')
    .optional()
    .isArray()
    .withMessage('usernames must be an array'),
  
  body('emails')
    .optional()
    .isArray()
    .withMessage('emails must be an array'),
  
  body('phones')
    .optional()
    .isArray()
    .withMessage('phones must be an array'),
  
  validate
];

// OTP Request Validation
const validateOTPRequest = [
  body('fileId')
    .isMongoId()
    .withMessage('Invalid file ID'),
  
  body('method')
    .isIn(['email', 'phone'])
    .withMessage('Method must be either email or phone'),
  
  validate
];

// OTP Verification Validation
const validateOTPVerification = [
  body('otpId')
    .isMongoId()
    .withMessage('Invalid OTP ID'),
  
  body('otp')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('OTP must be a 6-digit number'),
  
  validate
];

// MongoDB ObjectId Validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  validate
];

// Profile Update Validation
const validateProfileUpdate = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Phone number must be between 10 and 15 digits'),
  
  validate
];

// Password Change Validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*[0-9])|(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage('Password must contain at least 2 of: uppercase, lowercase, numbers'),
  
  validate
];

// Custom validation functions
const validators = {
  // Check if email is valid
  isValidEmail: (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  },

  // Check if phone is valid
  isValidPhone: (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  },

  // Check if username is valid
  isValidUsername: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  },

  // Sanitize input to prevent XSS
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '')
      .trim();
  },

  // Validate file size
  isValidFileSize: (size, maxSize = 10 * 1024 * 1024) => {
    return size <= maxSize;
  },

  // Validate file type
  isValidFileType: (mimetype, allowedTypes = ['application/pdf']) => {
    return allowedTypes.includes(mimetype);
  },

  // Validate array of emails
  validateEmailArray: (emails) => {
    if (!Array.isArray(emails)) return false;
    return emails.every(email => validators.isValidEmail(email));
  },

  // Validate array of phones
  validatePhoneArray: (phones) => {
    if (!Array.isArray(phones)) return false;
    return phones.every(phone => validators.isValidPhone(phone));
  },

  // Validate array of usernames
  validateUsernameArray: (usernames) => {
    if (!Array.isArray(usernames)) return false;
    return usernames.every(username => validators.isValidUsername(username));
  }
};

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateFileUpload,
  validateAccessControl,
  validateOTPRequest,
  validateOTPVerification,
  validateObjectId,
  validateProfileUpdate,
  validatePasswordChange,
  validators
};