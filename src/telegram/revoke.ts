import { bot } from './client.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Revokes a user's Telegram access by kicking them from the private channel.
 * Uses banChatMember + unbanChatMember so the user is evicted but free to re-join later upon re-subscribing.
 */
export async function revokeTelegramAccess(telegramUserId: string): Promise<boolean> {
  const numericUserId = Number(telegramUserId);
  if (isNaN(numericUserId)) {
    logger.error(`Cannot revoke access: Invalid telegramUserId "${telegramUserId}"`);
    return false;
  }

  try {
    // 1. Kick user from channel
    await bot.api.banChatMember(config.TELEGRAM_CHANNEL_ID, numericUserId);
    logger.info(`Banned user ${telegramUserId} from channel ${config.TELEGRAM_CHANNEL_ID}`);

    // 2. Unban user immediately so they can re-join with a new invite link in the future
    await bot.api.unbanChatMember(config.TELEGRAM_CHANNEL_ID, numericUserId, {
      only_if_banned: true
    });
    logger.info(`Unbanned user ${telegramUserId} to allow future subscriptions`);

    return true;
  } catch (error: any) {
    // Check if error is because user was not in channel
    if (error?.description?.includes('USER_NOT_PARTICIPANT') || error?.description?.includes('user not found')) {
      logger.warn(`User ${telegramUserId} was not a participant in the channel when revoking`);
      return true;
    }

    logger.error(`Error revoking channel access for user ${telegramUserId}:`, {
      error: error.message,
      channelId: config.TELEGRAM_CHANNEL_ID
    });
    return false;
  }
}
