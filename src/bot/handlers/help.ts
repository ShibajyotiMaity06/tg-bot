import { Context } from 'grammy';
import { getHelpMessage } from '../messages/templates.js';
import { getBackToMenuKeyboard } from '../keyboards/main.js';

export async function handleHelp(ctx: Context) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  const helpText = getHelpMessage();
  const keyboard = getBackToMenuKeyboard();

  await ctx.reply(helpText, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}
