import { z } from "zod";
import { userRolesSchema } from "./roles.js";

export const authBootstrapStatusPath = "/api/auth/bootstrap-status" as const;
export const authBootstrapSuperAdminPath = "/api/auth/bootstrap-super-admin" as const;
export const authLoginPath = "/api/auth/login" as const;
export const authMePath = "/api/auth/me" as const;
export const authLogoutPath = "/api/auth/logout" as const;

export const passwordSchema = z.string().min(6).max(128);
export const usernameSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9]+$/);

export const userPublicSchema = z.object({
  id: z.number().int().positive(),
  username: usernameSchema,
  nickname: z.string().min(1).max(64),
  roles: userRolesSchema,
  disabled: z.boolean(),
  authVersion: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const bootstrapStatusResultSchema = z.object({
  hasUsers: z.boolean(),
});

export const bootstrapSuperAdminInputSchema = z.object({
  password: passwordSchema,
});

export const loginInputSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const authSessionSchema = z.object({
  token: z.string().min(1),
  user: userPublicSchema,
});

export const logoutResultSchema = z.object({
  ok: z.literal(true),
});

export type UserPublic = z.infer<typeof userPublicSchema>;
export type BootstrapStatusResult = z.infer<typeof bootstrapStatusResultSchema>;
export type BootstrapSuperAdminInput = z.infer<typeof bootstrapSuperAdminInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LogoutResult = z.infer<typeof logoutResultSchema>;
