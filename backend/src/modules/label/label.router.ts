import { Router } from 'express';
import { getLabels, createLabel } from './label.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { withWorkspaceTenant } from '../../middleware/tenant.middleware';
import { checkPermission } from '../../middleware/permission.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/:slug/labels',
  authenticate,
  withWorkspaceTenant,
  checkPermission('read', 'Label'),
  asyncHandler(getLabels)
);

router.post(
  '/:slug/labels',
  authenticate,
  withWorkspaceTenant,
  checkPermission('manage', 'Label'),
  asyncHandler(createLabel)
);

export default router;
