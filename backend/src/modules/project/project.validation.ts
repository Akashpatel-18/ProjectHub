import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters long.'),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('ACTIVE'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters long.').optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
});
