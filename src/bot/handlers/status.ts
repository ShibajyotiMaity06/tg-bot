import { Context } from 'grammy';
import { findOrCreateUser } from '../../users/service.js';
import { getUserActiveSubscription } from '../../subscriptions/service.js';
import { ensureActiveAccessLink } from '../../access/service.js';
import { getStatusMessage } from '../messages/templates.js';
import { getStatusActiveKeyboard, getStatusInactiveKeyboard } from '../keyboards/main.js';
import { logger } from '../../utils/logger.js';

export async function handleStatus(ctx: Context) {
  if (!ctx.from) return;

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  const telegramUserId = ctx.from.id.toString();
  const telegramUsername = ctx.from.username || null;
  const firstName = ctx.from.first_name || null;

  try {
    const user = await findOrCreateUser({
      telegramUserId,
      telegramUsername,
      firstName
    });

    const activeSub = await getUserActiveSubscription(user.id);
    const latestAccess = user.telegramAccesses?.[0];

    if (activeSub && activeSub.endDate && activeSub.endDate > new Date()) {
      const formattedExpiry = activeSub.endDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      let inviteLink = latestAccess?.inviteLink || null;
      let statusText = latestAccess?.status || 'Active';

      // If invite link is missing or pending, attempt re-generation
      if (!inviteLink || latestAccess?.status === 'PENDING') {
        const newLink = await ensureActiveAccessLink(user.id, telegramUserId);
        if (newLink) {
          inviteLink = newLink;
          statusText = 'Active (Link Re-generated)';
        }
      }

      const message = getStatusMessage({
        hasActiveSub: true,
        expiryDate: formattedExpiry,
        hasAccessRecord: !!latestAccess,
        inviteLink,
        statusText
      });

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: getStatusActiveKeyboard(inviteLink)
      });
    } else {
      const message = getStatusMessage({
        hasActiveSub: false,
        hasAccessRecord: false
      });

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: getStatusInactiveKeyboard()
      });
    }
  } catch (error: any) {
    logger.error(`Error handling /status for user ${telegramUserId}:`, { error: error.message });
    await ctx.reply('⚠️ Unable to retrieve your status. Please try again later.');
  }
}
