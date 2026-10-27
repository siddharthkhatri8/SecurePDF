const SPDFFile = require('../models/SPDFFile');
const AccessLog = require('../models/AccessLog');
const otpService = require('../services/otpService');
const pdfMetadataService = require('../services/pdfMetadataService');

// @desc    Request OTP for file access (ALWAYS REQUIRED)
// @route   POST /api/otp/request
// @access  Private
exports.requestOTP = async (req, res) => {
  try {
    const { fileId, method } = req.body;

    if (!fileId || !method) {
      return res.status(400).json({
        success: false,
        message: 'File ID and method (email/phone) are required'
      });
    }

    if (!['email', 'phone'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Method must be either "email" or "phone"'
      });
    }

    const file = await SPDFFile.findById(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has access
    if (!file.hasAccess(req.user)) {
      await AccessLog.logAccess({
        user: req.user._id,
        spdfFile: file._id,
        action: 'otp_request',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'No access' }
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this file'
      });
    }

    // Determine recipient
    const recipient = method === 'email' ? req.user.email : req.user.phone;

    // Send OTP
    const result = await otpService.createAndSendOTP(
      req.user._id,
      fileId,
      method,
      recipient
    );

    // Log OTP request
    await AccessLog.logAccess({
      user: req.user._id,
      spdfFile: file._id,
      action: 'otp_request',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { method }
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
        method,
        recipient: method === 'email' 
          ? recipient.replace(/(.{2})(.*)(@.*)/, '$1***$3')
          : recipient.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2')
      }
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message
    });
  }
};

// @desc    Verify OTP and get DECRYPTED file access
// @route   POST /api/otp/verify
// @access  Private
exports.verifyOTP = async (req, res) => {
  try {
    const { otpId, otp } = req.body;

    if (!otpId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP ID and OTP code are required'
      });
    }

    // Verify OTP
    const result = await otpService.verifyOTP(otpId, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const file = result.spdfFile;

    // Update file access statistics
    await SPDFFile.findByIdAndUpdate(file._id, {
      $inc: { accessCount: 1 },
      lastAccessedAt: new Date()
    });

    // Get full file details
    const fullFile = await SPDFFile.findById(file._id);

    // DECRYPT the SPDF file
    const { pdfBuffer, metadata } = await pdfMetadataService.decryptAndReadSPDF(fullFile.filePath);

    // Log successful verification and decryption
    await AccessLog.logAccess({
      user: req.user._id,
      spdfFile: file._id,
      action: 'view',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        decrypted: true,
        method: 'otp-verified'
      }
    });

    // Convert decrypted PDF to base64
    const fileBase64 = pdfBuffer.toString('base64');

    res.json({
      success: true,
      message: 'OTP verified successfully - File decrypted',
      data: {
        file: {
          id: file._id,
          filename: fullFile.originalFilename,
          owner: fullFile.ownerUsername,
          pageCount: metadata.pageCount
        },
        fileData: fileBase64,
        metadata: metadata,
        accessToken: otpId
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (req.body.otpId) {
      await AccessLog.logAccess({
        user: req.user._id,
        spdfFile: null,
        action: 'otp_verify',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { error: error.message }
      }).catch(err => console.error('Failed to log access:', err));
    }

    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/otp/resend
// @access  Private
exports.resendOTP = async (req, res) => {
  try {
    const { otpId } = req.body;

    if (!otpId) {
      return res.status(400).json({
        success: false,
        message: 'OTP ID is required'
      });
    }

    const result = await otpService.resendOTP(otpId);

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpId: result.otpId,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
      error: error.message
    });
  }
};