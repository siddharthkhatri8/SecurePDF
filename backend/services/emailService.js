const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.developmentMode = true; // Set to false when you have real email credentials
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      // Check if email is configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  Email not configured. Running in DEVELOPMENT MODE - OTPs will be logged to console.');
        this.developmentMode = true;
        return;
      }

      // ✅ FIXED EMAIL CONFIG (GMAIL - NO TIMEOUT)
      // this.transporter = nodemailer.createTransport({
      //   service: "gmail",
      //   auth: {
      //     user: process.env.EMAIL_USER,
      //     pass: process.env.EMAIL_PASS
      //   }
      // });

      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email configuration error:', error.message);
          console.log('📧 Switching to DEVELOPMENT MODE - OTPs will be logged to console.');
          this.developmentMode = true;
          this.transporter = null;
        } else {
          console.log('✅ Email service ready (Production Mode)');
          this.developmentMode = false;
        }
      });

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.developmentMode = true;
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html) {
    try {
      // Development mode - log to console
      if (this.developmentMode || !this.transporter) {
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL (Development Mode)');
        console.log('='.repeat(60));
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('='.repeat(60));
        
        // Extract OTP if present
        const otpMatch = html.match(/\d{6}/);
        if (otpMatch) {
          console.log('🔑 OTP CODE:', otpMatch[0]);
          console.log('='.repeat(60));
        }
        
        console.log('Body Preview:', html.substring(0, 200) + '...');
        console.log('='.repeat(60) + '\n');
        
        return { success: true, mode: 'development' };
      }

      // Production mode - actually send email
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        mode: 'production'
      };

    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      
      // Fallback to console logging if email fails
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL (Fallback - Email Failed)');
      console.log('='.repeat(60));
      console.log('To:', to);
      console.log('Subject:', subject);
      
      const otpMatch = html.match(/\d{6}/);
      if (otpMatch) {
        console.log('🔑 OTP CODE:', otpMatch[0]);
      }
      console.log('='.repeat(60) + '\n');
      
      // Don't throw error in development
      if (this.developmentMode) {
        return { success: true, mode: 'development-fallback' };
      }
      
      throw new Error('Failed to send email: ' + error.message);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to SPDF System';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; 
                    color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SPDF System</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.username},</h2>
            <p>Your account has been created successfully!</p>
            <p>You can now:</p>
            <ul>
              <li>Upload and secure your PDF documents</li>
              <li>Control who can access your files</li>
              <li>Track document access with OTP verification</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">
              Get Started
            </a>
            <p>If you have any questions, feel free to reach out.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      return await this.sendEmail(user.email, subject, html);
    } catch (error) {
      console.log('⚠️  Welcome email not sent (non-critical):', error.message);
      return { success: false, mode: 'skipped' };
    }
  }
}

module.exports = new EmailService();