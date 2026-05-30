import { describe, expect, it } from "vitest";
import {
  adminRole,
  canAccessAdminApp,
  canAccessJudgeApp,
  canManageUsers,
  hasRole,
  judgeRole,
  roleLabels,
  superAdminRole,
  userRoleSchema,
  userRolesSchema,
} from "../src/index.js";

describe("role contract", () => {
  it("defines stable bitmask values", () => {
    expect(superAdminRole).toBe(1);
    expect(adminRole).toBe(2);
    expect(judgeRole).toBe(4);
  });

  it("exposes Chinese labels for UI display", () => {
    expect(roleLabels[superAdminRole]).toBe("超级管理员");
    expect(roleLabels[adminRole]).toBe("赛事管理员");
    expect(roleLabels[judgeRole]).toBe("裁判员");
  });

  it("parses supported single roles and combined role bitmasks", () => {
    expect(userRoleSchema.parse(judgeRole)).toBe(judgeRole);
    expect(userRolesSchema.parse(adminRole | judgeRole)).toBe(adminRole | judgeRole);
  });

  it("rejects empty role bitmasks and unknown role bits", () => {
    expect(() => userRolesSchema.parse(0)).toThrow();
    expect(() => userRolesSchema.parse(8)).toThrow();
    expect(() => userRolesSchema.parse(superAdminRole | 8)).toThrow();
  });

  it("checks bitmask membership", () => {
    const roles = adminRole | judgeRole;

    expect(hasRole(roles, adminRole)).toBe(true);
    expect(hasRole(roles, judgeRole)).toBe(true);
    expect(hasRole(roles, superAdminRole)).toBe(false);
  });

  it("derives admin app access from super admin or admin roles", () => {
    expect(canAccessAdminApp(superAdminRole)).toBe(true);
    expect(canAccessAdminApp(adminRole)).toBe(true);
    expect(canAccessAdminApp(judgeRole)).toBe(false);
  });

  it("allows only super admins to manage users", () => {
    expect(canManageUsers(superAdminRole)).toBe(true);
    expect(canManageUsers(adminRole)).toBe(false);
    expect(canManageUsers(adminRole | judgeRole)).toBe(false);
  });

  it("requires explicit judge role for judge app access", () => {
    expect(canAccessJudgeApp(judgeRole)).toBe(true);
    expect(canAccessJudgeApp(adminRole)).toBe(false);
    expect(canAccessJudgeApp(superAdminRole)).toBe(false);
    expect(canAccessJudgeApp(adminRole | judgeRole)).toBe(true);
  });
});
