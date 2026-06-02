import { z } from 'zod';

export const createTaskSchema = z.object({
  projectId: z.string().uuid('Provide a valid project identifier.'),
  title: z.string().min(2, 'Task title must be at least 2 characters long.'),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable().or(z.date()).transform((val) => val ? new Date(val) : null),
  assigneeId: z.string().uuid('Provide a valid assignee identifier.').optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters long.').optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable().or(z.date()).transform((val) => val ? new Date(val) : null).optional(),
  assigneeId: z.string().uuid('Provide a valid assignee identifier.').optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(2, 'Subtask title must be at least 2 characters long.'),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty.'),
});
