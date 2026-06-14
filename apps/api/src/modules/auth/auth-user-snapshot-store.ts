import { Redis } from "ioredis";
import { userPublicSchema, type UserPublic } from "@bjcp-arena/contracts";
import type { StoredUser } from "../users/users.types.js";
import { toPublicUser } from "../users/user-mapper.js";

export type AuthUserSnapshot = UserPublic;

export interface AuthUserSnapshotStore {
  get(userId: number): Promise<AuthUserSnapshot | null>;
  set(snapshot: AuthUserSnapshot): Promise<void>;
  delete(userId: number): Promise<void>;
  close(): Promise<void>;
}

function authUserSnapshotKey(userId: number): string {
  return `auth-user:${userId}`;
}

export function toAuthUserSnapshot(user: StoredUser): AuthUserSnapshot {
  return toPublicUser(user);
}

export function serializeAuthUserSnapshot(snapshot: AuthUserSnapshot): string {
  return JSON.stringify(userPublicSchema.strict().parse(snapshot));
}

export function parseAuthUserSnapshotValue(value: string): AuthUserSnapshot {
  return userPublicSchema.strict().parse(JSON.parse(value));
}

export function createRedisAuthUserSnapshotStore(
  redisUrl: string,
  ttlSeconds: number
): AuthUserSnapshotStore {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
  });

  return {
    async get(userId) {
      const value = await redis.get(authUserSnapshotKey(userId));
      return value === null ? null : parseAuthUserSnapshotValue(value);
    },

    async set(snapshot) {
      await redis.set(
        authUserSnapshotKey(snapshot.id),
        serializeAuthUserSnapshot(snapshot),
        "EX",
        ttlSeconds
      );
    },

    async delete(userId) {
      await redis.del(authUserSnapshotKey(userId));
    },

    async close() {
      redis.disconnect();
    },
  };
}

export function createMemoryAuthUserSnapshotStore(
  initialSnapshots: AuthUserSnapshot[] = []
): AuthUserSnapshotStore {
  const snapshots = new Map<number, AuthUserSnapshot>(
    initialSnapshots.map((snapshot) => [snapshot.id, { ...snapshot }])
  );

  return {
    async get(userId) {
      const snapshot = snapshots.get(userId);
      return snapshot ? { ...snapshot } : null;
    },

    async set(snapshot) {
      snapshots.set(snapshot.id, { ...snapshot });
    },

    async delete(userId) {
      snapshots.delete(userId);
    },

    async close() {
      snapshots.clear();
    },
  };
}
