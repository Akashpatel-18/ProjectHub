import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import redis from '../../lib/redis';
import { sendResponse } from '../../utils/response';
import { createProjectSchema, updateProjectSchema } from './project.validation';
import { subject } from '@casl/ability';

// =============================================
// PROJECT CRUD
// =============================================

export const createProject = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');

  const validated = createProjectSchema.parse(req.body);

  const project = await prisma.project.create({
    data: {
      workspaceId: req.workspace.id,
      name: validated.name,
      description: validated.description,
      status: validated.status,
      createdById: req.user.id
    }
  });

  // Auto-add creator as a ProjectMember with Admin role at the project level.
  // Project roles (Admin/Member/Guest) are INDEPENDENT from workspace roles.
  const adminRole = await prisma.role.findFirst({
    where: { name: 'Admin', workspaceId: null }
  });
  if (adminRole) {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: req.user.id,
        roleId: adminRole.id
      }
    });
  }

  // Track activity
  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      actorId: req.user.id,
      action: 'PROJECT_CREATED',
      metadata: JSON.stringify({ projectId: project.id, name: project.name })
    }
  });

  return sendResponse(res, 201, true, 'Project created successfully.', project);
};

/**
 * Project visibility rules (per business spec):
 *  - OWNER: sees ALL projects in workspace
 *  - ADMIN: sees projects they created + projects where they are a ProjectMember
 *  - MEMBER / GUEST: sees ONLY projects where they are a ProjectMember
 */
export const getProjects = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');

  const workspaceRoleName = req.memberContext?.role?.name;

  let projects;

  if (workspaceRoleName === 'Owner') {
    // OWNER sees everything
    projects = await prisma.project.findMany({
      where: { workspaceId: req.workspace.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            role: true
          }
        }
      }
    });
  } else if (workspaceRoleName === 'Admin') {
    // ADMIN: sees projects they created + projects where they're a ProjectMember
    const projectMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    const memberProjectIds = projectMemberships.map(m => m.projectId);

    projects = await prisma.project.findMany({
      where: {
        workspaceId: req.workspace.id,
        OR: [
          { createdById: req.user.id },
          { id: { in: memberProjectIds } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            role: true
          }
        }
      }
    });
  } else {
    // MEMBER / GUEST: only projects where they are explicitly a ProjectMember
    const projectMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    const memberProjectIds = projectMemberships.map(m => m.projectId);

    projects = await prisma.project.findMany({
      where: {
        workspaceId: req.workspace.id,
        id: { in: memberProjectIds }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            role: true
          }
        }
      }
    });
  }

  // Attach the current user's project-level role to each project
  const projectIds = projects.map((p: any) => p.id);
  const userProjectMemberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id, projectId: { in: projectIds } },
    include: { role: true }
  });
  const projectRoleMap: Record<string, string> = {};
  for (const pm of userProjectMemberships) {
    projectRoleMap[pm.projectId] = pm.role.name;
  }

  const enriched = projects.map((p: any) => ({
    ...p,
    myProjectRole: projectRoleMap[p.id] || null
  }));

  return sendResponse(res, 200, true, 'Projects fetched successfully.', enriched);
};

export const updateProject = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { id } = req.params;
  const validated = updateProjectSchema.parse(req.body);

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || project.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Project not found in this workspace.');
  }

  // Dynamic CASL Check on Project Instance
  if (!req.ability || !req.ability.can('update', subject('Project', project))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to update this Project.');
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: validated
  });

  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      actorId: req.user.id,
      action: 'PROJECT_UPDATED',
      metadata: JSON.stringify({ projectId: project.id, name: updatedProject.name, changes: validated })
    }
  });

  return sendResponse(res, 200, true, 'Project updated successfully.', updatedProject);
};

export const deleteProject = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { id } = req.params;

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || project.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Project not found in this workspace.');
  }

  // Dynamic CASL Check on Project Instance
  if (!req.ability || !req.ability.can('delete', subject('Project', project))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to delete this Project.');
  }

  await prisma.project.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      actorId: req.user.id,
      action: 'PROJECT_DELETED',
      metadata: JSON.stringify({ name: project.name })
    }
  });

  return sendResponse(res, 200, true, 'Project deleted successfully.');
};

// =============================================
// PROJECT MEMBERS MANAGEMENT
// =============================================

/**
 * List all members of a specific project.
 * Accessible by: OWNER (all projects), ADMIN (own/assigned projects), MEMBER/GUEST (assigned projects).
 */
export const getProjectMembers = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: req.workspace.id }
  });
  if (!project) return sendResponse(res, 404, false, 'Project not found.');

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      role: true
    },
    orderBy: { createdAt: 'asc' }
  });

  return sendResponse(res, 200, true, 'Project members fetched.', members);
};

/**
 * Add a member to a project.
 * Only WORKSPACE OWNER or the project's ADMIN (via ProjectMember role) can do this.
 */
export const addProjectMember = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { projectId } = req.params;
  const { userId, roleId } = req.body;

  if (!userId || !roleId) {
    return sendResponse(res, 400, false, 'userId and roleId are required.');
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: req.workspace.id }
  });
  if (!project) return sendResponse(res, 404, false, 'Project not found.');

  // Authorization: workspace Owner OR user with project-level Admin role
  const workspaceRole = req.memberContext?.role?.name;
  const isWorkspaceOwner = workspaceRole === 'Owner';

  // Check if current user has project-level Admin role (the CORRECT check)
  const currentUserProjectRole = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
    include: { role: true }
  });
  const hasProjectAdminRole = currentUserProjectRole?.role?.name === 'Admin';

  if (!isWorkspaceOwner && !hasProjectAdminRole) {
    return sendResponse(res, 403, false, 'Only Workspace Owner or Project Admin can add members.');
  }

  // Verify target user is a workspace member
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.workspace.id, userId } }
  });
  if (!workspaceMember) {
    return sendResponse(res, 400, false, 'User is not a member of this workspace.');
  }

  // Verify roleId is valid (Admin, Member, or Guest for project roles)
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || !['Admin', 'Member', 'Guest'].includes(role.name)) {
    return sendResponse(res, 400, false, 'Invalid project role. Only Admin, Member or Guest allowed.');
  }

  // Upsert — add or update
  const projectMember = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { roleId },
    create: { projectId, userId, roleId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      role: true
    }
  });

  // Invalidate cache
  await redis.del(`project:${projectId}:user:${userId}`).catch(() => null);

  return sendResponse(res, 201, true, 'Member added to project.', projectMember);
};

/**
 * Change a project member's role.
 * Only workspace Owner or user with project-level Admin role can do this.
 */
export const updateProjectMemberRole = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { projectId, userId } = req.params;
  const { roleId } = req.body;

  if (!roleId) return sendResponse(res, 400, false, 'roleId is required.');

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: req.workspace.id }
  });
  if (!project) return sendResponse(res, 404, false, 'Project not found.');

  const workspaceRole = req.memberContext?.role?.name;
  const isWorkspaceOwner = workspaceRole === 'Owner';
  const currentUserProjectRole = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
    include: { role: true }
  });
  const hasProjectAdminRole = currentUserProjectRole?.role?.name === 'Admin';

  if (!isWorkspaceOwner && !hasProjectAdminRole) {
    return sendResponse(res, 403, false, 'Only Workspace Owner or Project Admin can change roles.');
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || !['Admin', 'Member', 'Guest'].includes(role.name)) {
    return sendResponse(res, 400, false, 'Invalid project role. Only Admin, Member or Guest allowed.');
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { roleId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      role: true
    }
  });

  // Invalidate cache
  await redis.del(`project:${projectId}:user:${userId}`).catch(() => null);

  return sendResponse(res, 200, true, 'Project member role updated.', updated);
};

/**
 * Remove a member from a project.
 * Only workspace Owner or user with project-level Admin role can do this.
 */
export const removeProjectMember = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { projectId, userId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: req.workspace.id }
  });
  if (!project) return sendResponse(res, 404, false, 'Project not found.');

  const workspaceRole = req.memberContext?.role?.name;
  const isWorkspaceOwner = workspaceRole === 'Owner';
  const currentUserProjectRole = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
    include: { role: true }
  });
  const hasProjectAdminRole = currentUserProjectRole?.role?.name === 'Admin';

  if (!isWorkspaceOwner && !hasProjectAdminRole) {
    return sendResponse(res, 403, false, 'Only Workspace Owner or Project Admin can remove members.');
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });
  if (!existing) return sendResponse(res, 404, false, 'Member not found in this project.');

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } }
  });

  // Invalidate cache
  await redis.del(`project:${projectId}:user:${userId}`).catch(() => null);

  return sendResponse(res, 200, true, 'Member removed from project.');
};
