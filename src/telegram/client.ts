import { Bot } from 'grammy';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(`Error handling update ${ctx.update.update_id}:`, {
    error: err.error,
    message: err.message
  });
});
