import { config } from './index.js';

export const content = {
  welcomeTitle: `🌟 Welcome to <b>${config.CHANNEL_NAME}</b>!`,
  welcomeDescription: `Gain exclusive, immediate access to our private premium community, VIP insights, market calls, and premium discussions.`,
  
  benefits: [
    '🔥 Real-time high-conviction signals & alerts',
    '📊 In-depth daily analysis & exclusive research',
    '💬 Private discussions with top community members',
    '⚡ Instant automated Telegram access 24/7',
    '🔒 100% secure payment via Razorpay (UPI, Cards, NetBanking)'
  ],

  demoCaption: `🖼️ <b>Sneak Peek Inside ${config.CHANNEL_NAME}</b>\n\nHere is a preview of the high-value insights, actionable alerts, and deep research shared daily in our VIP channel. Subscribe today to unlock full access!`,

  demoFallbackText: `🖼️ <b>Sneak Peek Inside ${config.CHANNEL_NAME}</b>\n\nInside our VIP Channel, you get:\n• 🎯 <b>High Accuracy Daily Calls</b>\n• 📈 <b>Live Chart Breakdowns & Key Levels</b>\n• 💡 <b>Portfolio Allocation & Risk Management</b>\n• 🎙️ <b>Exclusive Weekly Voice Discussions</b>\n\n<i>To display a custom preview image, place a <code>demo.png</code> in the project root or configure <code>DEMO_IMAGE_URL</code> in .env.</i>`,

  helpText: `ℹ️ <b>How it Works & Support FAQ</b>\n\n` +
    `1️⃣ <b>Payment</b>: Click <b>💳 Buy Premium</b> to open a secure Razorpay checkout link (UPI / GPay / PhonePe / Cards / NetBanking supported).\n` +
    `2️⃣ <b>Instant Access</b>: As soon as your payment is confirmed, this bot automatically creates and sends you a <b>single-use invite link</b> to join the private channel.\n` +
    `3️⃣ <b>Access Duration</b>: Your pass is valid for <b>${config.SUBSCRIPTION_DURATION_DAYS} days</b> from the time of payment.\n` +
    `4️⃣ <b>Status Check</b>: Send /status or click <b>📊 Status</b> anytime to verify your remaining subscription duration and invite link.\n\n` +
    `❓ <b>Paid but didn't receive link?</b>\n` +
    `If your payment went through, simply type /status — the bot will re-verify and re-generate your link. If you still have issues, contact our support team:\n` +
    `📩 <b>Support</b>: @${config.SUPPORT_USERNAME}`,

  paymentSuccessMessage: (channelName: string, inviteLink: string, expiryDate: string) => 
    `🎉 <b>Payment Successful! Welcome to ${channelName}!</b>\n\n` +
    `✅ Your subscription is now <b>Active</b>.\n` +
    `📅 <b>Valid until</b>: ${expiryDate}\n\n` +
    `🔗 <b>Your Exclusive Invite Link</b>:\n` +
    `${inviteLink}\n\n` +
    `⚠️ <i>Note: This is a single-use invite link created exclusively for your account. Please click the link above to join the channel immediately!</i>`,

  subscriptionExpiredNotification: (channelName: string) =>
    `⏳ <b>Subscription Expired</b>\n\n` +
    `Your premium access to <b>${channelName}</b> has ended.\n` +
    `To continue receiving VIP signals and access to the channel, please renew your subscription below.`,

  alreadySubscribedMessage: (expiryDate: string, hasJoined: boolean, inviteLink?: string | null) => {
    let msg = `✨ <b>You already have an Active Subscription!</b>\n\n` +
      `📅 <b>Expires on</b>: ${expiryDate}\n` +
      `📢 <b>Channel Access</b>: ${hasJoined ? 'Active ✅' : 'Pending Join ⏳'}\n\n`;

    if (inviteLink && !hasJoined) {
      msg += `🔗 <b>Here is your invite link</b>:\n${inviteLink}\n\n`;
    }

    msg += `If you need any help, contact @${config.SUPPORT_USERNAME}.`;
    return msg;
  }
};
