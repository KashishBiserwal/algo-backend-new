const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'algo.tradex.mind@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.GMAIL_USER || 'algo.tradex.mind@gmail.com',
      to: email,
      subject: 'Password Reset - AlgoTradexMind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AlgoTradexMind</h1>
            <p style="color: #64748b; margin: 5px 0;">Algorithmic Trading Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #475569; line-height: 1.6;">
              You requested to reset your password. Use the verification code below to proceed:
            </p>
            
            <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1e293b; margin: 0; font-size: 32px; letter-spacing: 5px; font-family: monospace;">${resetCode}</h3>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              This code will expire in 10 minutes. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 AlgoTradexMind. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset success email
const sendPasswordResetSuccessEmail = async (email) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.GMAIL_USER || 'algo.tradex.mind@gmail.com',
      to: email,
      subject: 'Password Reset Successful - AlgoTradexMind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AlgoTradexMind</h1>
            <p style="color: #64748b; margin: 5px 0;">Algorithmic Trading Platform</p>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #166534; margin-top: 0;">✅ Password Reset Successful</h2>
            <p style="color: #166534; line-height: 1.6;">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            
            <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-weight: 500;">
                If you didn't make this change, please contact our support team immediately.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; color: #64748b; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2025 AlgoTradexMind. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset success email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset success email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail
};
