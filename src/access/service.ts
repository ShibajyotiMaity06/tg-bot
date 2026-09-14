import { prisma } from '../utils/prisma.js';
import { createTelegramInviteLink, sendTelegramMessage } from '../telegram/invite.js';
import { revokeTelegramAccess } from '../telegram/revoke.js';
import { config } from '../config/index.js';
import { content } from '../config/content.js';
import { logger } from '../utils/logger.js';
import { getUserActiveSubscription } from '../subscriptions/service.js';

/**
 * Grants channel access to a user after verified payment.
 * Generates single-use invite link, sends it to user via Telegram, and stores record in DB.
 */
export async function grantTelegramAccess(userId: string, subscriptionId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        orderBy: { endDate: 'desc' },
        take: 1
      }
    }
  });

  if (!user) {
    throw new Error(`Cannot grant access: User ${userId} not found`);
  }

  const activeSub = user.subscriptions[0];
  const expiryDateFormatted = activeSub?.endDate
    ? activeSub.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : `${config.SUBSCRIPTION_DURATION_DAYS} days from now`;

  let inviteLink: string | null = null;
  let status = 'ACTIVE';

  try {
    // 1. Generate unique single-use invite link
    inviteLink = await createTelegramInviteLink(user.telegramUserId);

    // 2. Send the invite link message to the user on Telegram
    const message = content.paymentSuccessMessage(config.CHANNEL_NAME, inviteLink, expiryDateFormatted);
    await sendTelegramMessage(user.telegramUserId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Join VIP Channel Now', url: inviteLink }]
        ]
      }
    });

    logger.info(`Successfully sent invite link to Telegram user ${user.telegramUserId}`);
  } catch (error: any) {
    logger.error(`Error delivering Telegram invite link to user ${user.telegramUserId}:`, {
      error: error.message
    });
    // Mark as PENDING so access is not lost and can be retried or claimed via /status
    status = 'PENDING';
  }

  // 3. Store TelegramAccess record
  const accessRecord = await prisma.telegramAccess.create({
    data: {
      userId: user.id,
      subscriptionId: subscriptionId || activeSub?.id,
      inviteLink,
      status,
      joinedAt: status === 'ACTIVE' ? new Date() : null
    }
  });

  return accessRecord;
}

/**
 * Revokes a user's channel access when subscription ends or cancels.
 */
export async function revokeUserChannelAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    logger.warn(`Cannot revoke access: User ${userId} not found`);
    return false;
  }

  // Kick user from Telegram channel
  const revoked = await revokeTelegramAccess(user.telegramUserId);

  // Update TelegramAccess records
  await prisma.telegramAccess.updateMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PENDING'] }
    },
    data: {
      status: 'REVOKED',
      revokedAt: new Date()
    }
  });

  // Notify user on Telegram about expiration
  try {
    const expiredMsg = content.subscriptionExpiredNotification(config.CHANNEL_NAME);
    await sendTelegramMessage(user.telegramUserId, expiredMsg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Renew Premium Access', callback_data: 'buy_premium' }]
        ]
      }
    });
  } catch (err: any) {
    logger.warn(`Could not send expiration notification to user ${user.telegramUserId}:`, { error: err.message });
  }

  logger.info(`Revoked channel access for user ${user.telegramUserId}`);
  return revoked;
}

/**
 * Re-issues an invite link for an active subscriber if link is pending or missing.
 */
export async function ensureActiveAccessLink(userId: string, telegramUserId: string) {
  const activeSub = await getUserActiveSubscription(userId);
  if (!activeSub) return null;

  try {
    const inviteLink = await createTelegramInviteLink(telegramUserId);
    await prisma.telegramAccess.create({
      data: {
        userId,
        subscriptionId: activeSub.id,
        inviteLink,
        status: 'ACTIVE',
        joinedAt: new Date()
      }
    });
    return inviteLink;
  } catch (error: any) {
    logger.error(`Failed to re-issue invite link for user ${telegramUserId}:`, { error: error.message });
    return null;
  }
}
