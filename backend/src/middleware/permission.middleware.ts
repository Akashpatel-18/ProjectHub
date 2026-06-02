import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/response';

export const checkPermission = (action: string, subject: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.ability) {
        return sendResponse(res, 403, false, 'Forbidden. Authorization context is missing.');
      }

      const isAllowed = req.ability.can(action, subject as any);

      if (!isAllowed) {
        return sendResponse(
          res,
          403,
          false,
          `Forbidden. You do not have permission to ${action} ${subject}.`
        );
      }

      next();
    } catch (error) {
      console.error('❌ Permission gate intercept error:', error);
      return sendResponse(res, 500, false, 'Internal validation failure.');
    }
  };
};
