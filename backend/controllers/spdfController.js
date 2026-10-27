const SPDFFile = require('../models/SPDFFile');
const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const pdfMetadataService = require('../services/pdfMetadataService');
const otpService = require('../services/otpService');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Temporary storage for OTP requests (in production, use Redis)
const tempOTPStore = new Map();

// @desc    Upload and convert PDF to SPDF
// @route   POST /api/spdf/upload
// @access  Private
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    const allowedUsernames = req.body.allowedUsernames 
      ? JSON.parse(req.body.allowedUsernames) 
      : [];
    const allowedEmails = req.body.allowedEmails 
      ? JSON.parse(req.body.allowedEmails) 
      : [];
    const allowedPhones = req.body.allowedPhones 
      ? JSON.parse(req.body.allowedPhones) 
      : [];

    if (allowedUsernames.length === 0 && allowedEmails.length === 0 && allowedPhones.length === 0) {
      allowedUsernames.push(req.user.username);
      allowedEmails.push(req.user.email);
      allowedPhones.push(req.user.phone);
    }

    const metadata = {
      originalFilename: req.file.originalname,
      ownerUsername: req.user.username,
      allowedUsernames,
      allowedEmails,
      allowedPhones,
      createdAt: new Date(),
      securedBy: 'SPDF System'
    };

    const result = await pdfMetadataService.convertToSPDF(req.file.path, metadata);

    const spdfFile = await SPDFFile.create({
      originalFilename: req.file.originalname,
      spdfFilename: result.spdfFilename,
      filePath: result.spdfPath,
      fileSize: req.file.size,
      owner: req.user._id,
      ownerUsername: req.user.username,
      allowedUsernames,
      allowedEmails,
      allowedPhones,
      metadata: result.metadata
    });

    await AccessLog.logAccess({
      user: req.user._id,
      spdfFile: spdfFile._id,
      action: 'upload',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'PDF converted to SPDF successfully',
      data: { spdfFile }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => 
        console.error('Failed to delete uploaded file:', err)
      );
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading PDF',
      error: error.message
    });
  }
};

// @desc    Upload local SPDF file to open in viewer
// @route   POST /api/spdf/upload-local
// @access  Private
exports.uploadLocalSPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an SPDF file'
      });
    }

    if (!req.file.originalname.toLowerCase().endsWith('.spdf')) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Only .spdf files are allowed'
      });
    }

    const metadataResult = await pdfMetadataService.readSPDFMetadata(req.file.path);

    if (!metadataResult.valid) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid SPDF file: ' + metadataResult.message
      });
    }

    const accessCheck = await pdfMetadataService.checkSPDFAccess(req.file.path, req.user);

    if (!accessCheck.hasAccess) {
      await fs.unlink(req.file.path);
      
      await AccessLog.logAccess({
        user: req.user._id,
        action: 'access_denied',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { 
          reason: accessCheck.reason,
          filename: req.file.originalname
        }
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: ' + accessCheck.reason,
        metadata: metadataResult.metadata
      });
    }

    const fileBuffer = await pdfMetadataService.readSPDF(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');

    await fs.unlink(req.file.path);

    await AccessLog.logAccess({
      user: req.user._id,
      action: 'view',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { 
        filename: req.file.originalname,
        accessType: 'local-upload',
        reason: accessCheck.reason
      }
    });

    res.json({
      success: true,
      message: 'SPDF file validated and loaded successfully',
      data: {
        filename: req.file.originalname,
        metadata: metadataResult.metadata,
        title: metadataResult.title,
        pageCount: metadataResult.pageCount,
        fileData: fileBase64,
        accessReason: accessCheck.reason
      }
    });
  } catch (error) {
    console.error('Upload local SPDF error:', error);
    
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => 
        console.error('Failed to delete uploaded file:', err)
      );
    }

    res.status(500).json({
      success: false,
      message: 'Error processing SPDF file',
      error: error.message
    });
  }
};

// @desc    Request OTP for local SPDF file
// @route   POST /api/spdf/request-local-otp
// @access  Private
exports.requestLocalOTP = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an SPDF file'
      });
    }

    const { contact, method } = req.body;

    if (!contact || !method) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Contact information and method are required'
      });
    }

    const metadataResult = await pdfMetadataService.readSPDFMetadata(req.file.path);

    if (!metadataResult.valid) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid SPDF file: ' + metadataResult.message
      });
    }

    const { metadata } = metadataResult;
    let hasAccess = false;
    
    if (method === 'email') {
      hasAccess = metadata.allowedEmails.includes(contact.toLowerCase());
    } else if (method === 'phone') {
      hasAccess = metadata.allowedPhones.includes(contact);
    }

    if (!hasAccess) {
      await fs.unlink(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your contact information is not authorized for this file.'
      });
    }

    const tempId = crypto.randomBytes(16).toString('hex');
    const otp = otpService.generateOTP(6);
    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    tempOTPStore.set(tempId, {
      otp: otp,
      filePath: req.file.path,
      contact: contact,
      method: method,
      metadata: metadata,
      expiresAt: expiresAt,
      attempts: 0
    });

    try {
      if (method === 'email') {
        await otpService.sendEmailOTP(contact, otp, expiryMinutes);
      } else {
        await otpService.sendPhoneOTP(contact, otp, expiryMinutes);
      }
    } catch (sendError) {
      console.log('⚠️  OTP send error:', sendError.message);
      console.log(`🔑 OTP for ${method} ${contact}: ${otp}`);
    }

    setTimeout(() => {
      if (tempOTPStore.has(tempId)) {
        const data = tempOTPStore.get(tempId);
        fs.unlink(data.filePath).catch(() => {});
        tempOTPStore.delete(tempId);
      }
    }, expiryMinutes * 60 * 1000);

    res.json({
      success: true,
      message: `OTP sent to ${method}`,
      data: {
        tempId: tempId,
        expiresAt: expiresAt
      }
    });
  } catch (error) {
    console.error('Request local OTP error:', error);
    
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: error.message
    });
  }
};

// @desc    Verify OTP for local SPDF file
// @route   POST /api/spdf/verify-local-otp
// @access  Private
exports.verifyLocalOTP = async (req, res) => {
  try {
    const { tempId, otp } = req.body;

    if (!tempId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Temporary ID and OTP are required'
      });
    }

    const storedData = tempOTPStore.get(tempId);

    if (!storedData) {
      return res.status(404).json({
        success: false,
        message: 'OTP request not found or expired'
      });
    }

    if (new Date() > storedData.expiresAt) {
      await fs.unlink(storedData.filePath).catch(() => {});
      tempOTPStore.delete(tempId);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    if (storedData.attempts >= 3) {
      await fs.unlink(storedData.filePath).catch(() => {});
      tempOTPStore.delete(tempId);
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded'
      });
    }

    if (otp !== storedData.otp) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const fileBuffer = await pdfMetadataService.readSPDF(storedData.filePath);
    const fileBase64 = fileBuffer.toString('base64');

    await AccessLog.logAccess({
      user: req.user._id,
      action: 'view',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        filename: path.basename(storedData.filePath),
        accessType: 'local-spdf-otp',
        contact: storedData.contact
      }
    });

    await fs.unlink(storedData.filePath).catch(() => {});
    tempOTPStore.delete(tempId);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        fileData: fileBase64,
        metadata: storedData.metadata
      }
    });
  } catch (error) {
    console.error('Verify local OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
};

// @desc    Download SPDF file
// @route   GET /api/spdf/:id/download
// @access  Private
exports.downloadSPDF = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!file.hasAccess(req.user)) {
      await AccessLog.logAccess({
        user: req.user._id,
        spdfFile: file._id,
        action: 'access_denied',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { action: 'download' }
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this file'
      });
    }

    await AccessLog.logAccess({
      user: req.user._id,
      spdfFile: file._id,
      action: 'download',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.spdfFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileBuffer = await pdfMetadataService.readSPDF(file.filePath);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};

// @desc    Convert SPDF back to normal PDF (Owner only)
// @route   POST /api/spdf/:id/convert-to-pdf
// @access  Private (Owner only)
exports.convertToPDF = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the file owner can convert SPDF to PDF'
      });
    }

    const spdfBuffer = await pdfMetadataService.readSPDF(file.filePath);
    const pdfFilename = file.originalFilename;

    await AccessLog.logAccess({
      user: req.user._id,
      spdfFile: file._id,
      action: 'download',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { action: 'convert-to-pdf' }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.send(spdfBuffer);

  } catch (error) {
    console.error('Convert to PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting file',
      error: error.message
    });
  }
};

// @desc    Get all SPDF files for logged-in user
// @route   GET /api/spdf/my-files
// @access  Private
exports.getMyFiles = async (req, res) => {
  try {
    const files = await SPDFFile.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .select('-filePath');

    res.json({
      success: true,
      count: files.length,
      data: { files }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
};

// @desc    Get ONLY files owned by user (for dashboard)
// @route   GET /api/spdf/my-owned-files
// @access  Private
exports.getMyOwnedFiles = async (req, res) => {
  try {
    const files = await SPDFFile.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .select('-filePath');

    res.json({
      success: true,
      count: files.length,
      data: { files }
    });
  } catch (error) {
    console.error('Get owned files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
};

// @desc    Get files user has access to
// @route   GET /api/spdf/accessible-files
// @access  Private
exports.getAccessibleFiles = async (req, res) => {
  try {
    const files = await SPDFFile.find({
      $or: [
        { owner: req.user._id },
        { allowedUsernames: req.user.username.toLowerCase() },
        { allowedEmails: req.user.email.toLowerCase() },
        { allowedPhones: req.user.phone }
      ]
    })
    .populate('owner', 'username email')
    .sort({ createdAt: -1 })
    .select('-filePath');

    res.json({
      success: true,
      count: files.length,
      data: { files }
    });
  } catch (error) {
    console.error('Get accessible files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accessible files',
      error: error.message
    });
  }
};

// @desc    Get single SPDF file details
// @route   GET /api/spdf/:id
// @access  Private
exports.getSPDFFile = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.id)
      .populate('owner', 'username email');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!file.hasAccess(req.user)) {
      await AccessLog.logAccess({
        user: req.user._id,
        spdfFile: file._id,
        action: 'access_denied',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this file'
      });
    }

    res.json({
      success: true,
      data: { file }
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file',
      error: error.message
    });
  }
};

// @desc    Delete SPDF file
// @route   DELETE /api/spdf/:id
// @access  Private (Owner only)
exports.deleteSPDFFile = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    await pdfMetadataService.deleteSPDF(file.filePath);
    await SPDFFile.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};

// @desc    Get file access logs
// @route   GET /api/spdf/:id/logs
// @access  Private (Owner only)
exports.getFileLogs = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view logs'
      });
    }

    const logs = await AccessLog.getRecentAccess(req.params.id, 50);

    res.json({
      success: true,
      count: logs.length,
      data: { logs }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      error: error.message
    });
  }
};