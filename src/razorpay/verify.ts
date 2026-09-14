import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Validates the Razorpay Webhook Signature using HMAC SHA-256 and constant-time string comparison.
 * @param rawBody Raw request body buffer or string
 * @param signature Signature from 'x-razorpay-signature' header
 */
export function verifyRazorpayWebhookSignature(rawBody: string | Buffer, signature: string | undefined): boolean {
  if (!signature) {
    logger.warn('Razorpay signature verification failed: Missing signature header');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      logger.warn('Razorpay signature verification failed: Signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    if (!isValid) {
      logger.warn('Razorpay signature verification failed: Signatures do not match');
    }

    return isValid;
  } catch (error: any) {
    logger.error('Error during Razorpay signature verification:', { error: error.message });
    return false;
  }
}
