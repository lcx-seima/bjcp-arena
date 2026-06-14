import { z } from "zod";
import { passwordSchema, userPublicSchema, usernameSchema } from "./auth.js";
import { userRolesSchema } from "./roles.js";
import { nullableJudgeTypeSchema } from "./judge-types.js";

export const usersPath = "/api/users" as const;

export function userByIdPath(id: number) {
  return `/api/users/${id}` as const;
}

export function userResetPasswordPath(id: number) {
  return `/api/users/${id}/reset-password` as const;
}

export const createUserInputSchema = z.object({
  username: usernameSchema.optional(),
  nickname: z.string().min(1).max(64).optional(),
  password: passwordSchema,
  roles: userRolesSchema,
  judgeType: nullableJudgeTypeSchema.optional(),
});

export const updateUserInputSchema = z
  .object({
    username: usernameSchema.optional(),
    nickname: z.string().min(1).max(64).optional(),
    roles: userRolesSchema.optional(),
    judgeType: nullableJudgeTypeSchema.optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const resetUserPasswordInputSchema = z.object({
  password: passwordSchema,
});

export const userListResultSchema = z.object({
  users: z.array(userPublicSchema),
});

export const userResultSchema = z.object({
  user: userPublicSchema,
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordInputSchema>;
export type UserListResult = z.infer<typeof userListResultSchema>;
export type UserResult = z.infer<typeof userResultSchema>;
