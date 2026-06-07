import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import redis from "../../lib/redis";
import { sendResponse } from "../../utils/response";
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "./workspace.validation";
import { emailQueue } from "../../queues/email.queue";
import { ENV } from "../../config/env";

export const createWorkspace = async (req: Request, res: Response) => {
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");
  const validated = createWorkspaceSchema.parse(req.body);

  const existing = await prisma.workspace.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    return sendResponse(
      res,
      400,
      false,
      "A workspace with this slug/URL already exists.",
    );
  }

  // Find system 'Owner' role
  const ownerRole = await prisma.role.findFirst({
    where: { name: "Owner", workspaceId: null },
  });

  if (!ownerRole) {
    return sendResponse(
      res,
      500,
      false,
      "System authorization roles not initialized.",
    );
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      members: {
        create: {
          userId: req.user.id,
          roleId: ownerRole.id,
        },
      },
    },
  });

  // Track activity
  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      actorId: req.user.id,
      action: "WORKSPACE_CREATED",
      metadata: JSON.stringify({ name: workspace.name }),
    },
  });

  return sendResponse(
    res,
    201,
    true,
    "Workspace created successfully.",
    workspace,
  );
};

export const getWorkspaces = async (req: Request, res: Response) => {
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: {
      workspace: true,
      role: true,
    },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role.name,
  }));

  return sendResponse(
    res,
    200,
    true,
    "Workspaces fetched successfully.",
    workspaces,
  );
};

export const getWorkspaceDetails = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");
  return sendResponse(
    res,
    200,
    true,
    "Workspace fetched successfully.",
    req.workspace,
  );
};

export const getWorkspaceMembers = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.workspace.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
      role: true,
    },
  });

  return sendResponse(
    res,
    200,
    true,
    "Workspace members fetched successfully.",
    members,
  );
};

export const getWorkspaceRoles = async (req: Request, res: Response) => {
  // Load workspace-specific roles and system roles (workspaceId is null)
  const roles = await prisma.role.findMany({
    where: {
      OR: [{ workspaceId: null }, { workspaceId: req.workspace?.id }],
    },
    include: {
      permissions: true,
    },
  });

  return sendResponse(res, 200, true, "Roles fetched successfully.", roles);
};

export const inviteMember = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  const validated = inviteMemberSchema.parse(req.body);

  // Resolve the role being assigned
  const role = await prisma.role.findUnique({
    where: { id: validated.roleId },
  });

  if (!role) {
    return sendResponse(res, 400, false, "Selected role does not exist.");
  }

  // ── BUSINESS RULE: ONLY OWNER can invite workspace members ──────────────────────
  const inviterRole = req.memberContext?.role?.name;
  if (inviterRole !== "Owner") {
    return sendResponse(
      res,
      403,
      false,
      "Only Workspace Owners can invite members.",
    );
  }
  // OWNER can invite any role (Admin, Member, Guest)
  // ──────────────────────────────────────────────────────────────────────────────

  // Check if user is already a member
  const user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (user) {
    const isMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: req.workspace.id,
          userId: user.id,
        },
      },
    });

    if (isMember) {
      return sendResponse(
        res,
        400,
        false,
        "User is already a member of this workspace.",
      );
    }
  }

  // Check for active invite
  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId: req.workspace.id,
      email: validated.email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    return sendResponse(
      res,
      400,
      false,
      "An active invitation has already been sent to this email address.",
    );
  }

  // Create invite
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: req.workspace.id,
      email: validated.email,
      roleId: validated.roleId,
      invitedById: req.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
    },
  });

  const inviteUrl = `${ENV.CLIENT_URL}/invite/${invite.token}`;

  await emailQueue.add("sendInvite", {
    toEmail: invite.email,
    inviterName: req.user.name,
    workspaceName: req.workspace.name,
    inviteUrl,
  });

  // Track activity
  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      actorId: req.user.id,
      action: "MEMBER_INVITED",
      metadata: JSON.stringify({ email: invite.email, role: role.name }),
    },
  });

  return sendResponse(res, 200, true, "Invitation email sent successfully.");
};

export const getInviteDetails = async (req: Request, res: Response) => {
  const { token } = req.params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: { name: true, slug: true },
      },
      invitedBy: {
        select: { name: true },
      },
    },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return sendResponse(
      res,
      400,
      false,
      "Invitation token is invalid or has expired.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  return sendResponse(res, 200, true, "Invite details fetched.", {
    ...invite,
    userExists: !!existingUser,
  });
};

export const acceptInvite = async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return sendResponse(
      res,
      400,
      false,
      "Invitation token is invalid or has expired.",
    );
  }

  if (invite.email !== req.user.email) {
    return sendResponse(
      res,
      400,
      false,
      "This invitation was sent to a different email address.",
    );
  }

  // Add user to workspace
  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: req.user.id,
        roleId: invite.roleId,
      },
    }),
    prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
    prisma.activityLog.create({
      data: {
        workspaceId: invite.workspaceId,
        actorId: req.user.id,
        action: "MEMBER_JOINED",
        metadata: JSON.stringify({ email: req.user.email }),
      },
    }),
  ]);

  return sendResponse(res, 200, true, "Joined workspace successfully.");
};

export const updateMemberRole = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");
  const { userId } = req.params;
  const validated = updateMemberRoleSchema.parse(req.body);

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: req.workspace.id,
        userId,
      },
    },
    include: { role: true },
  });

  if (!member) {
    return sendResponse(res, 404, false, "Workspace member not found.");
  }

  // Prevent demoting the Owner if they are the only Owner
  if (member.role.name === "Owner") {
    const ownerCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: req.workspace.id,
        role: { name: "Owner" },
      },
    });

    if (ownerCount <= 1) {
      return sendResponse(
        res,
        400,
        false,
        "Cannot change the role of the primary workspace owner.",
      );
    }
  }

  const updatedMember = await prisma.workspaceMember.update({
    where: { id: member.id },
    data: { roleId: validated.roleId },
    include: { role: true },
  });

  // Invalidate cache
  await redis.del(`workspace:${req.workspace.id}:user:${userId}`).catch(() => null);

  return sendResponse(
    res,
    200,
    true,
    "Member role updated successfully.",
    updatedMember,
  );
};

export const removeMember = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");
  const { userId } = req.params;

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: req.workspace.id,
        userId,
      },
    },
    include: { role: true },
  });

  if (!member) {
    return sendResponse(res, 404, false, "Workspace member not found.");
  }

  // Owner protection
  if (member.role.name === "Owner") {
    const ownerCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: req.workspace.id,
        role: { name: "Owner" },
      },
    });

    if (ownerCount <= 1) {
      return sendResponse(
        res,
        400,
        false,
        "Cannot remove the primary workspace owner.",
      );
    }
  }

  // ── BUSINESS RULE: Cascade remove — remove from projects + unassign tasks ──────
  // 1. Find all projects in this workspace
  const workspaceProjects = await prisma.project.findMany({
    where: { workspaceId: req.workspace.id },
    select: { id: true },
  });
  const projectIds = workspaceProjects.map((p) => p.id);

  // 2. Delete all ProjectMember entries for this user across workspace projects
  if (projectIds.length > 0) {
    await prisma.projectMember.deleteMany({
      where: {
        userId,
        projectId: { in: projectIds },
      },
    });
  }

  // 3. Unassign tasks where this user is the assignee within the workspace
  await prisma.task.updateMany({
    where: {
      workspaceId: req.workspace.id,
      assigneeId: userId,
    },
    data: { assigneeId: null },
  });
  // ──────────────────────────────────────────────────────────────────────────────

  // 4. Remove from workspace
  await prisma.workspaceMember.delete({
    where: { id: member.id },
  });

  // Invalidate cache
  await redis.del(`workspace:${req.workspace.id}:user:${userId}`).catch(() => null);
  if (projectIds.length > 0) {
    const projectKeys = projectIds.map(pid => `project:${pid}:user:${userId}`);
    await redis.del(...projectKeys).catch(() => null);
  }

  return sendResponse(
    res,
    200,
    true,
    "Member removed from workspace successfully.",
  );
};
