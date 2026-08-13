import logger from '../utils/logger.js';
import { notificationsQueue } from '../config/queue.js';

class EmailService {
  async sendEmail(to, subject, htmlBody) {
    try {
      await notificationsQueue.add('send-email', { to, subject, htmlBody });
      return true;
    } catch (err) {
      logger.error(`EmailService: Failed to enqueue notification for ${to}:`, err);
      return false;
    }
  }

  async sendOtp(to, otp) {
    const subject = 'Your Password Reset OTP Code';
    const htmlBody = `<p>Your password reset code is: <strong>${otp}</strong>. It will expire in 10 minutes.</p>`;
    return this.sendEmail(to, subject, htmlBody);
  }

  async sendWelcome(to, fullName) {
    const subject = 'Welcome to CBFDS!';
    const htmlBody = `<p>Hello ${fullName}, welcome to the Cloud-Based File Distribution System!</p>`;
    return this.sendEmail(to, subject, htmlBody);
  }

  async sendNewDeviceLogin(to, deviceInfo, ipAddress) {
    const subject = 'Security Alert: New Login Detected';
    const htmlBody = `<p>A new login was detected on your account.</p>
                      <p>Device: ${deviceInfo.browser} on ${deviceInfo.os}</p>
                      <p>IP Address: ${ipAddress}</p>`;
    return this.sendEmail(to, subject, htmlBody);
  }
}

export default new EmailService();
