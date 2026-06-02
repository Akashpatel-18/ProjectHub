import { Router } from 'express';
import { getActivityLogs } from './activity.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { withWorkspaceTenant } from '../../middleware/tenant.middleware';
import { checkPermission } from '../../middleware/permission.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/:slug/activity',
  authenticate,
  withWorkspaceTenant,
  checkPermission('read', 'Project'), // If they can read projects, they can see workspace feed
  asyncHandler(getActivityLogs)
);

export default router;
