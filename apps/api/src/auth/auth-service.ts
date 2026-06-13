import { superAdminRole } from "@bjcp-arena/contracts";
import {
  toAuthUserSnapshot,
  type AuthUserSnapshot,
  type AuthUserSnapshotStore,
} from "./auth-user-snapshot-store.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { AuthTokenPayload, createTokenService } from "./token.js";
import { DuplicateUsernameError, type UserRepository } from "../users/user-repository.js";
import type { StoredUser } from "../users/user-mapper.js";

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
  authUserSnapshots: AuthUserSnapshotStore;
  tokens: ReturnType<typeof createTokenService>;
}

function readBearerToken(authorization: string | undefined) {
  return authorization?.match(/^Bearer (.+)$/i)?.[1];
}

function tokenPayloadForSnapshot(snapshot: AuthUserSnapshot): AuthTokenPayload {
  return {
    userId: snapshot.id,
    authVersion: snapshot.authVersion,
  };
}

export function createAuthService({ users, authUserSnapshots, tokens }: AuthServiceDependencies) {
  async function authenticatePayload(payload: AuthTokenPayload) {
    const cachedUser = await authUserSnapshots.get(payload.userId);
    if (cachedUser) {
      if (cachedUser.disabled || cachedUser.authVersion !== payload.authVersion) {
        throw new AuthError("Unauthorized", 401);
      }

      return cachedUser;
    }

    const user = await users.findById(payload.userId);

    if (!user || user.disabled || user.authVersion !== payload.authVersion) {
      throw new AuthError("Unauthorized", 401);
    }

    const snapshot = toAuthUserSnapshot(user);
    await authUserSnapshots.set(snapshot);
    return snapshot;
  }

  async function createSession(user: StoredUser) {
    const snapshot = toAuthUserSnapshot(user);
    await authUserSnapshots.set(snapshot);

    return {
      token: await tokens.sign(tokenPayloadForSnapshot(snapshot)),
      user: snapshot,
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
