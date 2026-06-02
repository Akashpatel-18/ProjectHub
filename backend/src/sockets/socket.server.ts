import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ENV } from '../config/env';

export let io: SocketIOServer;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ENV.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // Join workspace room — clients send their workspace slug on connect
    socket.on('workspace:join', (slug: string) => {
      socket.join(slug);
      console.log(`📡 Socket ${socket.id} joined workspace room: ${slug}`);
    });

    // Join personal user room for direct notifications
    socket.on('user:join', (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`👤 Socket ${socket.id} joined personal room: user_${userId}`);
    });

    // Typing indicators
    socket.on('user:typing', ({ workspaceSlug, taskId, userName }: { workspaceSlug: string; taskId: string; userName: string }) => {
      socket.to(workspaceSlug).emit('user:typing', { taskId, userName });
    });

    socket.on('user:stopped-typing', ({ workspaceSlug, taskId }: { workspaceSlug: string; taskId: string }) => {
      socket.to(workspaceSlug).emit('user:stopped-typing', { taskId });
    });

    socket.on('disconnect', () => {
      console.log(`⚡ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
