import http from 'http';
import app from './app';
import { ENV } from './config/env';
import { initSocketServer } from './sockets/socket.server';
import prisma from './lib/prisma';

const httpServer = http.createServer(app);

// Initialize Socket.io and attach to app for use in controllers
const io = initSocketServer(httpServer);
app.set('io', io);

// Graceful startup
const start = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');

    httpServer.listen(ENV.PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║        🚀 SaaS Project Management API is running        ║
╠══════════════════════════════════════════════════════════╣
║  HTTP  →  http://localhost:${ENV.PORT}                        ║
║  WS    →  ws://localhost:${ENV.PORT}  (Socket.io)             ║
║  Env   →  ${ENV.NODE_ENV.padEnd(42)}  ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

start();
