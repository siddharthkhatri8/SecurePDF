const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - allow PDF and SPDF files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // For regular upload endpoint - only PDF
  if (req.path === '/upload') {
    if (file.mimetype === 'application/pdf' && ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for upload'), false);
    }
  } 
  // For local SPDF upload endpoint - only SPDF
  else if (req.path === '/upload-local') {
    if (ext === '.spdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .spdf files are allowed'), false);
    }
  } 
  // Default - allow both
  else {
    if ((file.mimetype === 'application/pdf' && ext === '.pdf') || ext === '.spdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and SPDF files are allowed'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};