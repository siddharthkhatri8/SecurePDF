const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  uploadPDF,
  uploadLocalSPDF,
  downloadSPDF,
  requestLocalOTP,
  verifyLocalOTP,
  convertToPDF,
  getMyFiles,
  getMyOwnedFiles,
  getAccessibleFiles,
  getSPDFFile,
  deleteSPDFFile,
  getFileLogs
} = require('../controllers/spdfController');

// Upload original PDF and convert to SPDF
router.post('/upload', protect, upload.single('pdf'), handleMulterError, uploadPDF);

// Upload local SPDF file to open in viewer (old method - direct access)
router.post('/upload-local', protect, upload.single('spdf'), handleMulterError, uploadLocalSPDF);

// NEW: Request OTP for local SPDF file
router.post('/request-local-otp', protect, upload.single('spdf'), handleMulterError, requestLocalOTP);

// NEW: Verify OTP for local SPDF file
router.post('/verify-local-otp', protect, verifyLocalOTP);

// Download SPDF file
router.get('/:id/download', protect, downloadSPDF);

// NEW: Convert SPDF back to PDF (owner only)
router.post('/:id/convert-to-pdf', protect, convertToPDF);

// Get user's files
router.get('/my-files', protect, getMyFiles);

// NEW: Get ONLY owned files (for dashboard)
router.get('/my-owned-files', protect, getMyOwnedFiles);

// Get accessible files (owned + shared)
router.get('/accessible-files', protect, getAccessibleFiles);

// File operations
router.get('/:id', protect, getSPDFFile);
router.delete('/:id', protect, deleteSPDFFile);
router.get('/:id/logs', protect, getFileLogs);

module.exports = router;