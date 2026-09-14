import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { webhookCallback } from 'grammy';
import { config } from './config/index.js';
import { bot } from './telegram/client.js';
import { healthRouter } from './routes/health.js';
import { webhookRouter } from './routes/webhook.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(cors());

  // Capture rawBody for accurate Razorpay webhook signature verification
  app.use(
    express.json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as any).rawBody = buf.toString('utf8');
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Telegram webhook endpoint if running in webhook mode
  if (config.TELEGRAM_MODE === 'webhook') {
    app.use('/webhooks/telegram', webhookCallback(bot, 'express'));
  }

  // Application routes
  app.use(healthRouter);
  app.use(webhookRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
