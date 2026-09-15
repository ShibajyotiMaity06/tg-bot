import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export interface UpsertUserParams {
  telegramUserId: string;
  telegramUsername?: string | null;
  firstName?: string | null;
}

export async function findOrCreateUser(params: UpsertUserParams) {
  const { telegramUserId, telegramUsername, firstName } = params;

  try {
    let user = await prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        telegramAccesses: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (user) {
      if (
        (telegramUsername && telegramUsername !== user.telegramUsername) ||
        (firstName && firstName !== user.firstName)
      ) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramUsername: telegramUsername || user.telegramUsername,
            firstName: firstName || user.firstName,
          },
          include: {
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            telegramAccesses: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });
      }
      return user;
    }

    return await prisma.user.create({
      data: {
        telegramUserId,
        ...(telegramUsername ? { telegramUsername } : {}),
        ...(firstName ? { firstName } : {}),
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        telegramAccesses: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  } catch (error: any) {
    logger.error(`Error finding or creating user ${telegramUserId}:`, { error: error.message });
    throw error;
  }
}

export async function getUserByTelegramId(telegramUserId: string) {
  return prisma.user.findUnique({
    where: { telegramUserId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      telegramAccesses: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      telegramAccesses: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
}
