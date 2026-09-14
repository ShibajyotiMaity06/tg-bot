import { bot } from '../telegram/client.js';
import { handleStart } from './handlers/start.js';
import { handleDemo } from './handlers/demo.js';
import { handleBuy } from './handlers/buy.js';
import { handleStatus } from './handlers/status.js';
import { handleHelp } from './handlers/help.js';
import { logger } from '../utils/logger.js';

export function setupBotHandlers() {
  // Commands
  bot.command('start', handleStart);
  bot.command('demo', handleDemo);
  bot.command('buy', handleBuy);
  bot.command('status', handleStatus);
  bot.command('help', handleHelp);

  // Callback query actions from inline buttons
  bot.callbackQuery('see_demo', handleDemo);
  bot.callbackQuery('buy_premium', handleBuy);
  bot.callbackQuery('check_status', handleStatus);
  bot.callbackQuery('show_help', handleHelp);
  bot.callbackQuery('back_to_menu', handleStart);

  // Catch unhandled messages
  bot.on('message:text', async (ctx) => {
    // If unknown text received, offer start menu
    await ctx.reply(
      '👋 Please choose an option from the menu below or send /start:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Open Menu', callback_data: 'back_to_menu' }]
          ]
        }
      }
    );
  });

  logger.info('Registered all Telegram bot commands and action handlers');
}
