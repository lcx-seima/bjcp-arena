import { describe, expect, it } from "vitest";
import { DuplicateUsernameError } from "../../src/modules/users/users.errors.js";
import type { StoredUser } from "../../src/modules/users/users.types.js";
import { createMemoryUserRepository } from "../../src/modules/users/users.repository.js";

describe("memory user repository", () => {
  it("throws DuplicateUsernameError when creating or updating to an existing username", async () => {
    const repository = createMemoryUserRepository([createStoredUser({ id: 1, username: "alice" })]);

    await expect(
      repository.createUser({
        username: "alice",
        nickname: "Alice 2",
        passwordHash: "hash-2",
        roles: 2,
      })
    ).rejects.toBeInstanceOf(DuplicateUsernameError);

    const bob = await repository.createUser({
      username: "bob",
      nickname: "Bob",
      passwordHash: "hash-3",
      roles: 4,
    });

    await expect(repository.updateUser(bob.id, { username: "alice" })).rejects.toBeInstanceOf(
      DuplicateUsernameError
    );
  });

  it("does not let returned users mutate repository state", async () => {
    const initialUser = createStoredUser({
      id: 1,
      username: "alice",
      nickname: "Alice",
      createdAt: new Date("2026-05-28T01:00:00.000Z"),
    });
    const repository = createMemoryUserRepository([initialUser]);

    initialUser.username = "mutated-before-read";
    initialUser.createdAt.setFullYear(2030);

    const found = await repository.findById(1);
    expect(found?.username).toBe("alice");
    expect(found?.createdAt.toISOString()).toBe("2026-05-28T01:00:00.000Z");

    found!.username = "mutated-after-read";
    found!.createdAt.setFullYear(2031);

    const foundAgain = await repository.findById(1);
    expect(foundAgain?.username).toBe("alice");
    expect(foundAgain?.createdAt.toISOString()).toBe("2026-05-28T01:00:00.000Z");

    const listed = await repository.listUsers();
    listed[0]!.nickname = "Mutated List";

    const listedAgain = await repository.listUsers();
    expect(listedAgain[0]?.nickname).toBe("Alice");

    const created = await repository.createUser({
      username: "bob",
      nickname: "Bob",
      passwordHash: "hash-2",
      roles: 4,
    });
    created.username = "mutated-created";

    const createdAgain = await repository.findById(created.id);
    expect(createdAgain?.username).toBe("bob");

    const updated = await repository.updateUser(created.id, { nickname: "Bob Updated" });
    updated!.nickname = "mutated-updated";

    const updatedAgain = await repository.findById(created.id);
    expect(updatedAgain?.nickname).toBe("Bob Updated");

    const passwordReset = await repository.resetPassword(created.id, "hash-3");
    passwordReset!.passwordHash = "mutated-password";

    const passwordResetAgain = await repository.findById(created.id);
    expect(passwordResetAgain?.passwordHash).toBe("hash-3");
  });

  it("increments authVersion only for auth-sensitive updates", async () => {
    const repository = createMemoryUserRepository([
      createStoredUser({ id: 1, username: "alice", authVersion: 7 }),
    ]);

    const nicknameOnly = await repository.updateUser(1, { nickname: "Alice New" });
    expect(nicknameOnly?.authVersion).toBe(7);

    const rolesChanged = await repository.updateUser(1, { roles: 6 });
    expect(rolesChanged?.authVersion).toBe(8);

    const disabledChanged = await repository.updateUser(1, { disabled: true });
    expect(disabledChanged?.authVersion).toBe(9);

    const passwordReset = await repository.resetPassword(1, "new-hash");
    expect(passwordReset?.authVersion).toBe(10);
  });
});

function createStoredUser(overrides: Partial<StoredUser> = {}): StoredUser {
  const createdAt = new Date("2026-05-28T00:00:00.000Z");
  const updatedAt = new Date("2026-05-28T00:00:00.000Z");

  return {
    id: 1,
    username: "user1",
    nickname: "User 1",
    passwordHash: "hash-1",
    roles: 2,
    disabled: false,
    authVersion: 0,
    createdAt,
    updatedAt,
    ...overrides,
  };
}
