import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { sendResponse } from '../../utils/response';
import { subject } from '@casl/ability';

export const searchTasks = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');

  const { query, projectId, status, priority, assigneeId, labelId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: req.workspace.id,
      ...(projectId && { projectId: projectId as string }),
      ...(status && { status: status as string }),
      ...(priority && { priority: priority as string }),
      ...(assigneeId && { assigneeId: assigneeId as string }),
      ...(labelId && {
        labels: {
          some: {
            labelId: labelId as string
          }
        }
      }),
      ...(query && {
        OR: [
          { title: { contains: query as string, mode: 'insensitive' } },
          { description: { contains: query as string, mode: 'insensitive' } }
        ]
      })
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subtasks: true,
      _count: { select: { comments: true } }
    }
  });

  // Apply CASL restrictions dynamically
  const allowedTasks = tasks.filter(task => {
    if (!req.ability) return false;
    return req.ability.can('read', subject('Task', task));
  });

  return sendResponse(res, 200, true, 'Search results fetched.', allowedTasks);
};
