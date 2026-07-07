import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  loginInputSchema,
  logoutResultSchema,
  updateCurrentUserInputSchema,
  userResultSchema,
} from "@bjcp-arena/contracts";
import { AuthError, type createAuthService } from "./auth.service.js";

type AuthService = ReturnType<typeof createAuthService>;

function sendAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
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

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService) {
  app.get(
    authBootstrapStatusPath,
    {
      schema: {
        response: { 200: bootstrapStatusResultSchema },
        summary: "Check whether initial user exists",
        tags: ["auth"],
      },
    },
    async () => auth.bootstrapStatus()
  );

  app.patch(
    authMePath,
    {
      schema: {
        body: updateCurrentUserInputSchema,
        response: { 200: userResultSchema },
        summary: "Update current user",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      return auth
        .updateCurrentUser(
          request.headers.authorization,
          updateCurrentUserInputSchema.parse(request.body)
        )
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.post(
    authBootstrapSuperAdminPath,
    {
      schema: {
        body: bootstrapSuperAdminInputSchema,
        response: { 200: authSessionSchema },
        summary: "Create initial super admin",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const input = bootstrapSuperAdminInputSchema.parse(request.body);
      return auth
        .bootstrapSuperAdmin(input.password)
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.post(
    authLoginPath,
    {
      schema: {
        body: loginInputSchema,
        response: { 200: authSessionSchema },
        summary: "Login with username and password",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const input = loginInputSchema.parse(request.body);
      return auth
        .login(input.username, input.password)
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.get(
    authMePath,
    {
      schema: {
        response: { 200: userResultSchema },
        summary: "Get current user",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      return auth
        .authenticate(request.headers.authorization)
        .then((user) => ({ user }))
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.post(
    authLogoutPath,
    {
      schema: {
        response: { 200: logoutResultSchema },
        summary: "Logout current token on client side",
        tags: ["auth"],
      },
    },
    async () => ({ ok: true as const })
  );
}
