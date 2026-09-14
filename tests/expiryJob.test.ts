import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { processExpiredSubscriptions } from '../src/jobs/expiryJob.js';
import * as revokeModule from '../src/telegram/revoke.js';
import * as inviteModule from '../src/telegram/invite.js';

describe('Subscription Expiry Job', () => {
  beforeEach(async () => {
    await prisma.telegramAccess.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();

    vi.spyOn(revokeModule, 'revokeTelegramAccess').mockResolvedValue(true);
    vi.spyOn(inviteModule, 'sendTelegramMessage').mockResolvedValue({ message_id: 100 } as any);
  });

  it('should find expired subscriptions, mark them EXPIRED, and revoke channel access', async () => {
    // 1. Create a user
    const user = await prisma.user.create({
      data: {
        telegramUserId: '555444333',
        firstName: 'Tester'
      }
    });

    // 2. Create an expired subscription (ended 1 hour ago)
    const expiredSub = await prisma.subscription.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    });

    // 3. Create an active access record
    await prisma.telegramAccess.create({
      data: {
        userId: user.id,
        subscriptionId: expiredSub.id,
        status: 'ACTIVE',
        inviteLink: 'https://t.me/+old_link'
      }
    });

    // 4. Run the expiry background job
    const processed = await processExpiredSubscriptions();
    expect(processed).toBe(1);

    // Verify Subscription status is updated to EXPIRED
    const updatedSub = await prisma.subscription.findUnique({
      where: { id: expiredSub.id }
    });
    expect(updatedSub?.status).toBe('EXPIRED');

    // Verify TelegramAccess is marked REVOKED
    const updatedAccess = await prisma.telegramAccess.findFirst({
      where: { userId: user.id }
    });
    expect(updatedAccess?.status).toBe('REVOKED');
    expect(updatedAccess?.revokedAt).not.toBeNull();
  });

  it('should not revoke access if subscription is still valid', async () => {
    const user = await prisma.user.create({
      data: {
        telegramUserId: '111222333',
        firstName: 'ActiveUser'
      }
    });

    // Valid subscription (expires in 10 days)
    const activeSub = await prisma.subscription.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.telegramAccess.create({
      data: {
        userId: user.id,
        subscriptionId: activeSub.id,
        status: 'ACTIVE',
        inviteLink: 'https://t.me/+active_link'
      }
    });

    const processed = await processExpiredSubscriptions();
    expect(processed).toBe(0);

    const checkSub = await prisma.subscription.findUnique({
      where: { id: activeSub.id }
    });
    expect(checkSub?.status).toBe('ACTIVE');

    const checkAccess = await prisma.telegramAccess.findFirst({
      where: { userId: user.id }
    });
    expect(checkAccess?.status).toBe('ACTIVE');
  });
});
