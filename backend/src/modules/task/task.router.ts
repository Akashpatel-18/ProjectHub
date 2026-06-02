import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskDetails,
  updateTask,
  deleteTask,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  createComment,
  toggleWatchTask
} from './task.controller';
import { uploadMiddleware, uploadAttachment, deleteAttachment } from './attachment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { withWorkspaceTenant } from '../../middleware/tenant.middleware';
import { checkPermission } from '../../middleware/permission.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Tasks general
router.get(
  '/:slug/tasks',
  authenticate,
  withWorkspaceTenant,
  checkPermission('read', 'Task'),
  asyncHandler(getTasks)
);

router.post(
  '/:slug/tasks',
  authenticate,
  withWorkspaceTenant,
  checkPermission('create', 'Task'),
  asyncHandler(createTask)
);

router.get(
  '/:slug/tasks/:taskId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(getTaskDetails)
);

router.put(
  '/:slug/tasks/:taskId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(updateTask)
);

router.delete(
  '/:slug/tasks/:taskId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(deleteTask)
);

// Subtasks
router.post(
  '/:slug/tasks/:taskId/subtasks',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(createSubtask)
);

router.put(
  '/:slug/tasks/:taskId/subtasks/:subtaskId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(toggleSubtask)
);

router.delete(
  '/:slug/tasks/:taskId/subtasks/:subtaskId',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(deleteSubtask)
);

// Comments
router.post(
  '/:slug/tasks/:taskId/comments',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(createComment)
);

// Watchers
router.post(
  '/:slug/tasks/:taskId/watch',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(toggleWatchTask)
);

// Attachments
router.post(
  '/:slug/tasks/:taskId/attachments',
  authenticate,
  withWorkspaceTenant,
  uploadMiddleware,
  asyncHandler(uploadAttachment)
);

router.delete(
  '/:slug/attachments/:id',
  authenticate,
  withWorkspaceTenant,
  asyncHandler(deleteAttachment)
);

export default router;
