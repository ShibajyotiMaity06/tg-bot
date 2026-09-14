# 🤖 Paid Telegram Private Channel Access Bot (Razorpay Backend)

A complete, production-ready backend for managing paid access to private Telegram channels using **Node.js**, **TypeScript**, **Express**, **Prisma ORM**, **SQLite**, **GrammY (Telegram Bot API)**, and **Razorpay**.

---

## 🚀 Key Features

* **Instant Channel Access**: Automatically generates a secure, **single-use invite link** (`member_limit = 1`) immediately upon verified payment.
* **Razorpay Payment Verification**: Strict HMAC SHA-256 signature verification and **idempotent webhook handling** for `payment.captured`, `order.paid`, `subscription.activated`, and more.
* **Automated Access Revocation**: Background cron job runs periodically to detect expired subscriptions and revokes/kicks users from the private channel.
* **Dual Operation Modes**:
  * `TELEGRAM_MODE=polling`: Plug-and-play for local development without needing HTTPS.
  * `TELEGRAM_MODE=webhook`: Fast, scalable production setup.
* **Configurable Experience**: Easily customize bot messages, channel name, pricing, subscription duration, support username, and demo assets without touching business logic.
* **Zero Duplicate Grants**: Safe checks ensure that active subscribers are reminded of their validity and provided their link rather than charged redundantly.

---

## 📁 Project Structure

```text
├── prisma/
│   └── schema.prisma          # Database models (User, Subscription, Payment, TelegramAccess)
├── src/
│   ├── access/
│   │   └── service.ts         # Channel access granting, revocation, link re-issuance
│   ├── bot/
│   │   ├── bot.ts             # Bot handler registration
│   │   ├── handlers/          # /start, /demo, /buy, /status, /help handlers
│   │   ├── keyboards/         # Telegram inline keyboards
│   │   └── messages/          # Text templates & marketing copy
│   ├── config/
│   │   ├── content.ts         # Configurable bot messages & benefits
│   │   └── index.ts           # Zod-validated environment config
│   ├── jobs/
│   │   └── expiryJob.ts       # Cron job for subscription expiry & auto-kick
│   ├── middleware/
│   │   ├── errorHandler.ts    # Centralized error handler
│   │   └── rateLimiter.ts     # Rate limiting for webhooks and APIs
│   ├── payments/
│   │   └── service.ts         # Payment records and idempotency checks
│   ├── razorpay/
│   │   ├── client.ts          # Razorpay client instance
│   │   ├── service.ts         # Checkout / subscription link generator
│   │   └── verify.ts          # HMAC SHA-256 signature verification
│   ├── routes/
│   │   ├── health.ts          # GET /health
│   │   └── webhook.ts         # POST /webhooks/razorpay
│   ├── subscriptions/
│   │   └── service.ts         # Subscription lifecycle & renewal logic
│   ├── telegram/
│   │   ├── client.ts          # Grammy bot instance
│   │   ├── invite.ts          # Single-use invite link generation
│   │   └── revoke.ts          # User kick / unban revocation logic
│   ├── users/
│   │   └── service.ts         # User database queries & upserts
│   ├── utils/
│   │   ├── logger.ts          # Safe logger (redacts secrets)
│   │   └── prisma.ts          # Prisma client singleton
│   ├── app.ts                 # Express application setup
│   └── server.ts              # Entry point bootstrap
├── tests/                     # Unit and integration test suite
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Create a Telegram Bot with BotFather

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to choose a bot name and username (e.g. `MyVipChannelBot`).
3. Copy the **HTTP API Token** provided by BotFather (this is your `TELEGRAM_BOT_TOKEN`).
4. (Optional) Configure bot profile in BotFather:
   * Send `/setdescription` to set the introduction shown before users press Start.
   * Send `/setabouttext` to set the bot bio.
   * Send `/setuserpic` to upload the bot's avatar.
   * Send `/setcommands` and paste:
     ```text
     start - Open welcome menu and benefits
     demo - See sneak peek preview
     buy - Subscribe to VIP channel
     status - Check your subscription and access link
     help - How it works and support
     ```

---

### 2. Configure Your Private Telegram Channel

1. Create a **Private Channel** in Telegram (or use your existing private channel).
2. Go to **Channel Settings** > **Administrators** > **Add Administrator**.
3. Add your bot as an Administrator with the following permissions:
   * ✅ **Invite Users via Link** (Required to generate single-use invite links)
   * ✅ **Ban Users** (Required to revoke access when subscriptions expire)
4. Retrieve your **Channel ID**:
   * Forward any post from your private channel to [@userinfobot](https://t.me/userinfobot) or [@JsonDumpBot](https://t.me/JsonDumpBot).
   * Note the ID (it usually begins with `-100`, e.g., `-1001928374650`).
   * Put this into `TELEGRAM_CHANNEL_ID`.

---

### 3. Setup Razorpay

1. Create or log into your account at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Account & Settings** > **API Keys**.
3. Generate a **Key ID** and **Key Secret** (Use *Test Mode* for development).
4. (Optional for Recurring Subscriptions):
   * Go to **Subscriptions** > **Plans** > **Create Plan**.
   * Copy the **Plan ID** (e.g., `plan_ABC123XYZ`) and set it as `RAZORPAY_PLAN_ID` in `.env`.
   * *If you leave `RAZORPAY_PLAN_ID` empty, the system automatically creates standard Razorpay Payment Links for the configured `PREMIUM_PRICE_INR` and `SUBSCRIPTION_DURATION_DAYS`.*

---

### 4. Setup Razorpay Webhooks

1. In Razorpay Dashboard, go to **Account & Settings** > **Webhooks** > **Add New Webhook**.
2. **Webhook URL**: `https://yourdomain.com/webhooks/razorpay` *(for local testing, use ngrok or localtunnel, e.g., `https://xxxx.ngrok-free.app/webhooks/razorpay`)*.
3. **Secret**: Enter a strong secret string (and set it as `RAZORPAY_WEBHOOK_SECRET` in `.env`).
4. **Alert Email**: Enter your email.
5. **Active Events**: Select:
   * ✅ `payment.captured`
   * ✅ `order.paid`
   * ✅ `payment.failed`
   * ✅ `subscription.activated`
   * ✅ `subscription.charged`
   * ✅ `subscription.cancelled`
   * ✅ `subscription.halted`
   * ✅ `subscription.completed`
6. Click **Save Webhook**.

---

### 5. Environment Configuration

Copy the example file:

```bash
cp .env.example .env
```

Fill in your actual values:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL="file:./dev.db"

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
TELEGRAM_CHANNEL_ID="-1001234567890"

# Telegram Mode: "polling" for local dev, "webhook" for production
TELEGRAM_MODE="polling"
TELEGRAM_WEBHOOK_URL="https://yourdomain.com/webhooks/telegram"

# Razorpay Credentials
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_key"
RAZORPAY_PLAN_ID=""

# Bot & Channel Branding
BOT_USERNAME="MyVipChannelBot"
CHANNEL_NAME="VIP Alpha Signals"
SUPPORT_USERNAME="your_support_handle"

# Pricing & Expiration
PREMIUM_PRICE_INR=499
SUBSCRIPTION_DURATION_DAYS=30

# Demo Assets
DEMO_IMAGE_PATH="demo.png"
DEMO_IMAGE_URL=""
```

---

### 6. Installation & Database Setup

```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to SQLite
npm run prisma:push

# 3. Generate Prisma Client
npm run prisma:generate
```

---

### 7. Running the Application

#### Development Mode (with hot-reload and polling)
```bash
npm run dev
```

#### Run Automated Test Suite
```bash
npm test
```

#### Build & Run Production Bundle
```bash
npm run build
npm start
```

---

## 🧪 Testing Locally

### 1. Test Telegram Bot
1. Open Telegram and search for your bot.
2. Send `/start`.
3. Test inline buttons:
   * Click **🖼️ See Demo**: Displays your `demo.png` or fallback preview.
   * Click **ℹ️ Help & FAQ**: Shows instructions and support contact.
   * Click **📊 Status**: Shows current inactive state.
   * Click **💳 Buy Premium**: Generates a test Razorpay checkout link.

### 2. Test Payment & Webhooks
1. Open the generated Razorpay checkout link in test mode and complete a dummy payment (UPI / Card / NetBanking).
2. If testing locally with ngrok (`ngrok http 3000`), Razorpay will send the `payment.captured` webhook to your server.
3. Your server will:
   * Verify the signature.
   * Activate the subscription for the user in SQLite.
   * Call the Telegram API to create a unique single-use invite link.
   * Deliver the invite link directly to the user in their Telegram chat.
4. Click the invite link to join the channel!

---

## ⏰ Subscription Expiry & Access Revocation

* The backend has a built-in lightweight cron job that runs **every 5 minutes**.
* When a subscription's `endDate` has passed:
  1. Marks subscription as `EXPIRED`.
  2. Kicks the user from the private channel (`banChatMember` + `unbanChatMember`).
  3. Updates access status to `REVOKED`.
  4. Automatically notifies the user on Telegram with a renewal button.

---

## 🔒 Security Best Practices Implemented

* **Strict HMAC SHA-256 Webhook Verification**: Constant-time comparison prevents timing attacks.
* **Idempotent Webhooks**: Repeated or duplicate webhook events are safely acknowledged without duplicating records.
* **Zod Environment Validation**: Prevents starting the server with missing or invalid configs.
* **Zero Secret Logging**: Logger masks sensitive values like keys, tokens, and authorization headers.
* **Rate Limiting & Helmet**: Protects API and webhook endpoints from flooding and abuse.

---

## 📜 License
MIT
