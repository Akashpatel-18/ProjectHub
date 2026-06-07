import { Router } from 'express';
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
} from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { withWorkspaceTenant } from '../../middleware/tenant.middleware';
import { checkPermission } from '../../middleware/permission.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// === PROJECT CRUD ===
router.get(
  '/:slug/projects',
  authenticate,
  withWorkspaceTenant,
  checkPermission('read', 'Project'),
  asyncHandler(getProjects)
);

router.post(
  '/:slug/projects',
  authenticate,
  withWorkspaceTenant,
  checkPermission('create', 'Project'),
  asyncHandler(createProject)
);

router.put(
  '/:slug/projects/:id',
  authenticate,
  withWorkspaceTenant,
  // Instance-level CASL check is inside controller
  asyncHandler(updateProject)
);

router.delete(
  '/:slug/projects/:id',
  authenticate,
  withWorkspaceTenant,
  // Instance-level CASL check is inside controller
  asyncHandler(deleteProject)
);

// === PROJECT MEMBERS ===
router.get(
  '/:slug/projects/:projectId/members',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(getProjectMembers)
);

router.post(
  '/:slug/projects/:projectId/members',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(addProjectMember)
);

router.put(
  '/:slug/projects/:projectId/members/:userId/role',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(updateProjectMemberRole)
);

router.delete(
  '/:slug/projects/:projectId/members/:userId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(removeProjectMember)
);

export default router;
