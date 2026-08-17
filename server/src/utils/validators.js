import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must contain at least 2 characters.').max(100),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
  }).optional().default({}),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
  }).optional().default({}),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.')
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d+$/, 'OTP must contain numbers only.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmNewPassword: z.string()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
  confirmNewPassword: z.string()
});
