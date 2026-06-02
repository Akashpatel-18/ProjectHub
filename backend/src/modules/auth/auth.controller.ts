import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { ENV } from '../../config/env';
import { sendResponse } from '../../utils/response';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import { sendPasswordResetEmail } from '../../services/email.service';

const generateToken = (userId: string, email: string, name: string) => {
  const options: SignOptions = { expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    { userId, email, name },
    ENV.JWT_SECRET,
    options
  );
};

export const signup = async (req: Request, res: Response) => {
  const validated = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existing) {
    return sendResponse(res, 400, false, 'A user with this email address already exists.');
  }

  const passwordHash = await bcrypt.hash(validated.password, 10);

  const user = await prisma.user.create({
    data: {
      email: validated.email,
      name: validated.name,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (validated.inviteToken) {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token: validated.inviteToken },
    });

    if (invite && invite.status === 'PENDING' && invite.expiresAt >= new Date()) {
      if (invite.email === user.email) {
        await prisma.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: invite.workspaceId,
            roleId: invite.roleId
          }
        });

        await prisma.workspaceInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' },
        });

        await prisma.activityLog.create({
          data: {
            workspaceId: invite.workspaceId,
            actorId: user.id,
            action: 'MEMBER_JOINED',
            metadata: JSON.stringify({ source: 'invite' })
          }
        });
      }
    }
  }

  const token = generateToken(user.id, user.email, user.name);

  return sendResponse(res, 201, true, 'Account created successfully.', { user, token });
};

export const login = async (req: Request, res: Response) => {
  const validated = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (!user || !(await bcrypt.compare(validated.password, user.passwordHash))) {
    return sendResponse(res, 401, false, 'Invalid email or password credentials.');
  }

  const token = generateToken(user.id, user.email, user.name);

  const userResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  return sendResponse(res, 200, true, 'Authenticated successfully.', { user: userResponse, token });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const validated = forgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (!user) {
    // Return standard success to avoid email enumerations (standard SaaS security pattern)
    return sendResponse(
      res,
      200,
      true,
      'If this email exists in our records, a recovery link will be sent shortly.'
    );
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour validity

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${resetToken}`;
  
  // Send via Resend
  await sendPasswordResetEmail({
    toEmail: user.email,
    resetUrl,
  });

  return sendResponse(
    res,
    200,
    true,
    'If this email exists in our records, a recovery link will be sent shortly.'
  );
};

export const resetPassword = async (req: Request, res: Response) => {
  const validated = resetPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { resetToken: validated.token },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return sendResponse(res, 400, false, 'Recovery token is invalid or has expired.');
  }

  const passwordHash = await bcrypt.hash(validated.password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return sendResponse(res, 200, true, 'Your password has been reset successfully.');
};

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return sendResponse(res, 401, false, 'Not authenticated.');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return sendResponse(res, 200, true, 'User profile fetched successfully.', user);
};
