import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { sendResponse } from '../../utils/response';
import { createTaskSchema, updateTaskSchema, createSubtaskSchema, createCommentSchema } from './task.validation';
import { subject } from '@casl/ability';

// Emit utility to keep code clean and dry
const emitSocketEvent = (req: Request, eventName: string, payload: any) => {
  const io = req.app.get('io');
  if (io && req.workspace) {
    io.to(req.workspace.slug).emit(eventName, payload);
  }
};

export const createTask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');

  const validated = createTaskSchema.parse(req.body);

  // Check if project belongs to workspace
  const project = await prisma.project.findFirst({
    where: { id: validated.projectId, workspaceId: req.workspace.id }
  });

  if (!project) {
    return sendResponse(res, 404, false, 'Project not found in this workspace.');
  }

  // Create task with relations
  const task = await prisma.task.create({
    data: {
      projectId: validated.projectId,
      workspaceId: req.workspace.id,
      title: validated.title,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      dueDate: validated.dueDate,
      assigneeId: validated.assigneeId,
      createdById: req.user.id,
      labels: validated.labelIds ? {
        create: validated.labelIds.map(labelId => ({ labelId }))
      } : undefined
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subtasks: true,
      _count: { select: { comments: true } }
    }
  });

  // Create activity log
  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      taskId: task.id,
      actorId: req.user.id,
      action: 'TASK_CREATED',
      metadata: JSON.stringify({ title: task.title })
    }
  });

  // Send assignment notification
  if (validated.assigneeId && validated.assigneeId !== req.user.id) {
    const notify = await prisma.notification.create({
      data: {
        userId: validated.assigneeId,
        title: 'New Task Assigned',
        message: `${req.user.name} assigned you: "${task.title}"`,
        type: 'TASK_ASSIGNED',
        taskId: task.id
      }
    });
    
    // Emit socket alert specifically to assigned user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${validated.assigneeId}`).emit('notification:new', notify);
    }
  }

  emitSocketEvent(req, 'task:created', task);

  return sendResponse(res, 201, true, 'Task created successfully.', task);
};

export const getTasks = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');

  const { projectId, status, priority, assigneeId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: req.workspace.id,
      ...(projectId && { projectId: projectId as string }),
      ...(status && { status: status as string }),
      ...(priority && { priority: priority as string }),
      ...(assigneeId && { assigneeId: assigneeId as string })
    },
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subtasks: true,
      _count: { select: { comments: true } }
    }
  });

  // Filter tasks based on CASL abilities (crucial for Guest view restriction!)
  const allowedTasks = tasks.filter(task => {
    if (!req.ability) return false;
    return req.ability.can('read', subject('Task', task));
  });

  return sendResponse(res, 200, true, 'Tasks fetched successfully.', allowedTasks);
};

export const getTaskDetails = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { createdAt: 'asc' } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } }
        }
      },
      attachments: { orderBy: { createdAt: 'desc' } },
      watchers: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL check
  if (!req.ability || !req.ability.can('read', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to view this task.');
  }

  return sendResponse(res, 200, true, 'Task fetched successfully.', task);
};

export const updateTask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;
  
  const validated = updateTaskSchema.parse(req.body);

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL check
  if (!req.ability || !req.ability.can('update', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to update this task.');
  }

  // Check if labels are changing and sync many-to-many
  if (validated.labelIds) {
    await prisma.taskLabel.deleteMany({ where: { taskId } });
    if (validated.labelIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: validated.labelIds.map(labelId => ({ taskId, labelId }))
      });
    }
  }

  const { labelIds, ...updateData } = validated;

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subtasks: true,
      _count: { select: { comments: true } }
    }
  });

  // Track activity logs for audits
  const changes: Record<string, any> = {};
  if (updateData.status && updateData.status !== task.status) {
    changes.status = { old: task.status, new: updateData.status };
  }
  if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId) {
    changes.assigneeId = { old: task.assigneeId, new: updateData.assigneeId };
  }

  if (Object.keys(changes).length > 0) {
    await prisma.activityLog.create({
      data: {
        workspaceId: req.workspace.id,
        taskId,
        actorId: req.user.id,
        action: 'TASK_UPDATED',
        metadata: JSON.stringify(changes)
      }
    });

    // Notify new assignee
    if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId && updateData.assigneeId !== req.user.id) {
      const notify = await prisma.notification.create({
        data: {
          userId: updateData.assigneeId,
          title: 'Task Assigned',
          message: `${req.user.name} assigned you: "${updatedTask.title}"`,
          type: 'TASK_ASSIGNED',
          taskId
        }
      });
      const io = req.app.get('io');
      if (io) io.to(`user_${updateData.assigneeId}`).emit('notification:new', notify);
    }
  }

  emitSocketEvent(req, 'task:updated', updatedTask);

  return sendResponse(res, 200, true, 'Task updated successfully.', updatedTask);
};

export const deleteTask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL Check
  if (!req.ability || !req.ability.can('delete', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to delete this task.');
  }

  await prisma.task.delete({
    where: { id: taskId }
  });

  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      actorId: req.user.id,
      action: 'TASK_DELETED',
      metadata: JSON.stringify({ title: task.title })
    }
  });

  emitSocketEvent(req, 'task:deleted', { taskId });

  return sendResponse(res, 200, true, 'Task deleted successfully.');
};

// === SUBTASKS ===

export const createSubtask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;
  const validated = createSubtaskSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL Check
  if (!req.ability || !req.ability.can('update', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You cannot manage subtasks on this task.');
  }

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: validated.title
    }
  });

  emitSocketEvent(req, 'task:updated', { taskId }); // Trigger a reload on clients

  return sendResponse(res, 201, true, 'Subtask added successfully.', subtask);
};

export const toggleSubtask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  const { taskId, subtaskId } = req.params;
  const { isCompleted } = req.body;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL check
  if (!req.ability || !req.ability.can('update', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You cannot edit this task.');
  }

  const updatedSubtask = await prisma.subtask.update({
    where: { id: subtaskId, taskId },
    data: { isCompleted: !!isCompleted }
  });

  emitSocketEvent(req, 'task:updated', { taskId });

  return sendResponse(res, 200, true, 'Subtask updated successfully.', updatedSubtask);
};

export const deleteSubtask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  const { taskId, subtaskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  if (!req.ability || !req.ability.can('update', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You cannot edit this task.');
  }

  await prisma.subtask.delete({
    where: { id: subtaskId, taskId }
  });

  emitSocketEvent(req, 'task:updated', { taskId });

  return sendResponse(res, 200, true, 'Subtask deleted successfully.');
};

// === COMMENTS ===

export const createComment = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;
  const validated = createCommentSchema.parse(req.body);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL check
  if (!req.ability || !req.ability.can('create', 'Comment')) {
    return sendResponse(res, 403, false, 'Forbidden. You cannot comment on this task.');
  }

  const comment = await prisma.comment.create({
    data: {
      taskId,
      userId: req.user.id,
      content: validated.content
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } }
    }
  });

  // Notify assignee
  if (task.assigneeId && task.assigneeId !== req.user.id) {
    const notify = await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        title: 'New Comment Added',
        message: `${req.user.name} commented on: "${task.title}"`,
        type: 'TASK_COMMENT',
        taskId
      }
    });
    const io = req.app.get('io');
    if (io) io.to(`user_${task.assigneeId}`).emit('notification:new', notify);
  }

  emitSocketEvent(req, 'comment:created', comment);

  return sendResponse(res, 201, true, 'Comment added successfully.', comment);
};

// === WATCHERS ===

export const toggleWatchTask = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  const isWatching = await prisma.taskWatcher.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId: req.user.id
      }
    }
  });

  if (isWatching) {
    await prisma.taskWatcher.delete({
      where: {
        taskId_userId: {
          taskId,
          userId: req.user.id
        }
      }
    });
    return sendResponse(res, 200, true, 'You stopped watching this task.', { watching: false });
  } else {
    await prisma.taskWatcher.create({
      data: {
        taskId,
        userId: req.user.id
      }
    });
    return sendResponse(res, 200, true, 'You are now watching this task.', { watching: true });
  }
};
