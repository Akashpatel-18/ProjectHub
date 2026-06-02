import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Provide a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  inviteToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Provide a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Provide a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});
