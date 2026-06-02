import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/response';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('💥 Server Error captured:', err);

  if (err instanceof ZodError) {
    return sendResponse(
      res,
      400,
      false,
      'Validation failure.',
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
  }

  // Handle Prisma relations/integrity exceptions
  if (err.code && err.code.startsWith('P')) {
    return sendResponse(
      res,
      400,
      false,
      `Database exception: ${err.message || 'Prisma error.'}`
    );
  }

  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  return sendResponse(
    res,
    statusCode,
    false,
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};
