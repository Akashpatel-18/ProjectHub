import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { sendResponse } from '../../utils/response';
import { z } from 'zod';

const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required.'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Provide a valid hex color starting with #.')
});

export const getLabels = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');

  const labels = await prisma.label.findMany({
    where: { workspaceId: req.workspace.id }
  });

  return sendResponse(res, 200, true, 'Labels fetched successfully.', labels);
};

export const createLabel = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  const validated = createLabelSchema.parse(req.body);

  // Check unique label name in workspace
  const existing = await prisma.label.findFirst({
    where: {
      workspaceId: req.workspace.id,
      name: { equals: validated.name, mode: 'insensitive' }
    }
  });

  if (existing) {
    return sendResponse(res, 400, false, 'A label with this name already exists in this workspace.');
  }

  const label = await prisma.label.create({
    data: {
      workspaceId: req.workspace.id,
      name: validated.name,
      color: validated.color
    }
  });

  return sendResponse(res, 201, true, 'Label created successfully.', label);
};
