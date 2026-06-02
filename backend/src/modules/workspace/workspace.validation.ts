import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters long.'),
  slug: z.string().min(2, 'Slug must be at least 2 characters long.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes.'),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Provide a valid email address.'),
  roleId: z.string().uuid('Provide a valid role identifier.'),
});

export const updateMemberRoleSchema = z.object({
  roleId: z.string().uuid('Provide a valid role identifier.'),
});
