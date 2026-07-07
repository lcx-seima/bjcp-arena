import { describe, expect, it } from "vitest";
import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  updateCurrentUserInputSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  loginInputSchema,
  logoutResultSchema,
  passwordSchema,
  superAdminRole,
  userPublicSchema,
  usernameSchema,
} from "../src/index.js";

describe("auth contract", () => {
  it("defines auth endpoint paths", () => {
    expect(authBootstrapStatusPath).toBe("/api/auth/bootstrap-status");
    expect(authBootstrapSuperAdminPath).toBe("/api/auth/bootstrap-super-admin");
    expect(authLoginPath).toBe("/api/auth/login");
    expect(authMePath).toBe("/api/auth/me");
    expect(authLogoutPath).toBe("/api/auth/logout");
  });

  it("parses current user update input", () => {
    expect(updateCurrentUserInputSchema.parse({ nickname: "裁判 01" })).toEqual({
      nickname: "裁判 01",
    });
    expect(() => updateCurrentUserInputSchema.parse({ nickname: "" })).toThrow();
    expect(() => updateCurrentUserInputSchema.parse({ nickname: "x".repeat(65) })).toThrow();
  });

  it("validates password length", () => {
    expect(passwordSchema.parse("123456")).toBe("123456");
    expect(passwordSchema.parse("x".repeat(32))).toBe("x".repeat(32));
    expect(() => passwordSchema.parse("12345")).toThrow();
    expect(() => passwordSchema.parse("x".repeat(33))).toThrow();
  });

  it("validates password character set", () => {
    expect(passwordSchema.parse("Az09@#$%_-")).toBe("Az09@#$%_-");
    expect(() => passwordSchema.parse("secret 123")).toThrow();
    expect(() => passwordSchema.parse("密码123456")).toThrow();
    expect(() => passwordSchema.parse('secret"123')).toThrow();
    expect(() => passwordSchema.parse("secret/123")).toThrow();
  });

  it("validates alphanumeric username length", () => {
    expect(usernameSchema.parse("abc123")).toBe("abc123");
    expect(() => usernameSchema.parse("")).toThrow();
    expect(() => usernameSchema.parse("x".repeat(33))).toThrow();
    expect(() => usernameSchema.parse("bad_name")).toThrow();
    expect(() => usernameSchema.parse("bad-name")).toThrow();
  });

  it("parses bootstrap status", () => {
    expect(bootstrapStatusResultSchema.parse({ hasUsers: false })).toEqual({
      hasUsers: false,
    });
  });

  it("requires password for bootstrap", () => {
    expect(bootstrapSuperAdminInputSchema.parse({ password: "secret123" })).toEqual({
      password: "secret123",
    });
    expect(() => bootstrapSuperAdminInputSchema.parse({ password: "123" })).toThrow();
  });

  it("requires username and password for login", () => {
    expect(loginInputSchema.parse({ username: "abc123", password: "secret123" })).toEqual({
      username: "abc123",
      password: "secret123",
    });
  });

  it("parses public user and auth session", () => {
    const user = userPublicSchema.parse({
      id: 1,
      username: "superadmin",
      nickname: "superadmin",
      roles: superAdminRole,
      judgeType: null,
      disabled: false,
      authVersion: 0,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(authSessionSchema.parse({ token: "jwt-token", user })).toEqual({
      token: "jwt-token",
      user,
    });
  });

  it("parses logout result", () => {
    expect(logoutResultSchema.parse({ ok: true })).toEqual({ ok: true });
    expect(() => logoutResultSchema.parse({ ok: false })).toThrow();
  });
});
