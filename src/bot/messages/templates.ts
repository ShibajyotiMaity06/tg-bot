import { config } from '../../config/index.js';
import { content } from '../../config/content.js';

export function getStartMessage(firstName?: string | null): string {
  const greeting = firstName ? `Hello <b>${firstName}</b>! 👋\n\n` : '';
  
  const benefitsList = content.benefits.map(b => `  • ${b}`).join('\n');

  return `${greeting}${content.welcomeTitle}\n\n` +
    `${content.welcomeDescription}\n\n` +
    `💎 <b>What you receive inside:</b>\n` +
    `${benefitsList}\n\n` +
    `⚡ <b>Price</b>: ₹${config.PREMIUM_PRICE_INR} / ${config.SUBSCRIPTION_DURATION_DAYS} Days\n\n` +
    `👇 <i>Select an option below to get started:</i>`;
}

export function getDemoMessage(): { caption: string; fallback: string } {
  return {
    caption: content.demoCaption,
    fallback: content.demoFallbackText
  };
}

export function getStatusMessage(data: {
  hasActiveSub: boolean;
  expiryDate?: string;
  hasAccessRecord: boolean;
  inviteLink?: string | null;
  statusText?: string;
}): string {
  if (data.hasActiveSub) {
    let msg = `📊 <b>Your Premium Subscription Status</b>\n\n` +
      `• <b>Status</b>: 🟢 <code>Active</code>\n` +
      `• <b>Expires</b>: <code>${data.expiryDate || 'N/A'}</code>\n` +
      `• <b>Channel Access</b>: <code>${data.statusText || 'Active'}</code>\n\n`;

    if (data.inviteLink) {
      msg += `🔗 <b>Your Access Link</b>:\n${data.inviteLink}\n\n`;
    }

    msg += `Enjoy uninterrupted access to ${config.CHANNEL_NAME}!`;
    return msg;
  }

  return `📊 <b>Your Premium Subscription Status</b>\n\n` +
    `• <b>Status</b>: 🔴 <code>Inactive / Expired</code>\n` +
    `• <b>Channel Access</b>: <code>Revoked / None</code>\n\n` +
    `Subscribe now to unlock exclusive VIP signals, analysis, and channel access!`;
}

export function getHelpMessage(): string {
  return content.helpText;
}
