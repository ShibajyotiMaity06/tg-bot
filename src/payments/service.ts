import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export interface RecordPaymentParams {
  userId: string;
  subscriptionId?: string | null;
  razorpayPaymentId: string;
  razorpayOrderId?: string | null;
  amount: number;
  currency?: string;
  status?: string;
}

export async function recordPayment(params: RecordPaymentParams) {
  const {
    userId,
    subscriptionId,
    razorpayPaymentId,
    razorpayOrderId,
    amount,
    currency = 'INR',
    status = 'CAPTURED'
  } = params;

  try {
    // Check if payment was already recorded
    const existing = await prisma.payment.findUnique({
      where: { razorpayPaymentId }
    });

    if (existing) {
      logger.info(`Payment ${razorpayPaymentId} already recorded, updating status if needed`);
      return prisma.payment.update({
        where: { id: existing.id },
        data: {
          status,
          subscriptionId: subscriptionId || existing.subscriptionId
        }
      });
    }

    return await prisma.payment.create({
      data: {
        userId,
        subscriptionId,
        razorpayPaymentId,
        razorpayOrderId,
        amount,
        currency,
        status
      }
    });
  } catch (error: any) {
    logger.error(`Error recording payment ${razorpayPaymentId}:`, { error: error.message });
    throw error;
  }
}

export async function getPaymentByRazorpayId(razorpayPaymentId: string) {
  return prisma.payment.findUnique({
    where: { razorpayPaymentId }
  });
}
