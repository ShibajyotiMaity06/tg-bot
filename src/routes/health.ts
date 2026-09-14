import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';

export const healthRouter = Router();

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
