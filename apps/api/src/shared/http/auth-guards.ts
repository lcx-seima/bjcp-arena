import { canAccessAdminApp, canAccessJudgeApp } from "@bjcp-arena/contracts";
import type { FastifyRequest } from "fastify";
import { AuthError, type createAuthService } from "../../modules/auth/auth.service.js";

type AuthService = ReturnType<typeof createAuthService>;

export async function requireAdmin(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canAccessAdminApp(currentUser.roles)) {
    throw new AuthError("Forbidden", 403);
  }
  return currentUser;
}

export async function requireJudge(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canAccessJudgeApp(currentUser.roles)) {
    throw new AuthError("Forbidden", 403);
  }
  return currentUser;
}
