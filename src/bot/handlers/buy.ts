import { Context } from 'grammy';
import { findOrCreateUser } from '../../users/service.js';
import { getUserActiveSubscription } from '../../subscriptions/service.js';
import { createCheckoutLink } from '../../razorpay/service.js';
import { getPaymentKeyboard, getStatusActiveKeyboard } from '../keyboards/main.js';
import { content } from '../../config/content.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export async function handleBuy(ctx: Context) {
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

    // 1. Check if user already has an active subscription
    const activeSub = await getUserActiveSubscription(user.id);
    if (activeSub && activeSub.endDate && activeSub.endDate > new Date()) {
      const formattedDate = activeSub.endDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const latestAccess = user.telegramAccesses?.[0];
      const hasJoined = latestAccess?.status === 'ACTIVE';
      const inviteLink = latestAccess?.inviteLink || null;

      const message = content.alreadySubscribedMessage(formattedDate, hasJoined, inviteLink);
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: getStatusActiveKeyboard(inviteLink)
      });
      return;
    }

    // 2. Create Razorpay checkout link
    const checkout = await createCheckoutLink({
      userId: user.id,
      telegramUserId,
      userName: firstName || telegramUsername || undefined
    });

    const paymentText =
      `💳 <b>Subscribe to ${config.CHANNEL_NAME}</b>\n\n` +
      `• <b>Plan</b>: ${config.SUBSCRIPTION_DURATION_DAYS} Days VIP Access\n` +
      `• <b>Amount</b>: ₹${config.PREMIUM_PRICE_INR}\n` +
      `• <b>Payment Methods</b>: UPI (GPay/PhonePe/Paytm), Cards, NetBanking\n\n` +
      `👉 Click the secure Razorpay button below to complete your payment.\n` +
      `<i>Once payment is confirmed, you will instantly receive your exclusive channel invite link!</i>`;

    await ctx.reply(paymentText, {
      parse_mode: 'HTML',
      reply_markup: getPaymentKeyboard(checkout.paymentUrl)
    });
  } catch (error: any) {
    logger.error(`Error in handleBuy for user ${telegramUserId}:`, { error: error.message });
    await ctx.reply(
      '⚠️ Unable to generate payment link at the moment. Please try again shortly or contact support.',
      {
        parse_mode: 'HTML'
      }
    );
  }
}
