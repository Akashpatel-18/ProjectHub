import { Router } from "express";
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceDetails,
  getWorkspaceMembers,
  getWorkspaceRoles,
  inviteMember,
  getInviteDetails,
  acceptInvite,
  updateMemberRole,
  removeMember,
} from "./workspace.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { withWorkspaceTenant } from "../../middleware/tenant.middleware";
import { checkPermission } from "../../middleware/permission.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Global Workspace Routes
router.get("/", authenticate, asyncHandler(getWorkspaces));
router.post("/", authenticate, asyncHandler(createWorkspace));

// Invite Acceptance (Global context, not bounded to a specific tenant slug path)
router.get("/invites/:token", asyncHandler(getInviteDetails));
router.post("/invites/:token/accept", authenticate, asyncHandler(acceptInvite));

// Tenant-Specific Routes
router.get(
  "/:slug",
  authenticate,
  withWorkspaceTenant,
  asyncHandler(getWorkspaceDetails),
);
router.get(
  "/:slug/members",
  authenticate,
  withWorkspaceTenant,
  checkPermission("read", "WorkspaceMember"),
  asyncHandler(getWorkspaceMembers),
);
router.get(
  "/:slug/roles",
  authenticate,
  withWorkspaceTenant,
  asyncHandler(getWorkspaceRoles),
);

router.post(
  "/:slug/invite",
  authenticate,
  withWorkspaceTenant,
  checkPermission("manage", "WorkspaceInvite"),
  asyncHandler(inviteMember),
);

router.put(
  "/:slug/members/:userId/role",
  authenticate,
  withWorkspaceTenant,
  checkPermission("manage", "WorkspaceMember"),
  asyncHandler(updateMemberRole),
);

router.delete(
  "/:slug/members/:userId",
  authenticate,
  withWorkspaceTenant,
  checkPermission("manage", "WorkspaceMember"),
  asyncHandler(removeMember),
);

export default router;
