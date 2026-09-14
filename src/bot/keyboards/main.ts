import { InlineKeyboard } from 'grammy';

export function getMainKeyboard() {
  return new InlineKeyboard()
    .text('🖼️ See Demo', 'see_demo')
    .text('💳 Buy Premium', 'buy_premium')
    .row()
    .text('📊 Status', 'check_status')
    .text('ℹ️ Help & FAQ', 'show_help');
}

export function getPaymentKeyboard(paymentUrl: string) {
  return new InlineKeyboard()
    .url('💳 Complete Payment via Razorpay', paymentUrl)
    .row()
    .text('🔄 Check My Status', 'check_status')
    .text('🔙 Back to Menu', 'back_to_menu');
}

export function getStatusInactiveKeyboard() {
  return new InlineKeyboard()
    .text('💳 Subscribe Now', 'buy_premium')
    .row()
    .text('🖼️ See Demo', 'see_demo')
    .text('ℹ️ Help', 'show_help');
}

export function getStatusActiveKeyboard(inviteLink?: string | null) {
  const kb = new InlineKeyboard();
  if (inviteLink) {
    kb.url('🚀 Open Channel Invite', inviteLink).row();
  }
  kb.text('🔄 Refresh Status', 'check_status')
    .text('🔙 Menu', 'back_to_menu');
  return kb;
}

export function getBackToMenuKeyboard() {
  return new InlineKeyboard()
    .text('💳 Buy Premium', 'buy_premium')
    .row()
    .text('🔙 Back to Main Menu', 'back_to_menu');
}
