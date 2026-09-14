import { createApp } from './app.js';
import { config } from './config/index.js';
import { bot } from './telegram/client.js';
import { setupBotHandlers } from './bot/bot.js';
import { startSubscriptionExpiryJob } from './jobs/expiryJob.js';
import { prisma } from './utils/prisma.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('🚀 Starting Paid Telegram Channel Access Backend...');

  // 1. Verify Database connection
  try {
    await prisma.$connect();
    logger.info(' Connected to MongoDB database successfully');
  } catch (error: any) {
    logger.error('❌ Failed to connect to MongoDB database:', { error: error.message });
    process.exit(1);
  }

  // 2. Setup Bot Handlers
  setupBotHandlers();

  // 3. Create & Start Express Server
  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(` Server listening on http://localhost:${config.PORT}`);
  });

  // 4. Start Subscription Expiry Cron Job
  startSubscriptionExpiryJob();

  // 5. Start Telegram Bot
  if (config.TELEGRAM_MODE === 'webhook') {
    if (config.TELEGRAM_WEBHOOK_URL) {
      try {
        await bot.api.setWebhook(config.TELEGRAM_WEBHOOK_URL);
        logger.info(`🤖 Telegram bot webhook registered at: ${config.TELEGRAM_WEBHOOK_URL}`);
      } catch (err: any) {
        logger.error('Failed to set Telegram webhook:', { error: err.message });
      }
    } else {
      logger.warn('TELEGRAM_MODE is "webhook" but TELEGRAM_WEBHOOK_URL is not set.');
    }
  } else {
    logger.info('🤖 Starting Telegram bot in POLLING mode (Local Development)...');
    bot.start({
      onStart: (botInfo) => {
        logger.info(`🤖 Bot @${botInfo.username} started successfully`);
      }
    }).catch((err) => {
      logger.error('Telegram bot polling error:', { error: err.message });
    });
  }

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error:', { error: err.message, stack: err.stack });
  process.exit(1);
});
