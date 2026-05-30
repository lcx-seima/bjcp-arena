import { describe, expect, it } from "vitest";
import {
  adminRole,
  createUserInputSchema,
  judgeRole,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userByIdPath,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
} from "../src/index.js";

describe("users contract", () => {
  it("defines user management paths", () => {
    expect(usersPath).toBe("/api/users");
    expect(userByIdPath(12)).toBe("/api/users/12");
    expect(userResetPasswordPath(12)).toBe("/api/users/12/reset-password");
  });

  it("parses create user input with optional username and nickname", () => {
    expect(
      createUserInputSchema.parse({
        password: "secret123",
        roles: adminRole | judgeRole,
      })
    ).toEqual({
      password: "secret123",
      roles: adminRole | judgeRole,
    });
  });

  it("validates username when creating users", () => {
    expect(
      createUserInputSchema.parse({
        username: "abc123",
        password: "secret123",
        roles: adminRole,
      })
    ).toEqual({
      username: "abc123",
      password: "secret123",
      roles: adminRole,
    });

    expect(() =>
      createUserInputSchema.parse({
        username: "bad_name",
        password: "secret123",
        roles: adminRole,
      })
    ).toThrow();
  });

  it("requires password and roles when creating users", () => {
    expect(() =>
      createUserInputSchema.parse({
        password: "secret123",
      })
    ).toThrow();
    expect(() =>
      createUserInputSchema.parse({
        roles: adminRole,
      })
    ).toThrow();
  });

  it("parses update user input and rejects empty updates", () => {
    expect(
      updateUserInputSchema.parse({
        username: "abc123",
        nickname: "BJCP Admin",
        roles: adminRole,
        disabled: true,
      })
    ).toEqual({
      username: "abc123",
      nickname: "BJCP Admin",
      roles: adminRole,
      disabled: true,
    });

    expect(() => updateUserInputSchema.parse({})).toThrow();
    expect(() => updateUserInputSchema.parse({ username: "bad-name" })).toThrow();
  });

  it("parses reset password input", () => {
    expect(resetUserPasswordInputSchema.parse({ password: "newSecret123" })).toEqual({
      password: "newSecret123",
    });
    expect(() => resetUserPasswordInputSchema.parse({ password: "123" })).toThrow();
  });

  it("parses user list and single user results", () => {
    const user = {
      id: 1,
      username: "abc123",
      nickname: "bjcpabc123",
      roles: judgeRole,
      disabled: false,
      authVersion: 0,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
    };

    expect(userListResultSchema.parse({ users: [user] })).toHaveProperty("users.length", 1);
    expect(userResultSchema.parse({ user })).toEqual({ user });
  });
});
