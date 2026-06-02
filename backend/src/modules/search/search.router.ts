import { Router } from 'express';
import { searchTasks } from './search.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { withWorkspaceTenant } from '../../middleware/tenant.middleware';
import { checkPermission } from '../../middleware/permission.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/:slug/search',
  authenticate,
  withWorkspaceTenant,
  checkPermission('read', 'Task'),
  asyncHandler(searchTasks)
);

export default router;
