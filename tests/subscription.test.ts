import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { findOrCreateUser } from '../src/users/service.js';
import { activateSubscription, getUserActiveSubscription } from '../src/subscriptions/service.js';

describe('User and Subscription Service', () => {
  beforeEach(async () => {
    await prisma.telegramAccess.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should find or create user and update metadata', async () => {
    const u1 = await findOrCreateUser({
      telegramUserId: '1001',
      telegramUsername: 'john_doe',
      firstName: 'John'
    });

    expect(u1.telegramUserId).toBe('1001');
    expect(u1.telegramUsername).toBe('john_doe');

    const u2 = await findOrCreateUser({
      telegramUserId: '1001',
      telegramUsername: 'john_updated',
      firstName: 'Johnny'
    });

    expect(u2.id).toBe(u1.id);
    expect(u2.telegramUsername).toBe('john_updated');
    expect(u2.firstName).toBe('Johnny');
  });

  it('should extend subscription end date if renewed while active', async () => {
    const user = await findOrCreateUser({
      telegramUserId: '1002',
      firstName: 'Subscriber'
    });

    // Initial 30-day subscription
    const initialSub = await activateSubscription({
      userId: user.id,
      durationDays: 30
    });

    expect(initialSub.status).toBe('ACTIVE');
    const initialEnd = initialSub.endDate!.getTime();

    // Renew for another 30 days while active
    const renewedSub = await activateSubscription({
      userId: user.id,
      durationDays: 30
    });

    const renewedEnd = renewedSub.endDate!.getTime();
    // The renewed end time should be approximately 30 days AFTER the initialEnd
    const diffDays = Math.round((renewedEnd - initialEnd) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(30);

    const active = await getUserActiveSubscription(user.id);
    expect(active?.id).toBe(renewedSub.id);
  });
});
