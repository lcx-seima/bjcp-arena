import { Redis } from "ioredis";

export interface AuthVersionStore {
  get(userId: number): Promise<number | null>;
  set(userId: number, authVersion: number): Promise<void>;
  close(): Promise<void>;
}

function authVersionKey(userId: number): string {
  return `auth-version:${userId}`;
}

export function parseAuthVersionValue(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid authVersion value in Redis: ${value}`);
  }

  const authVersion = Number(value);

  if (!Number.isSafeInteger(authVersion)) {
    throw new Error(`Invalid authVersion value in Redis: ${value}`);
  }

  return authVersion;
}

export function createRedisAuthVersionStore(redisUrl: string): AuthVersionStore {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
  });

  return {
    async get(userId) {
      const value = await redis.get(authVersionKey(userId));
      return value === null ? null : parseAuthVersionValue(value);
    },

    async set(userId, authVersion) {
      await redis.set(authVersionKey(userId), String(authVersion));
    },

    async close() {
      redis.disconnect();
    },
  };
}

export function createMemoryAuthVersionStore(
  initial?: Iterable<readonly [number, number]>
): AuthVersionStore {
  const versions = new Map(initial);

  return {
    async get(userId) {
      return versions.get(userId) ?? null;
    },

    async set(userId, authVersion) {
      versions.set(userId, authVersion);
    },

    async close() {
      versions.clear();
    },
  };
}
