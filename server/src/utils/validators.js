import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must contain at least 2 characters.').max(100),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128),
  confirmPassword: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').max(128),
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
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.').max(128),
  confirmNewPassword: z.string()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.').max(128),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.').max(128),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match.',
  path: ['confirmNewPassword']
});

export const createShareSchema = z.object({
  fileId: z.string().trim().min(1).max(256),
  shareType: z.enum(['INTERNAL', 'EXTERNAL']),
  recipientEmail: z.string().email().optional(),
  password: z.string().min(1).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
  downloadLimit: z.number().int().positive().max(1_000_000).optional(),
  selfDestruct: z.boolean().optional().default(false)
}).strict().superRefine((data, ctx) => {
  if (data.shareType === 'INTERNAL' && !data.recipientEmail) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientEmail'], message: 'Recipient email is required for internal shares.' });
  }
  if (data.shareType === 'INTERNAL' && data.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password protection is only available for external shares.' });
  }
});

export const verifyShareSchema = z.object({
  password: z.string().min(1, 'Password is required.').max(128)
}).strict();

export const updateTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(64)).max(25)
}).strict();
