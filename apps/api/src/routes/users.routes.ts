import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  canManageUsers,
  createUserInputSchema,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userListResultSchema,
  userResultSchema,
  usersPath,
} from "@bjcp-arena/contracts";
import { AuthError, type createAuthService } from "../auth/auth-service.js";
import type { AuthVersionStore } from "../auth/auth-version-store.js";
import { hashPassword } from "../auth/password.js";
import { createRandomNickname, createRandomUsername } from "../users/random-user.js";
import { toPublicUser } from "../users/user-mapper.js";
import {
  DuplicateUsernameError,
  type UpdateStoredUserInput,
  type UserRepository,
} from "../users/user-repository.js";

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

  throw error;
}

async function requireSuperAdmin(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canManageUsers(currentUser.roles)) {
    throw new AuthError("Forbidden", 403);
  }
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
  if (input.disabled !== undefined) {
    update.disabled = input.disabled;
  }

  return update;
}

function sendNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    message: "User not found",
  });
}

export function registerUserRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    users: UserRepository;
    authVersions: AuthVersionStore;
  }
) {
  const { auth, users, authVersions } = dependencies;

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
        .then(async () =>
          userListResultSchema.parse({
            users: (await users.listUsers()).map(toPublicUser),
          })
        )
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
          });

          await authVersions.set(user.id, user.authVersion);

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
          const user = await users.updateUser(id, toUpdateStoredUserInput(input));

          if (!user) {
            return sendNotFound(reply);
          }

          await authVersions.set(user.id, user.authVersion);

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

          await authVersions.set(user.id, user.authVersion);

          return userResultSchema.parse({
            user: toPublicUser(user),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );
}
