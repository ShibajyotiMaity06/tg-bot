import { razorpay } from './client.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface CreatePaymentLinkParams {
  userId: string;
  telegramUserId: string;
  userName?: string;
}

export interface PaymentLinkResult {
  paymentUrl: string;
  orderOrSubscriptionId: string;
  type: 'subscription' | 'payment_link';
}

/**
 * Creates a Razorpay checkout URL for the user.
 * If RAZORPAY_PLAN_ID is configured, creates a recurring subscription.
 * Otherwise creates a Razorpay Payment Link.
 */
export async function createCheckoutLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  const { userId, telegramUserId, userName } = params;

  // 1. If Plan ID is configured, create Razorpay Subscription
  if (config.RAZORPAY_PLAN_ID && config.RAZORPAY_PLAN_ID.trim().length > 0) {
    try {
      logger.info(`Creating Razorpay Subscription for user ${telegramUserId} with plan ${config.RAZORPAY_PLAN_ID}`);
      
      const subscription = await razorpay.subscriptions.create({
        plan_id: config.RAZORPAY_PLAN_ID,
        total_count: 12, // 12 cycles
        quantity: 1,
        customer_notify: 1,
        notes: {
          telegramUserId,
          userId,
          channelName: config.CHANNEL_NAME,
        }
      });

      return {
        paymentUrl: (subscription as any).short_url,
        orderOrSubscriptionId: subscription.id,
        type: 'subscription'
      };
    } catch (error: any) {
      logger.error('Failed to create Razorpay Subscription, falling back to Payment Link:', {
        error: error.message,
        telegramUserId
      });
      // Fall through to payment link if subscription creation failed
    }
  }

  // 2. Create Razorpay Payment Link (One-time / Monthly access)
  try {
    logger.info(`Creating Razorpay Payment Link for user ${telegramUserId}`);
    
    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(config.PREMIUM_PRICE_INR * 100);
    const expireBy = Math.floor(Date.now() / 1000) + 24 * 3600; // Link valid for 24 hours

    const paymentLink = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      description: `${config.CHANNEL_NAME} - ${config.SUBSCRIPTION_DURATION_DAYS} Days Premium Access`,
      customer: {
        name: userName || `Telegram User ${telegramUserId}`,
        contact: undefined,
        email: undefined
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: false,
      notes: {
        telegramUserId,
        userId,
        channelName: config.CHANNEL_NAME,
      },
      expire_by: expireBy
    });

    return {
      paymentUrl: paymentLink.short_url,
      orderOrSubscriptionId: paymentLink.id,
      type: 'payment_link'
    };
  } catch (error: any) {
    logger.error('Failed to create Razorpay Payment Link:', {
      error: error.message,
      telegramUserId
    });
    throw error;
  }
}
