class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    try {
      const { fullName, email, password, confirmPassword } = req.body;
      const result = await this.authService.register(fullName, email, password, confirmPassword);
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please log in.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password, deviceInfo } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const result = await this.authService.login(email, password, deviceInfo, ipAddress);
      
      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      const userAgent = req.headers['user-agent'] || 'Unknown';
      auditLogServiceModule.default.log(
        result.user.userId,
        'LOGIN',
        null,
        { email: result.user.email, deviceInfo },
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req, res, next) => {
    try {
      const { refreshToken, deviceInfo } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await this.authService.refresh(refreshToken, deviceInfo, ipAddress);
      return res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logout(refreshToken);
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err) {
      next(err);
    }
  };

  logoutAll = async (req, res, next) => {
    try {
      const userId = req.user.userId;
      await this.authService.logoutAll(userId);
      return res.status(200).json({
        success: true,
        message: 'Logged out of all sessions successfully.'
      });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      return res.status(200).json({
        success: true,
        message: 'If this email exists, an OTP code has been sent.'
      });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { email, otp, newPassword, confirmNewPassword } = req.body;
      await this.authService.resetPassword(email, otp, newPassword, confirmNewPassword);
      return res.status(200).json({
        success: true,
        message: 'Password reset successful. Please log in.'
      });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const result = await this.authService.getProfile(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      await this.authService.changePassword(userId, currentPassword, newPassword, confirmNewPassword);
      return res.status(200).json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (err) {
      next(err);
    }
  };
}

export default AuthController;
export { AuthController };
