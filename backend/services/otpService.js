const crypto = require('crypto');
const OTPRequest = require('../models/OTPRequest');
const emailService = require('./emailService');

class OTPService {
  /**
   * Generate random OTP
   */
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  /**
   * Create and send OTP
   */
  async createAndSendOTP(userId, spdfFileId, method, recipient) {
    try {
      // Generate OTP
      const otp = this.generateOTP(parseInt(process.env.OTP_LENGTH) || 6);
      
      // Calculate expiry time
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Create OTP request (will be hashed by pre-save hook)
      const otpRequest = new OTPRequest({
        user: userId,
        spdfFile: spdfFileId,
        otp: otp,
        method,
        recipient,
        expiresAt
      });

      await otpRequest.save();

      // Send OTP based on method
      try {
        if (method === 'email') {
          await this.sendEmailOTP(recipient, otp, expiryMinutes);
        } else if (method === 'phone') {
          await this.sendPhoneOTP(recipient, otp, expiryMinutes);
        }
      } catch (sendError) {
        // Log error but don't fail - OTP was created and logged
        console.log('⚠️  OTP send error (OTP still valid):', sendError.message);
        console.log(`🔑 BACKUP OTP for ${method} ${recipient}: ${otp}`);
      }

      return {
        success: true,
        message: `OTP sent to ${method}`,
        otpId: otpRequest._id,
        expiresAt
      };
    } catch (error) {
      console.error('Error creating OTP:', error);
      throw new Error('Failed to send OTP: ' + error.message);
    }
  }

  /**
   * Send OTP via Email
   */
  async sendEmailOTP(email, otp, expiryMinutes) {
    const subject = 'SPDF Access Verification Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 5px; margin: 20px 0; }
          .otp { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; 
                 letter-spacing: 5px; padding: 20px; background: white; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SPDF System</h1>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>You requested access to a secured document. Use the following OTP to verify:</p>
            <div class="otp">${otp}</div>
            <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from SPDF System. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail(email, subject, html);
  }

  /**
   * Send OTP via SMS (Twilio)
   */
  async sendPhoneOTP(phone, otp, expiryMinutes) {
    try {
      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('⚠️  Twilio not configured. Running in DEVELOPMENT MODE.');
        console.log(`📱 SMS OTP for ${phone}: ${otp}`);
        return; // Skip actual sending in development
      }

      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const message = `Your SPDF verification code is: ${otp}. Valid for ${expiryMinutes} minutes. Do not share this code.`;

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      console.log(`✅ SMS OTP sent to ${phone}`);
    } catch (error) {
      console.error('❌ Error sending SMS OTP:', error.message);
      // In development, don't fail - just log
      console.log(`📱 [DEV] SMS OTP for ${phone}: ${otp}`);
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(otpId, enteredOTP) {
    try {
      const otpRequest = await OTPRequest.findById(otpId)
        .populate('user', 'username email')
        .populate('spdfFile', 'originalFilename');

      if (!otpRequest) {
        return {
          success: false,
          message: 'OTP request not found'
        };
      }

      const result = await otpRequest.verifyOTP(enteredOTP);
      
      if (result.success) {
        return {
          success: true,
          message: 'OTP verified successfully',
          user: otpRequest.user,
          spdfFile: otpRequest.spdfFile
        };
      }

      return result;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP: ' + error.message);
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(otpId) {
    try {
      const oldRequest = await OTPRequest.findById(otpId);

      if (!oldRequest) {
        throw new Error('OTP request not found');
      }

      // Delete old OTP
      await OTPRequest.findByIdAndDelete(otpId);

      // Create new OTP
      return await this.createAndSendOTP(
        oldRequest.user,
        oldRequest.spdfFile,
        oldRequest.method,
        oldRequest.recipient
      );
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw new Error('Failed to resend OTP: ' + error.message);
    }
  }
}

module.exports = new OTPService();