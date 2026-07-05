import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  canManageUsers,
  createUserInputSchema,
  hasRole,
  judgeRole,
  judgeTypeProfessional,
  type JudgeType,
  resetUserPasswordInputSchema,
  superAdminRole,
  updateUserInputSchema,
  userListQuerySchema,
  userListResultSchema,
  userResultSchema,
  usersPath,
} from "@bjcp-arena/contracts";
import { AuthError, type createAuthService } from "../auth/auth.service.js";
import {
  toAuthUserSnapshot,
  type AuthUserSnapshotStore,
} from "../auth/auth-user-snapshot-store.js";
import { hashPassword } from "../auth/password.js";
import { createRandomNickname, createRandomUsername } from "./random-user.js";
import { toPublicUser } from "./user-mapper.js";
import { DuplicateUsernameError } from "./users.errors.js";
import { type UpdateStoredUserInput, type UserRepository } from "./users.repository.js";

type AuthService = ReturnType<typeof createAuthService>;

function sendRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error instanceof DuplicateUsernameError) {
    return reply.status(409).send({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Invalid request",
    });
  }

  throw error;
}

async function requireSuperAdmin(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canManageUsers(currentUser.roles)) {
    throw new AuthError("Forbidden", 403);
  }
  return currentUser;
}

function parseUserId(request: FastifyRequest) {
  const params = request.params as { id?: string };
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AuthError("Invalid user id", 400);
  }

  return id;
}

function toUpdateStoredUserInput(input: ReturnType<typeof updateUserInputSchema.parse>) {
  const update: UpdateStoredUserInput = {};

  if (input.username !== undefined) {
    update.username = input.username;
  }
  if (input.nickname !== undefined) {
    update.nickname = input.nickname;
  }
  if (input.roles !== undefined) {
    update.roles = input.roles;
  }
  if (input.judgeType !== undefined) {
    update.judgeType = input.judgeType;
  }
  if (input.disabled !== undefined) {
    update.disabled = input.disabled;
  }

  return update;
}

function normalizeJudgeType(roles: number, judgeType: JudgeType | null | undefined) {
  return hasRole(roles, judgeRole) ? (judgeType ?? judgeTypeProfessional) : (judgeType ?? null);
}

function toNormalizedUpdateStoredUserInput(
  existingUser: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>,
  input: ReturnType<typeof updateUserInputSchema.parse>
) {
  const update = toUpdateStoredUserInput(input);
  const nextRoles = input.roles ?? existingUser.roles;

  update.judgeType = normalizeJudgeType(
    nextRoles,
    input.judgeType === undefined ? existingUser.judgeType : input.judgeType
  );

  return update;
}

function sendNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    message: "User not found",
  });
}

async function assertKeepsActiveSuperAdmin(
  users: UserRepository,
  existingUser: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>,
  input: ReturnType<typeof updateUserInputSchema.parse>
) {
  const isActiveSuperAdmin =
    !existingUser.disabled && hasRole(existingUser.roles, superAdminRole);
  const removesSuperAdminRole =
    input.roles !== undefined && !hasRole(input.roles, superAdminRole);
  const disablesUser = input.disabled === true;

  if (!isActiveSuperAdmin || (!removesSuperAdminRole && !disablesUser)) {
    return;
  }

  const activeSuperAdminCount = (await users.listUsers()).filter(
    (user) => !user.disabled && hasRole(user.roles, superAdminRole)
  ).length;

  if (activeSuperAdminCount <= 1) {
    throw new AuthError("Cannot remove the last active super admin", 409);
  }

}

export function registerUserRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    users: UserRepository;
    authUserSnapshots: AuthUserSnapshotStore;
  }
) {
  const { auth, users, authUserSnapshots } = dependencies;

  app.get(
    usersPath,
    {
      schema: {
        response: { 200: userListResultSchema },
        summary: "List users",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const query = userListQuerySchema.parse(request.query);
          const total = await users.countUsers();
          const pageUsers = await users.listUsers({
            limit: query.limit,
            order: "desc",
            page: query.page,
          });

          return userListResultSchema.parse({
            users: pageUsers.map(toPublicUser),
            total,
            page: query.page,
            limit: query.limit,
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.post(
    usersPath,
    {
      schema: {
        body: createUserInputSchema,
        response: { 200: userResultSchema },
        summary: "Create user",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const input = createUserInputSchema.parse(request.body);
          const user = await users.createUser({
            username: input.username ?? createRandomUsername(),
            nickname: input.nickname ?? createRandomNickname(),
            passwordHash: await hashPassword(input.password),
            roles: input.roles,
            judgeType: normalizeJudgeType(input.roles, input.judgeType),
          });

          await authUserSnapshots.set(toAuthUserSnapshot(user));

          return userResultSchema.parse({
            user: toPublicUser(user),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.patch(
    `${usersPath}/:id`,
    {
      schema: {
        body: updateUserInputSchema,
        response: { 200: userResultSchema },
        summary: "Update user",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const id = parseUserId(request);
          const input = updateUserInputSchema.parse(request.body);
          const existingUser = await users.findById(id);
          if (!existingUser) {
            return sendNotFound(reply);
          }
          await assertKeepsActiveSuperAdmin(users, existingUser, input);

          const user = await users.updateUser(
            id,
            toNormalizedUpdateStoredUserInput(existingUser, input)
          );

          if (!user) {
            return sendNotFound(reply);
          }

          await authUserSnapshots.set(toAuthUserSnapshot(user));

          return userResultSchema.parse({
            user: toPublicUser(user),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.post(
    `${usersPath}/:id/reset-password`,
    {
      schema: {
        body: resetUserPasswordInputSchema,
        response: { 200: userResultSchema },
        summary: "Reset user password",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const id = parseUserId(request);
          const input = resetUserPasswordInputSchema.parse(request.body);
          const user = await users.resetPassword(id, await hashPassword(input.password));

          if (!user) {
            return sendNotFound(reply);
          }

          await authUserSnapshots.set(toAuthUserSnapshot(user));

          return userResultSchema.parse({
            user: toPublicUser(user),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );
}
