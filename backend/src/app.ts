import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import rateLimit from 'express-rate-limit';

// Routers
import authRouter from './modules/auth/auth.router';
import workspaceRouter from './modules/workspace/workspace.router';
import projectRouter from './modules/project/project.router';
import taskRouter from './modules/task/task.router';
import labelRouter from './modules/label/label.router';
import notificationRouter from './modules/notification/notification.router';
import activityRouter from './modules/activity/activity.router';
import searchRouter from './modules/search/search.router';

const app = express();

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: ENV.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve locally uploaded files if Cloudinary is not configured
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes' }
});

app.use('/api/', apiLimiter);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/workspaces', projectRouter);
app.use('/api/workspaces', taskRouter);
app.use('/api/workspaces', labelRouter);
app.use('/api/workspaces', activityRouter);
app.use('/api/workspaces', searchRouter);
app.use('/api/notifications', notificationRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ SaaS PM API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
