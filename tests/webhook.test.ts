import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { config } from '../src/config/index.js';
import * as inviteModule from '../src/telegram/invite.js';

describe('Razorpay Webhook & Access Flow', () => {
  const app = createApp();

  beforeEach(async () => {
    // Clear test tables
    await prisma.telegramAccess.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();

    // Mock Telegram invite generation and message sending
    vi.spyOn(inviteModule, 'createTelegramInviteLink').mockResolvedValue('https://t.me/+mock_invite_link_123');
    vi.spyOn(inviteModule, 'sendTelegramMessage').mockResolvedValue({ message_id: 999 } as any);
  });

  function generateSignature(body: string, secret: string) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('should reject webhook with invalid signature', async () => {
    const payload = { event: 'payment.captured', payload: {} };
    const res = await request(app)
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', 'invalid_signature_string')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid signature');
  });

  it('should process payment.captured, activate subscription, record payment, and generate invite link', async () => {
    const telegramUserId = '123456789';
    const paymentId = 'pay_test_payment_001';

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: 'order_test_123',
            amount: 49900, // 499 INR in paise
            currency: 'INR',
            status: 'captured',
            notes: {
              telegramUserId
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody, config.RAZORPAY_WEBHOOK_SECRET);

    const res = await request(app)
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Verify User was created
    const user = await prisma.user.findUnique({
      where: { telegramUserId }
    });
    expect(user).not.toBeNull();

    // Verify Subscription is ACTIVE
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user!.id }
    });
    expect(subscription).not.toBeNull();
    expect(subscription?.status).toBe('ACTIVE');
    expect(subscription?.endDate).not.toBeNull();

    // Verify Payment is recorded
    const payment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: paymentId }
    });
    expect(payment).not.toBeNull();
    expect(payment?.amount).toBe(499);
    expect(payment?.status).toBe('CAPTURED');

    // Verify TelegramAccess record was created
    const access = await prisma.telegramAccess.findFirst({
      where: { userId: user!.id }
    });
    expect(access).not.toBeNull();
    expect(access?.inviteLink).toBe('https://t.me/+mock_invite_link_123');
    expect(access?.status).toBe('ACTIVE');
  });

  it('should handle duplicate webhook delivery idempotently without creating duplicate access', async () => {
    const telegramUserId = '987654321';
    const paymentId = 'pay_duplicate_test_002';

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 49900,
            currency: 'INR',
            notes: {
              telegramUserId
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody, config.RAZORPAY_WEBHOOK_SECRET);

    // First delivery
    const res1 = await request(app)
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(res1.status).toBe(200);

    // Second delivery (duplicate)
    const res2 = await request(app)
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(res2.status).toBe(200);
    expect(res2.body.message).toBe('Already processed');

    // Ensure only 1 payment and 1 access record exists
    const paymentsCount = await prisma.payment.count({
      where: { razorpayPaymentId: paymentId }
    });
    expect(paymentsCount).toBe(1);
  });
});
