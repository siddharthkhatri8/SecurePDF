const express4 = require('express');
const router4 = express4.Router();
const { protect: protect4 } = require('../middleware/auth');
const {
  requestOTP,
  verifyOTP,
  resendOTP
} = require('../controllers/otpController');

router4.post('/request', protect4, requestOTP);
router4.post('/verify', protect4, verifyOTP);
router4.post('/resend', protect4, resendOTP);

module.exports = router4;