import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../../lib/prisma';
import { sendResponse } from '../../utils/response';
import cloudinary from '../../config/cloudinary';
import { ENV } from '../../config/env';
import { subject } from '@casl/ability';

// Multer in-memory configuration (or local fallback disk storage)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

export const uploadAttachment = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  if (!req.user) return sendResponse(res, 401, false, 'Not authenticated.');
  const { taskId } = req.params;

  if (!req.file) {
    return sendResponse(res, 400, false, 'Please provide a file to upload.');
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Task not found.');
  }

  // CASL permissions check
  if (!req.ability || !req.ability.can('update', subject('Task', task))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to add attachments to this task.');
  }

  const fileName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const fileSize = req.file.size;

  let fileUrl = '';
  let publicId = '';

  // Cloudinary active indicator
  const hasCloudinary = ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_CLOUD_NAME !== 'placeholder_cloud';

  if (hasCloudinary) {
    try {
      // Upload using Stream
      const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'saas_pm_attachments' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        );
        stream.end(req.file!.buffer);
      });

      const result = await uploadPromise;
      fileUrl = result.secure_url;
      publicId = result.public_id;
      console.log('☁️ File successfully uploaded to Cloudinary:', fileUrl);
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      return sendResponse(res, 500, false, 'Failed to upload attachment to Cloudinary cloud.');
    }
  } else {
    // Fallback: Save file locally on disk!
    try {
      const uploadDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
      const savePath = path.join(uploadDir, safeName);
      
      fs.writeFileSync(savePath, req.file.buffer);
      
      // Serve locally
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${safeName}`;
      publicId = `local_${safeName}`;
      console.log('📂 File successfully saved locally (Fallback):', fileUrl);
    } catch (error) {
      console.error('❌ Disk upload fallback error:', error);
      return sendResponse(res, 500, false, 'Failed to save attachment locally.');
    }
  }

  // Insert into DB
  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      uploaderId: req.user.id,
      name: fileName,
      url: fileUrl,
      publicId,
      size: fileSize,
      mimeType
    }
  });

  // Track activity
  await prisma.activityLog.create({
    data: {
      workspaceId: req.workspace.id,
      taskId,
      actorId: req.user.id,
      action: 'FILE_UPLOADED',
      metadata: JSON.stringify({ filename: fileName, size: fileSize })
    }
  });

  // Emit event via Sockets
  const io = req.app.get('io');
  if (io) {
    io.to(req.workspace.slug).emit('task:updated', { taskId });
  }

  return sendResponse(res, 201, true, 'File uploaded successfully.', attachment);
};

export const deleteAttachment = async (req: Request, res: Response) => {
  if (!req.workspace) return sendResponse(res, 444, false, 'Workspace not found.');
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { task: true }
  });

  if (!attachment || attachment.task.workspaceId !== req.workspace.id) {
    return sendResponse(res, 404, false, 'Attachment not found.');
  }

  // CASL Check
  if (!req.ability || !req.ability.can('update', subject('Task', attachment.task))) {
    return sendResponse(res, 403, false, 'Forbidden. You do not have permission to delete attachments.');
  }

  // Delete from Cloudinary/Disk
  if (attachment.publicId.startsWith('local_')) {
    // Delete local file
    try {
      const fileName = attachment.publicId.replace('local_', '');
      const filePath = path.resolve(__dirname, '../../../uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.log('🗑️ Local file deleted:', filePath);
    } catch (e) {
      console.error('❌ Failed to delete local file from disk:', e);
    }
  } else {
    // Delete Cloudinary file
    try {
      await cloudinary.uploader.destroy(attachment.publicId);
      console.log('🗑️ Cloudinary file destroyed:', attachment.publicId);
    } catch (e) {
      console.error('❌ Cloudinary destroy error:', e);
    }
  }

  await prisma.attachment.delete({
    where: { id }
  });

  // Track activity
  if (req.user) {
    await prisma.activityLog.create({
      data: {
        workspaceId: req.workspace.id,
        taskId: attachment.taskId,
        actorId: req.user.id,
        action: 'FILE_DELETED',
        metadata: JSON.stringify({ filename: attachment.name })
      }
    });
  }

  const io = req.app.get('io');
  if (io) {
    io.to(req.workspace.slug).emit('task:updated', { taskId: attachment.taskId });
  }

  return sendResponse(res, 200, true, 'Attachment deleted successfully.');
};
