import { z } from "zod";

export const superAdminRole = 1 as const;
export const adminRole = 2 as const;
export const judgeRole = 4 as const;

export const userRoleValues = [superAdminRole, adminRole, judgeRole] as const;

export const roleLabels: Record<(typeof userRoleValues)[number], string> = {
  [superAdminRole]: "超级管理员",
  [adminRole]: "赛事管理员",
  [judgeRole]: "裁判员",
};

export const userRoleSchema = z.union([
  z.literal(superAdminRole),
  z.literal(adminRole),
  z.literal(judgeRole),
]);

export const userRolesSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((roles) => roles > 0, "At least one role is required")
  .refine((roles) => (roles & ~(superAdminRole | adminRole | judgeRole)) === 0, "Unknown role bit");

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserRoles = z.infer<typeof userRolesSchema>;

export function hasRole(roles: number, role: UserRole) {
  return (roles & role) === role;
}

export function canAccessAdminApp(roles: number) {
  return hasRole(roles, superAdminRole) || hasRole(roles, adminRole);
}

export function canManageUsers(roles: number) {
  return hasRole(roles, superAdminRole);
}

export function canAccessJudgeApp(roles: number) {
  return hasRole(roles, judgeRole);
}
