import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { revokeUserChannelAccess } from '../access/service.js';
import { logger } from '../utils/logger.js';

/**
 * Checks for expired subscriptions and revokes Telegram channel access.
 * Idempotent and safe to run frequently.
 */
export async function processExpiredSubscriptions(): Promise<number> {
  const now = new Date();

  try {
    // 1. Find all ACTIVE subscriptions whose endDate has passed
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: now
        }
      },
      include: {
        user: true
      }
    });

    if (expiredSubscriptions.length === 0) {
      return 0;
    }

    logger.info(`Found ${expiredSubscriptions.length} expired subscriptions to process`);

    let processedCount = 0;

    for (const sub of expiredSubscriptions) {
      try {
        // Mark subscription as EXPIRED
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' }
        });

        // Check if user has another active subscription (e.g., renewed earlier)
        const anotherActive = await prisma.subscription.findFirst({
          where: {
            userId: sub.userId,
            status: 'ACTIVE',
            endDate: {
              gt: now
            }
          }
        });

        if (!anotherActive) {
          // No active subscription remaining -> Revoke Telegram access
          await revokeUserChannelAccess(sub.userId);
          logger.info(`Revoked access for user ${sub.user.telegramUserId} due to expired subscription ${sub.id}`);
        } else {
          logger.info(`User ${sub.user.telegramUserId} has another active subscription (${anotherActive.id}). Access retained.`);
        }

        processedCount++;
      } catch (err: any) {
        logger.error(`Error processing expired subscription ${sub.id}:`, { error: err.message });
      }
    }

    return processedCount;
  } catch (error: any) {
    logger.error('Error during expired subscriptions background job:', { error: error.message });
    return 0;
  }
}

/**
 * Starts the recurring subscription expiry cron job (runs every 5 minutes).
 */
export function startSubscriptionExpiryJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running scheduled subscription expiry check...');
    await processExpiredSubscriptions();
  });

  logger.info('Started subscription expiry cron job (runs every 5 minutes)');
}
