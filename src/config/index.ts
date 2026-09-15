import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Telegram Config
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHANNEL_ID: z.string().min(1, 'TELEGRAM_CHANNEL_ID is required'),
  TELEGRAM_MODE: z.enum(['polling', 'webhook']).default('polling'),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),

  // Razorpay Config
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  RAZORPAY_PLAN_ID: z.string().optional().default(''),

  // Bot & Channel Customization
  BOT_USERNAME: z.string().default('PremiumAccessBot'),
  CHANNEL_NAME: z.string().default('VIP Premium Channel'),
  SUPPORT_USERNAME: z.string().default('support'),

  // Demo settings (Video / Image)
  DEMO_VIDEO_PATH: z.string().default('demo.mp4'),
  DEMO_VIDEO_URL: z.string().optional().default(''),
  DEMO_IMAGE_PATH: z.string().default('demo.png'),
  DEMO_IMAGE_URL: z.string().optional().default(''),

  // Pricing & Subscription Duration
  PREMIUM_PRICE_INR: z.string().default('499').transform(Number),
  SUBSCRIPTION_DURATION_DAYS: z.string().default('30').transform(Number),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
  return result.data || (process.env as unknown as z.infer<typeof envSchema>);
};

export const config = parseEnv();
export type Config = z.infer<typeof envSchema>;
