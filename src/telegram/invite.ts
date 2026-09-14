import { bot } from './client.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface CreateInviteLinkOptions {
  name?: string;
  expireSeconds?: number;
}

/**
 * Creates a unique single-use invite link for the private Telegram channel.
 * @param telegramUserId User's Telegram ID for reference/naming
 * @param options Link expiration options
 */
export async function createTelegramInviteLink(
  telegramUserId: string,
  options?: CreateInviteLinkOptions
): Promise<string> {
  const expireDate = options?.expireSeconds
    ? Math.floor(Date.now() / 1000) + options.expireSeconds
    : Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // Default link expires in 7 days if not used

  const linkName = options?.name || `VIP-${telegramUserId.slice(-4)}-${Date.now().toString().slice(-4)}`;

  try {
    const invite = await bot.api.createChatInviteLink(config.TELEGRAM_CHANNEL_ID, {
      name: linkName,
      expire_date: expireDate,
      member_limit: 1, // Single-use invite link
      creates_join_request: false
    });

    logger.info(`Generated single-use invite link for user ${telegramUserId}`, {
      inviteLink: invite.invite_link,
      expireDate
    });

    return invite.invite_link;
  } catch (error: any) {
    logger.error(`Failed to create chat invite link for user ${telegramUserId}:`, {
      error: error.message,
      channelId: config.TELEGRAM_CHANNEL_ID
    });
    throw error;
  }
}

/**
 * Sends a direct message to a user on Telegram.
 */
export async function sendTelegramMessage(telegramUserId: string, text: string, options?: any) {
  try {
    const result = await bot.api.sendMessage(telegramUserId, text, {
      parse_mode: 'HTML',
      ...options
    });
    return result;
  } catch (error: any) {
    logger.error(`Failed to send message to Telegram user ${telegramUserId}:`, {
      error: error.message
    });
    throw error;
  }
}
