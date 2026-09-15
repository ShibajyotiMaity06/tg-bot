import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';

export const healthRouter = Router();

// Root route (for basic keep-alive pings)
healthRouter.get('/', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: `${config.CHANNEL_NAME} Telegram Bot`,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Detailed health probe
healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Quick MongoDB ping
    await prisma.$runCommandRaw({ ping: 1 });

    res.status(200).json({
      status: 'ok',
      database: 'connected (mongodb)',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});
