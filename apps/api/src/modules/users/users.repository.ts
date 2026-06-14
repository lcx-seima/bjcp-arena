import { Prisma, type PrismaClient, type User as PrismaUser } from "@prisma/client";
import { nullableJudgeTypeSchema, type JudgeType } from "@bjcp-arena/contracts";
import { DuplicateUsernameError } from "./users.errors.js";
import type { CreateStoredUserInput, StoredUser } from "./users.types.js";

export interface UpdateStoredUserInput {
  username?: string;
  nickname?: string;
  roles?: number;
  judgeType?: JudgeType | null;
  disabled?: boolean;
}

export interface UserRepository {
  countUsers(): Promise<number>;
  findById(id: number): Promise<StoredUser | null>;
  findByUsername(username: string): Promise<StoredUser | null>;
  listUsers(): Promise<StoredUser[]>;
  createUser(input: CreateStoredUserInput): Promise<StoredUser>;
  updateUser(id: number, input: UpdateStoredUserInput): Promise<StoredUser | null>;
  resetPassword(id: number, passwordHash: string): Promise<StoredUser | null>;
}

export function cloneStoredUser(user: StoredUser): StoredUser {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

function toStoredUser(user: PrismaUser): StoredUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    passwordHash: user.passwordHash,
    roles: user.roles,
    judgeType: nullableJudgeTypeSchema.parse(user.judgeType ?? null),
    disabled: user.disabled,
    authVersion: user.authVersion,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

function toStoredUserOrNull(user: PrismaUser | null): StoredUser | null {
  return user ? toStoredUser(user) : null;
}

function shouldBumpAuthVersion(user: StoredUser, input: UpdateStoredUserInput) {
  return (
    (input.username !== undefined && input.username !== user.username) ||
    (input.judgeType !== undefined && input.judgeType !== user.judgeType) ||
    (input.roles !== undefined && input.roles !== user.roles) ||
    (input.disabled !== undefined && input.disabled !== user.disabled)
  );
}

function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isDuplicateUsernameError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("username");
  }
  return target === "username";
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    countUsers() {
      return prisma.user.count();
    },

    findById(id) {
      return prisma.user.findUnique({ where: { id } }).then((user) => toStoredUserOrNull(user));
    },

    findByUsername(username) {
      return prisma.user
        .findUnique({ where: { username } })
        .then((user) => toStoredUserOrNull(user));
    },

    listUsers() {
      return prisma.user.findMany({
        orderBy: { id: "asc" },
      }).then((users) => users.map(toStoredUser));
    },

    async createUser(input) {
      try {
        const created = await prisma.user.create({ data: input });
        return toStoredUser(created);
      } catch (error) {
        if (isDuplicateUsernameError(error)) {
          throw new DuplicateUsernameError();
        }
        throw error;
      }
    },

    async updateUser(id, input) {
      const user = await prisma.user
        .findUnique({ where: { id } })
        .then((storedUser) => toStoredUserOrNull(storedUser));
      if (!user) {
        return null;
      }

      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...input,
            ...(shouldBumpAuthVersion(user, input) ? { authVersion: { increment: 1 } } : {}),
          },
        });
        return toStoredUser(updated);
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          return null;
        }
        if (isDuplicateUsernameError(error)) {
          throw new DuplicateUsernameError();
        }
        throw error;
      }
    },

    async resetPassword(id, passwordHash) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            passwordHash,
            authVersion: { increment: 1 },
          },
        });
        return toStoredUser(updated);
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
  };
}

export function createMemoryUserRepository(initialUsers: StoredUser[] = []): UserRepository {
  const users = new Map<number, StoredUser>(
    initialUsers.map((user) => [user.id, cloneStoredUser(user)])
  );
  let nextId = initialUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1;

  const now = () => new Date("2026-05-28T00:00:00.000Z");

  return {
    async countUsers() {
      return users.size;
    },

    async findById(id) {
      const user = users.get(id);
      return user ? cloneStoredUser(user) : null;
    },

    async findByUsername(username) {
      const user = Array.from(users.values()).find((user) => user.username === username);
      return user ? cloneStoredUser(user) : null;
    },

    async listUsers() {
      return Array.from(users.values())
        .sort((a, b) => a.id - b.id)
        .map((user) => cloneStoredUser(user));
    },

    async createUser(input) {
      if (Array.from(users.values()).some((user) => user.username === input.username)) {
        throw new DuplicateUsernameError();
      }

      const createdAt = now();
      const user: StoredUser = {
        id: nextId,
        username: input.username,
        nickname: input.nickname,
        passwordHash: input.passwordHash,
        roles: input.roles,
        judgeType: input.judgeType ?? null,
        disabled: false,
        authVersion: 0,
        createdAt,
        updatedAt: createdAt,
      };
      nextId += 1;
      users.set(user.id, user);
      return cloneStoredUser(user);
    },

    async updateUser(id, input) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      if (
        input.username !== undefined &&
        input.username !== user.username &&
        Array.from(users.values()).some((candidate) => candidate.username === input.username)
      ) {
        throw new DuplicateUsernameError();
      }

      const updated: StoredUser = {
        ...user,
        ...input,
        authVersion: shouldBumpAuthVersion(user, input) ? user.authVersion + 1 : user.authVersion,
        updatedAt: now(),
      };
      users.set(id, updated);
      return cloneStoredUser(updated);
    },

    async resetPassword(id, passwordHash) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      const updated: StoredUser = {
        ...user,
        passwordHash,
        authVersion: user.authVersion + 1,
        updatedAt: now(),
      };
      users.set(id, updated);
      return cloneStoredUser(updated);
    },
  };
}
