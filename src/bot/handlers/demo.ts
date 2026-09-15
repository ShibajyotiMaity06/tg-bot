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
    // 1. Check if local demo video exists (e.g., demo.mp4 in root)
    const localVideoPath = path.resolve(process.cwd(), config.DEMO_VIDEO_PATH);
    if (fs.existsSync(localVideoPath)) {
      await ctx.replyWithVideo(new InputFile(localVideoPath), {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 2. Check if remote demo video URL is configured
    if (config.DEMO_VIDEO_URL && config.DEMO_VIDEO_URL.trim().length > 0) {
      await ctx.replyWithVideo(config.DEMO_VIDEO_URL, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 3. Fallback: Check if a local demo image exists (demo.png)
    const localImagePath = path.resolve(process.cwd(), config.DEMO_IMAGE_PATH);
    if (fs.existsSync(localImagePath)) {
      await ctx.replyWithPhoto(new InputFile(localImagePath), {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 4. Fallback: Check if remote demo image URL is configured
    if (config.DEMO_IMAGE_URL && config.DEMO_IMAGE_URL.trim().length > 0) {
      await ctx.replyWithPhoto(config.DEMO_IMAGE_URL, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      return;
    }

    // 5. Fallback to rich preview text if no media file is found
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
