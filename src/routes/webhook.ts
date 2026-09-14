import { Router, Request, Response } from 'express';
import { verifyRazorpayWebhookSignature } from '../razorpay/verify.js';
import { recordPayment, getPaymentByRazorpayId } from '../payments/service.js';
import { activateSubscription, cancelSubscription, haltSubscription } from '../subscriptions/service.js';
import { grantTelegramAccess, revokeUserChannelAccess } from '../access/service.js';
import { findOrCreateUser, getUserByTelegramId, getUserById } from '../users/service.js';
import { logger } from '../utils/logger.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

export const webhookRouter = Router();

webhookRouter.post('/webhooks/razorpay', webhookLimiter, async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // 1. Verify webhook signature
  const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
  if (!isValid) {
    logger.warn('Rejected invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  logger.info(`Received verified Razorpay webhook event: ${event}`);

  try {
    switch (event) {
      case 'payment.captured': {
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) break;

        const paymentId = paymentEntity.id;
        const orderId = paymentEntity.order_id || null;
        const amount = paymentEntity.amount / 100; // convert paise to INR
        const currency = paymentEntity.currency || 'INR';
        const notes = paymentEntity.notes || {};

        const telegramUserId = notes.telegramUserId;
        const providedUserId = notes.userId;

        // Idempotency: Check if this payment was already processed
        const existingPayment = await getPaymentByRazorpayId(paymentId);
        if (existingPayment && existingPayment.status === 'CAPTURED') {
          logger.info(`Payment ${paymentId} already processed and captured. Skipping redundant execution.`);
          return res.status(200).json({ status: 'ok', message: 'Already processed' });
        }

        // Find or create user
        let user = null;
        if (providedUserId) {
          user = await getUserById(providedUserId);
        }
        if (!user && telegramUserId) {
          user = await findOrCreateUser({ telegramUserId: telegramUserId.toString() });
        }

        if (!user) {
          logger.error(`Could not associate payment ${paymentId} with a Telegram user. Notes:`, { notes });
          return res.status(200).json({ status: 'ignored', reason: 'User not identifiable' });
        }

        // 1. Activate Subscription
        const subscription = await activateSubscription({
          userId: user.id
        });

        // 2. Record Payment
        await recordPayment({
          userId: user.id,
          subscriptionId: subscription.id,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          amount,
          currency,
          status: 'CAPTURED'
        });

        // 3. Grant Channel Access (creates single-use invite & sends message)
        await grantTelegramAccess(user.id, subscription.id);

        logger.info(`Successfully activated subscription and granted access for user ${user.telegramUserId} on payment ${paymentId}`);
        break;
      }

      case 'subscription.activated':
      case 'subscription.charged': {
        const subEntity = payload.subscription?.entity;
        const paymentEntity = payload.payment?.entity;
        if (!subEntity) break;

        const subId = subEntity.id;
        const planId = subEntity.plan_id;
        const notes = subEntity.notes || paymentEntity?.notes || {};
        const telegramUserId = notes.telegramUserId;

        let user = null;
        if (notes.userId) {
          user = await getUserById(notes.userId);
        }
        if (!user && telegramUserId) {
          user = await findOrCreateUser({ telegramUserId: telegramUserId.toString() });
        }

        if (!user) {
          logger.warn(`Could not identify user for subscription ${subId}`);
          break;
        }

        // Convert current_end unix timestamp if provided
        const endDate = subEntity.current_end ? new Date(subEntity.current_end * 1000) : undefined;
        const startDate = subEntity.current_start ? new Date(subEntity.current_start * 1000) : undefined;

        const subscription = await activateSubscription({
          userId: user.id,
          razorpaySubscriptionId: subId,
          razorpayPlanId: planId,
          startDate,
          endDate
        });

        if (paymentEntity) {
          await recordPayment({
            userId: user.id,
            subscriptionId: subscription.id,
            razorpayPaymentId: paymentEntity.id,
            razorpayOrderId: paymentEntity.order_id || null,
            amount: paymentEntity.amount / 100,
            currency: paymentEntity.currency || 'INR',
            status: 'CAPTURED'
          });
        }

        await grantTelegramAccess(user.id, subscription.id);
        break;
      }

      case 'subscription.cancelled': {
        const subEntity = payload.subscription?.entity;
        if (!subEntity) break;

        await cancelSubscription(subEntity.id);
        logger.info(`Subscription ${subEntity.id} marked as CANCELLED`);
        break;
      }

      case 'subscription.halted': {
        const subEntity = payload.subscription?.entity;
        if (!subEntity) break;

        await haltSubscription(subEntity.id);
        logger.info(`Subscription ${subEntity.id} marked as HALTED`);
        break;
      }

      case 'subscription.completed': {
        const subEntity = payload.subscription?.entity;
        if (!subEntity) break;

        const sub = await cancelSubscription(subEntity.id);
        if (sub) {
          await revokeUserChannelAccess(sub.userId);
        }
        logger.info(`Subscription ${subEntity.id} marked as COMPLETED and access revoked`);
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payment?.entity;
        if (paymentEntity) {
          const notes = paymentEntity.notes || {};
          let user = notes.userId ? await getUserById(notes.userId) : null;
          if (!user && notes.telegramUserId) {
            user = await getUserByTelegramId(notes.telegramUserId.toString());
          }

          if (user) {
            await recordPayment({
              userId: user.id,
              razorpayPaymentId: paymentEntity.id,
              razorpayOrderId: paymentEntity.order_id || null,
              amount: paymentEntity.amount / 100,
              currency: paymentEntity.currency || 'INR',
              status: 'FAILED'
            });
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled Razorpay webhook event: ${event}`);
    }

    return res.status(200).json({ status: 'success' });
  } catch (err: any) {
    logger.error('Error processing Razorpay webhook:', { error: err.message, stack: err.stack });
    // Still return 200 to acknowledge webhook so Razorpay doesn't perpetually retry on internal edge-cases
    return res.status(200).json({ status: 'error_handled', message: err.message });
  }
});
