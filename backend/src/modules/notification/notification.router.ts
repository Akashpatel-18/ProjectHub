import { Router } from 'express';
import { getNotifications, markAllAsRead, markAsRead } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Bounded by global user context
router.get('/', authenticate, asyncHandler(getNotifications));
router.put('/read-all', authenticate, asyncHandler(markAllAsRead));
router.put('/:id/read', authenticate, asyncHandler(markAsRead));

export default router;
