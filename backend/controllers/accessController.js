const SPDFFile = require('../models/SPDFFile');
const User = require('../models/User');
const pdfMetadataService = require('../services/pdfMetadataService');

// @desc    Add users to SPDF file access list
// @route   POST /api/access/:fileId/add
// @access  Private (Owner only)
exports.addAccess = async (req, res) => {
  try {
    const { usernames, emails, phones } = req.body;

    const file = await SPDFFile.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify access'
      });
    }

    // Add new users to access lists
    if (usernames && Array.isArray(usernames)) {
      usernames.forEach(username => {
        if (username && !file.allowedUsernames.includes(username.toLowerCase())) {
          file.allowedUsernames.push(username.toLowerCase());
        }
      });
    }

    if (emails && Array.isArray(emails)) {
      emails.forEach(email => {
        if (email && !file.allowedEmails.includes(email.toLowerCase())) {
          file.allowedEmails.push(email.toLowerCase());
        }
      });
    }

    if (phones && Array.isArray(phones)) {
      phones.forEach(phone => {
        if (phone && !file.allowedPhones.includes(phone)) {
          file.allowedPhones.push(phone);
        }
      });
    }

    // Update metadata
    file.metadata.allowedUsernames = file.allowedUsernames;
    file.metadata.allowedEmails = file.allowedEmails;
    file.metadata.allowedPhones = file.allowedPhones;

    await file.save();

    // Update SPDF file metadata
    await pdfMetadataService.updateSPDFMetadata(file.filePath, file.metadata);

    res.json({
      success: true,
      message: 'Access added successfully',
      data: { 
        file: {
          id: file._id,
          allowedUsernames: file.allowedUsernames,
          allowedEmails: file.allowedEmails,
          allowedPhones: file.allowedPhones
        }
      }
    });
  } catch (error) {
    console.error('Add access error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding access',
      error: error.message
    });
  }
};

// @desc    Remove users from SPDF file access list
// @route   POST /api/access/:fileId/remove
// @access  Private (Owner only)
exports.removeAccess = async (req, res) => {
  try {
    const { usernames, emails, phones } = req.body;

    const file = await SPDFFile.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify access'
      });
    }

    // Remove users from access lists
    if (usernames && Array.isArray(usernames)) {
      file.allowedUsernames = file.allowedUsernames.filter(
        u => !usernames.map(un => un.toLowerCase()).includes(u)
      );
    }

    if (emails && Array.isArray(emails)) {
      file.allowedEmails = file.allowedEmails.filter(
        e => !emails.map(em => em.toLowerCase()).includes(e)
      );
    }

    if (phones && Array.isArray(phones)) {
      file.allowedPhones = file.allowedPhones.filter(
        p => !phones.includes(p)
      );
    }

    // Update metadata
    file.metadata.allowedUsernames = file.allowedUsernames;
    file.metadata.allowedEmails = file.allowedEmails;
    file.metadata.allowedPhones = file.allowedPhones;

    await file.save();

    // Update SPDF file metadata
    await pdfMetadataService.updateSPDFMetadata(file.filePath, file.metadata);

    res.json({
      success: true,
      message: 'Access removed successfully',
      data: { 
        file: {
          id: file._id,
          allowedUsernames: file.allowedUsernames,
          allowedEmails: file.allowedEmails,
          allowedPhones: file.allowedPhones
        }
      }
    });
  } catch (error) {
    console.error('Remove access error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing access',
      error: error.message
    });
  }
};

// @desc    Get access list for a file
// @route   GET /api/access/:fileId
// @access  Private (Owner only)
exports.getAccessList = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.fileId)
      .select('owner allowedUsernames allowedEmails allowedPhones');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view access list'
      });
    }

    res.json({
      success: true,
      data: {
        allowedUsernames: file.allowedUsernames,
        allowedEmails: file.allowedEmails,
        allowedPhones: file.allowedPhones
      }
    });
  } catch (error) {
    console.error('Get access list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching access list',
      error: error.message
    });
  }
};

// @desc    Check if user has access to a file
// @route   GET /api/access/:fileId/check
// @access  Private
exports.checkAccess = async (req, res) => {
  try {
    const file = await SPDFFile.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const hasAccess = file.hasAccess(req.user);

    res.json({
      success: true,
      data: { hasAccess }
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking access',
      error: error.message
    });
  }
};