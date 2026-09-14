import { Context, InputFile } from 'grammy';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import { getDemoMessage } from '../messages/templates.js';
import { getBackToMenuKeyboard } from '../keyboards/main.js';
import { logger } from '../../utils/logger.js';

export async function handleDemo(ctx: Context) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  const { caption, fallback } = getDemoMessage();
  const keyboard = getBackToMenuKeyboard();

  try {
    // 1. Check if local demo image exists
    const localImagePath = path.resolve(process.cwd(), config.DEMO_IMAGE_PATH);
    if (fs.existsSync(localImagePath)) {
      await ctx.replyWithPhoto(new InputFile(localImagePath), {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 2. Check if remote demo image URL is configured
    if (config.DEMO_IMAGE_URL && config.DEMO_IMAGE_URL.trim().length > 0) {
      await ctx.replyWithPhoto(config.DEMO_IMAGE_URL, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 3. Fallback to rich preview text if no image file is found
    await ctx.reply(fallback, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } catch (error: any) {
    logger.error('Error handling demo request:', { error: error.message });
    await ctx.reply(fallback, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
}
