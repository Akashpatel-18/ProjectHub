import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { sendResponse } from "../../utils/response";

export const getNotifications = async (req: Request, res: Response) => {
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  let nextCursor: string | undefined = undefined;
  if (notifications.length > limit) {
    notifications.pop(); // Remove the extra item
    nextCursor = notifications[notifications.length - 1].id; // Set cursor to the last item of the CURRENT page
  }

  return sendResponse(res, 200, true, "Notifications fetched successfully.", {
    data: notifications,
    nextCursor,
  });
};

export const markAllAsRead = async (req: Request, res: Response) => {
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");

  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });

  return sendResponse(res, 200, true, "All notifications marked as read.");
};

export const markAsRead = async (req: Request, res: Response) => {
  if (!req.user) return sendResponse(res, 401, false, "Not authenticated.");
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== req.user.id) {
    return sendResponse(res, 404, false, "Notification not found.");
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return sendResponse(res, 200, true, "Notification marked as read.", updated);
};
