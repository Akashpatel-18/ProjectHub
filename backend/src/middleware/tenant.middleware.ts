import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import redis from "../lib/redis";
import { sendResponse } from "../utils/response";
import { defineUnifiedAbility } from "../casl/ability";

export const withWorkspaceTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return sendResponse(
        res,
        400,
        false,
        "Workspace slug parameter is missing.",
      );
    }

    if (!req.user) {
      return sendResponse(res, 401, false, "Authentication context not found.");
    }

    // Resolve workspace details
    const workspaceKey = `workspace:${slug}`;
    let workspaceStr = await redis.get(workspaceKey).catch(() => null);
    let workspace: any = null;

    if (workspaceStr) {
      console.log(`[Redis] CACHE HIT: Workspace (${slug})`);
      workspace = JSON.parse(workspaceStr);
    } else {
      console.log(`[Redis] CACHE MISS: Workspace (${slug})`);
      workspace = await prisma.workspace.findUnique({
        where: { slug },
      });
      if (workspace) {
        await redis
          .set(workspaceKey, JSON.stringify(workspace), "EX", 86400)
          .catch((e) =>
            console.error("[Redis Set Error Workspace]", e.message),
          ); // 24 hours
      }
    }

    if (!workspace) {
      return sendResponse(res, 444, false, "Workspace not found.");
    }

    // Load active membership with associated dynamic role and permission entries
    const memberKey = `workspace:${workspace.id}:user:${req.user.id}`;
    let memberStr = await redis.get(memberKey).catch(() => null);
    let memberContext: any = null;

    if (memberStr) {
      console.log(`[Redis] CACHE HIT: Workspace Member`);
      memberContext = JSON.parse(memberStr);
    } else {
      console.log(`[Redis] CACHE MISS: Workspace Member`);
      memberContext = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: req.user.id,
          },
        },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });
      if (memberContext) {
        await redis
          .set(memberKey, JSON.stringify(memberContext), "EX", 3600)
          .catch((e) => console.error("[Redis Set Error Member]", e.message)); // 1 hour
      }
    }

    if (!memberContext) {
      return sendResponse(
        res,
        403,
        false,
        "You are not a member of this workspace.",
      );
    }

    // 1. Extract Project Context if available
    // Check params, body, and query in that order of precedence
    let projectId =
      req.params.projectId || req.body.projectId || req.query.projectId;

    // If we only have taskId, we must look up its projectId
    if (!projectId && req.params.taskId) {
      const taskKey = `task:${req.params.taskId}:projectId`;
      let cachedProjectId = await redis.get(taskKey).catch(() => null);

      if (cachedProjectId) {
        projectId = cachedProjectId;
      } else {
        const task = await prisma.task.findUnique({
          where: { id: req.params.taskId },
          select: { projectId: true },
        });
        if (task) {
          projectId = task.projectId;
          await redis
            .set(taskKey, task.projectId, "EX", 86400)
            .catch(() => null); // 24 hours
        }
      }
    }

    let projectContext: { projectId: string; permissions: any[] } | undefined =
      undefined;

    if (projectId && typeof projectId === "string") {
      const projectMemberKey = `project:${projectId}:user:${req.user.id}`;
      let projectMemberStr = await redis
        .get(projectMemberKey)
        .catch(() => null);
      let projectMember: any = null;

      if (projectMemberStr) {
        projectMember = JSON.parse(projectMemberStr);
        console.log(`[Redis] CACHE HIT: Project Member`);
      } else {
        projectMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: projectId,
              userId: req.user.id,
            },
          },
          include: {
            role: {
              include: { permissions: true },
            },
          },
        });
        if (projectMember) {
          await redis
            .set(projectMemberKey, JSON.stringify(projectMember), "EX", 3600)
            .catch(() => null); // 1 hour
        }
        console.log(`[Redis] CACHE MISS: Project Member`);
      }

      if (projectMember) {
        projectContext = {
          projectId: projectId,
          permissions: projectMember.role.permissions,
        };
      }
    }

    // 2. Generate unified CASL ability (Workspace + Project Overrides)
    const ability = defineUnifiedAbility(
      req.user.id,
      memberContext.role.permissions,
      projectContext,
    );

    // Populate tenant details to Request context
    req.workspace = workspace;
    req.memberContext = memberContext;
    req.ability = ability;

    next();
  } catch (error) {
    console.error("❌ Tenant resolution error:", error);
    return sendResponse(
      res,
      500,
      false,
      "Failed to resolve workspace tenancy.",
    );
  }
};
