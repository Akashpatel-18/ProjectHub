import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { sendResponse } from '../../utils/response';
import { subject } from '@casl/ability';

export const getActivityLogs = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');

  const workspaceRoleName = req.memberContext?.role?.name;

  const logs = await prisma.activityLog.findMany({
    where: { workspaceId: req.workspace.id },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      task: {
        include: {
          project: true // Include project to allow proper CASL evaluation
        }
      }
    },
    take: 100 // Fetch latest 100 entries for workspace dashboard feed
  });

  let accessibleProjectIds: string[] = [];

  if (workspaceRoleName !== 'Owner') {
    // ADMIN sees projects they created + assigned
    // MEMBER/GUEST sees assigned projects
    const projectMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true }
    });
    accessibleProjectIds = projectMemberships.map(m => m.projectId);

    if (workspaceRoleName === 'Admin') {
      const createdProjects = await prisma.project.findMany({
        where: { workspaceId: req.workspace.id, createdById: req.user.id },
        select: { id: true }
      });
      accessibleProjectIds = [...accessibleProjectIds, ...createdProjects.map(p => p.id)];
    }
  }

  // Filter logs based on CASL and accessible projects
  const allowedLogs = logs.filter(log => {
    // Owner sees all
    if (workspaceRoleName === 'Owner') return true;

    // Workspace-level logs are generally visible
    if (log.action === 'WORKSPACE_CREATED' || log.action === 'MEMBER_INVITED' || log.action === 'MEMBER_JOINED') {
      return true;
    }

    // Task-level logs
    if (log.task) {
      if (!req.ability) return false;
      return req.ability.can('read', subject('Task', log.task));
    }

    // Project-level logs (projectId in metadata)
    if (log.action.startsWith('PROJECT_')) {
      try {
        const metadata = JSON.parse(log.metadata || '{}');
        if (metadata.projectId) {
          return accessibleProjectIds.includes(metadata.projectId);
        }
      } catch (e) {
        // Fallback
      }
    }

    return false; // Default deny
  });

  return sendResponse(res, 200, true, 'Workspace activity logs fetched.', allowedLogs);
};
