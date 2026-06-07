import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { sendResponse } from "../../utils/response";
import { subject } from "@casl/ability";

export const getActivityLogs = async (req: Request, res: Response) => {
  if (!req.workspace)
    return sendResponse(res, 444, false, "Workspace not found.");
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  const workspaceRoleName = req.memberContext?.role?.name;
  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string) || 10;

  let whereClause: any = { workspaceId: req.workspace.id };

  if (workspaceRoleName !== "Owner") {
    // Admin sees projects they created + assigned
    // Member/Guest sees assigned projects
    const projectMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true },
    });
    let accessibleProjectIds = projectMemberships.map((m) => m.projectId);

    if (workspaceRoleName === "Admin") {
      const createdProjects = await prisma.project.findMany({
        where: { workspaceId: req.workspace.id, createdById: req.user.id },
        select: { id: true },
      });
      accessibleProjectIds = [
        ...accessibleProjectIds,
        ...createdProjects.map((p) => p.id),
      ];
    }

    whereClause = {
      workspaceId: req.workspace.id,
      OR: [
        {
          action: {
            in: ["WORKSPACE_CREATED", "MEMBER_INVITED", "MEMBER_JOINED"],
          },
        },
        ...(accessibleProjectIds.length > 0
          ? [
              { task: { projectId: { in: accessibleProjectIds } } },
              ...accessibleProjectIds.map((id) => ({
                metadata: { contains: id },
              })),
            ]
          : []),
      ],
    };
  }

  const logs = await prisma.activityLog.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      task: {
        include: {
          project: true,
        },
      },
    },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  let nextCursor: string | undefined = undefined;
  if (logs.length > limit) {
    logs.pop(); // Remove the extra item
    nextCursor = logs[logs.length - 1].id; // Set cursor to the last item of the CURRENT page
  }

  return sendResponse(res, 200, true, "Workspace activity logs fetched.", {
    data: logs,
    nextCursor,
  });
};
