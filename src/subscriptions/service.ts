import { prisma } from '../utils/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function getUserActiveSubscription(userId: string) {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: {
        gt: now
      }
    },
    orderBy: {
      endDate: 'desc'
    }
  });
}

export interface ActivateSubscriptionParams {
  userId: string;
  razorpaySubscriptionId?: string | null;
  razorpayPlanId?: string | null;
  durationDays?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function activateSubscription(params: ActivateSubscriptionParams) {
  const {
    userId,
    razorpaySubscriptionId,
    razorpayPlanId,
    durationDays = config.SUBSCRIPTION_DURATION_DAYS,
    startDate = new Date(),
    endDate
  } = params;

  // Calculate calculated end date if not explicitly given
  const calculatedEndDate = endDate || new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // If user already has an active subscription ending in the future, extend it from the previous endDate
  const currentActive = await getUserActiveSubscription(userId);
  let finalEndDate = calculatedEndDate;

  if (currentActive && currentActive.endDate && currentActive.endDate > new Date()) {
    finalEndDate = new Date(currentActive.endDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return prisma.subscription.update({
      where: { id: currentActive.id },
      data: {
        status: 'ACTIVE',
        endDate: finalEndDate,
        ...(razorpaySubscriptionId ? { razorpaySubscriptionId } : {}),
        ...(razorpayPlanId ? { razorpayPlanId } : {})
      }
    });
  }

  try {
    if (razorpaySubscriptionId) {
      const existing = await prisma.subscription.findUnique({
        where: { razorpaySubscriptionId }
      });

      if (existing) {
        return prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            startDate: existing.startDate || startDate,
            endDate: finalEndDate,
            razorpayPlanId: razorpayPlanId || existing.razorpayPlanId
          }
        });
      }
    }

    return prisma.subscription.create({
      data: {
        userId,
        ...(razorpaySubscriptionId ? { razorpaySubscriptionId } : {}),
        ...(razorpayPlanId ? { razorpayPlanId } : {}),
        status: 'ACTIVE',
        startDate,
        endDate: finalEndDate
      }
    });
  } catch (error: any) {
    logger.error('Error activating subscription:', { error: error.message, userId });
    throw error;
  }
}

export async function cancelSubscription(razorpaySubscriptionId: string) {
  try {
    return await prisma.subscription.update({
      where: { razorpaySubscriptionId },
      data: { status: 'CANCELLED' }
    });
  } catch (error: any) {
    logger.error(`Error cancelling subscription ${razorpaySubscriptionId}:`, { error: error.message });
    return null;
  }
}

export async function haltSubscription(razorpaySubscriptionId: string) {
  try {
    return await prisma.subscription.update({
      where: { razorpaySubscriptionId },
      data: { status: 'HALTED' }
    });
  } catch (error: any) {
    logger.error(`Error halting subscription ${razorpaySubscriptionId}:`, { error: error.message });
    return null;
  }
}
