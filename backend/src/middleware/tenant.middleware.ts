import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendResponse } from '../utils/response';
import { defineAbilityForMember } from '../casl/ability';

export const withWorkspaceTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return sendResponse(res, 400, false, 'Workspace slug parameter is missing.');
    }

    if (!req.user) {
      return sendResponse(res, 401, false, 'Authentication context not found.');
    }

    // Resolve workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { slug }
    });

    if (!workspace) {
      return sendResponse(res, 444, false, 'Workspace not found.');
    }

    // Load active membership with associated dynamic role and permission entries
    const memberContext = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: req.user.id
        }
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!memberContext) {
      return sendResponse(res, 403, false, 'You are not a member of this workspace.');
    }

    // Generate dynamic CASL ability
    const ability = defineAbilityForMember(req.user.id, memberContext.role.permissions);

    // Populate tenant details to Request context
    req.workspace = workspace;
    req.memberContext = memberContext;
    req.ability = ability;

    next();
  } catch (error) {
    console.error('❌ Tenant resolution error:', error);
    return sendResponse(res, 500, false, 'Failed to resolve workspace tenancy.');
  }
};
