const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Generate JWT token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Optional: Verify user owns the resource
exports.authorizeOwner = (resourceField = 'owner') => {
  return (req, res, next) => {
    const resource = req.resource; // Should be set by previous middleware
    
    if (!resource) {
      return res.status(500).json({
        success: false,
        message: 'Resource not found for authorization'
      });
    }

    const ownerId = resource[resourceField]?.toString() || resource[resourceField];
    const userId = req.user._id.toString();

    if (ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};