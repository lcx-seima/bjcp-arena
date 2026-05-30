import { superAdminRole } from "@bjcp-arena/contracts";
import type { AuthVersionStore } from "./auth-version-store.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { AuthTokenPayload, createTokenService } from "./token.js";
import { DuplicateUsernameError, type UserRepository } from "../users/user-repository.js";
import type { StoredUser } from "../users/user-mapper.js";
import { toPublicUser } from "../users/user-mapper.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export interface AuthServiceDependencies {
  users: UserRepository;
  authVersions: AuthVersionStore;
  tokens: ReturnType<typeof createTokenService>;
}

function readBearerToken(authorization: string | undefined) {
  return authorization?.match(/^Bearer (.+)$/i)?.[1];
}

function tokenPayloadForUser(user: StoredUser): AuthTokenPayload {
  return {
    userId: user.id,
    username: user.username,
    roles: user.roles,
    authVersion: user.authVersion,
  };
}

export function createAuthService({ users, authVersions, tokens }: AuthServiceDependencies) {
  async function authenticatePayload(payload: AuthTokenPayload) {
    const user = await users.findById(payload.userId);

    if (!user || user.disabled) {
      throw new AuthError("Unauthorized", 401);
    }

    const cachedVersion = await authVersions.get(user.id);
    if (cachedVersion === null || cachedVersion < user.authVersion) {
      await authVersions.set(user.id, user.authVersion);
    }

    const currentVersion = Math.max(cachedVersion ?? user.authVersion, user.authVersion);
    if (payload.authVersion !== currentVersion) {
      throw new AuthError("Unauthorized", 401);
    }

    return user;
  }

  async function createSession(user: StoredUser) {
    await authVersions.set(user.id, user.authVersion);

    return {
      token: await tokens.sign(tokenPayloadForUser(user)),
      user: toPublicUser(user),
    };
  }

  return {
    async bootstrapStatus() {
      return {
        hasUsers: (await users.countUsers()) > 0,
      };
    },

    async bootstrapSuperAdmin(password: string) {
      if ((await users.countUsers()) > 0) {
        throw new AuthError("Users already exist", 409);
      }

      let user: StoredUser;
      try {
        user = await users.createUser({
          username: "superadmin",
          nickname: "superadmin",
          passwordHash: await hashPassword(password),
          roles: superAdminRole,
        });
      } catch (error) {
        if (error instanceof DuplicateUsernameError) {
          throw new AuthError("Users already exist", 409);
        }
        throw error;
      }

      return createSession(user);
    },

    async login(username: string, password: string) {
      const user = await users.findByUsername(username);

      if (!user || user.disabled || !(await verifyPassword(user.passwordHash, password))) {
        throw new AuthError("Invalid username or password", 401);
      }

      return createSession(user);
    },

    async authenticate(authorization: string | undefined) {
      const token = readBearerToken(authorization);
      if (!token) {
        throw new AuthError("Unauthorized", 401);
      }

      let payload: AuthTokenPayload;
      try {
        payload = await tokens.verify(token);
      } catch (error) {
        if (error instanceof AuthError) {
          throw error;
        }
        throw new AuthError("Unauthorized", 401);
      }

      return authenticatePayload(payload);
    },
  };
}
