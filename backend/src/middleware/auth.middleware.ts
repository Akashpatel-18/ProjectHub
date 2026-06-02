import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { sendResponse } from '../utils/response';
import prisma from '../lib/prisma';

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, false, 'Authentication failed. Please provide a Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendResponse(res, 401, false, 'Authentication failed. Token not found.');
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatarUrl: true }
    });

    if (!user) {
      return sendResponse(res, 401, false, 'User associated with this token does not exist.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return sendResponse(res, 401, false, 'Token has expired.');
    }
    return sendResponse(res, 401, false, 'Invalid token.');
  }
};
