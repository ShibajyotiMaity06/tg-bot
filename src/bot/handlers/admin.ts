import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '../../utils/prisma.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export async function handleAdminStats(ctx: Context) {
  if (!ctx.from) return;

  const telegramUserId = ctx.from.id.toString();
  const adminIds = config.ADMIN_TELEGRAM_ID.split(',').map(s => s.trim());

  // Check if sender is admin
  if (!adminIds.includes(telegramUserId)) {
    // Silently ignore or show permission denied
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: '⛔ Unauthorized', show_alert: true });
    }
    return;
  }

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  try {
    const now = new Date();

    // 1. Total users
    const totalUsers = await prisma.user.count();

    // 2. Active subscriptions
    const activeSubscribers = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: { gt: now }
      }
    });

    // 3. Expired subscriptions
    const expiredSubscribers = await prisma.subscription.count({
      where: {
        status: 'EXPIRED'
      }
    });

    // 4. Total payments & revenue
    const capturedPayments = await prisma.payment.findMany({
      where: { status: 'CAPTURED' },
      select: { amount: true }
    });

    const totalRevenue = capturedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalSuccessfulPayments = capturedPayments.length;

    // 5. Recent 5 users
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        telegramUserId: true,
        firstName: true,
        telegramUsername: true,
        createdAt: true
      }
    });

    const recentUsersText = recentUsers.length > 0
      ? recentUsers.map((u, i) => {
          const name = u.firstName || (u.telegramUsername ? `@${u.telegramUsername}` : `User ${u.telegramUserId}`);
          const date = u.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `  ${i + 1}. <b>${name}</b> (<code>${u.telegramUserId}</code>) - ${date}`;
        }).join('\n')
      : '  <i>No users registered yet</i>';

    const message =
      `👑 <b>Admin Dashboard & Live Statistics</b>\n\n` +
      `👥 <b>Total Users (Clicked /start)</b>: <code>${totalUsers}</code>\n` +
      `🟢 <b>Active VIP Subscribers</b>: <code>${activeSubscribers}</code>\n` +
      `🔴 <b>Expired Subscriptions</b>: <code>${expiredSubscribers}</code>\n\n` +
      `💳 <b>Successful Payments</b>: <code>${totalSuccessfulPayments}</code>\n` +
      `💰 <b>Total Revenue Earned</b>: <code>₹${totalRevenue.toLocaleString('en-IN')}</code>\n\n` +
      `🕒 <b>Recent Users</b>:\n` +
      `${recentUsersText}\n\n` +
      `<i>Updated: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</i>`;

    const keyboard = new InlineKeyboard()
      .text('🔄 Refresh Stats', 'refresh_admin_stats')
      .row()
      .text('🏠 Main Menu', 'back_to_menu');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  } catch (error: any) {
    logger.error('Error fetching admin statistics:', { error: error.message });
    await ctx.reply('⚠️ Error generating admin stats. Please try again.');
  }
}
