import { Context } from 'grammy';
import { findOrCreateUser } from '../../users/service.js';
import { getStartMessage } from '../messages/templates.js';
import { getMainKeyboard } from '../keyboards/main.js';
import { logger } from '../../utils/logger.js';

export async function handleStart(ctx: Context) {
  if (!ctx.from) return;

  const telegramUserId = ctx.from.id.toString();
  const telegramUsername = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;

  try {
    await findOrCreateUser({
      telegramUserId,
      telegramUsername,
      firstName
    });

    const text = getStartMessage(firstName);
    const keyboard = getMainKeyboard();

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  } catch (error: any) {
    logger.error(`Error handling /start for user ${telegramUserId}:`, { error: error.message });
    await ctx.reply('⚠️ Something went wrong. Please try again or contact support.');
  }
}
