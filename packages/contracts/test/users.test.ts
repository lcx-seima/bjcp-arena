import { describe, expect, it } from "vitest";
import {
  adminRole,
  createUserInputSchema,
  judgeTypeProfessional,
  judgeTypePublic,
  judgeTypeLabels,
  judgeTypeSchema,
  judgeRole,
  resetUserPasswordInputSchema,
  superAdminRole,
  updateUserInputSchema,
  userByIdPath,
  userListQuerySchema,
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

  it("defines judge type constants", () => {
    expect(judgeTypeProfessional).toBe("professional");
    expect(judgeTypePublic).toBe("public");
    expect(judgeTypeLabels).toEqual({
      professional: "专业裁判",
      public: "消费者裁判",
    });
    expect(judgeTypeSchema.parse("professional")).toBe("professional");
    expect(judgeTypeSchema.parse("public")).toBe("public");
    expect(() => judgeTypeSchema.parse("guest")).toThrow();
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

  it("rejects super admin and admin role conflict", () => {
    expect(() =>
      createUserInputSchema.parse({
        password: "secret123",
        roles: superAdminRole | adminRole,
      })
    ).toThrow();
    expect(() => updateUserInputSchema.parse({ roles: superAdminRole | adminRole })).toThrow();
    expect(
      createUserInputSchema.parse({
        password: "secret123",
        roles: superAdminRole | judgeRole,
      }).roles
    ).toBe(superAdminRole | judgeRole);
  });

  it("parses user list query defaults and limits", () => {
    expect(userListQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
    expect(userListQuerySchema.parse({ page: "2", limit: "25" })).toEqual({
      page: 2,
      limit: 25,
    });
    expect(() => userListQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => userListQuerySchema.parse({ limit: "101" })).toThrow();
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

  it("parses judge type on user create and update input", () => {
    expect(
      createUserInputSchema.parse({
        username: "judge03",
        password: "secret123",
        roles: judgeRole,
        judgeType: judgeTypeProfessional,
      })
    ).toMatchObject({
      judgeType: judgeTypeProfessional,
    });

    expect(
      createUserInputSchema.parse({
        username: "judge04",
        password: "secret123",
        roles: judgeRole,
        judgeType: null,
      })
    ).toMatchObject({
      judgeType: null,
    });

    expect(updateUserInputSchema.parse({ judgeType: judgeTypePublic })).toEqual({
      judgeType: judgeTypePublic,
    });
    expect(updateUserInputSchema.parse({ judgeType: null })).toEqual({
      judgeType: null,
    });

    expect(() =>
      createUserInputSchema.parse({
        username: "judge05",
        password: "secret123",
        roles: judgeRole,
        judgeType: "guest",
      })
    ).toThrow();
    expect(() => updateUserInputSchema.parse({ judgeType: "guest" })).toThrow();
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
      judgeType: judgeTypeProfessional,
      disabled: false,
      authVersion: 0,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
    };

    expect(userListResultSchema.parse({ users: [user], total: 1, page: 1, limit: 50 })).toEqual({
      users: [user],
      total: 1,
      page: 1,
      limit: 50,
    });
    expect(userResultSchema.parse({ user })).toEqual({ user });
  });
});
