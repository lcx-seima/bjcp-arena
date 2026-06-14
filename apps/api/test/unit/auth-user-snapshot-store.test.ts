import { describe, expect, it } from "vitest";
import {
  createMemoryAuthUserSnapshotStore,
  parseAuthUserSnapshotValue,
  serializeAuthUserSnapshot,
  type AuthUserSnapshot,
} from "../../src/modules/auth/auth-user-snapshot-store.js";

const snapshot: AuthUserSnapshot = {
  id: 1,
  username: "superadmin",
  nickname: "superadmin",
  roles: 1,
  judgeType: null,
  disabled: false,
  authVersion: 2,
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
};

describe("auth user snapshot store", () => {
  it("stores and reads auth user snapshots in memory", async () => {
    const store = createMemoryAuthUserSnapshotStore([snapshot]);

    expect(await store.get(1)).toEqual(snapshot);
    expect(await store.get(2)).toBeNull();

    const nextSnapshot = { ...snapshot, id: 2, username: "judge01", roles: 4 };
    await store.set(nextSnapshot);

    expect(await store.get(2)).toEqual(nextSnapshot);
    await store.close();
  });

  it("serializes and parses valid Redis auth user snapshots", () => {
    expect(parseAuthUserSnapshotValue(serializeAuthUserSnapshot(snapshot))).toEqual(snapshot);
  });

  it("rejects dirty Redis auth user snapshots", () => {
    expect(() => parseAuthUserSnapshotValue("not-json")).toThrow();
    expect(() =>
      parseAuthUserSnapshotValue(JSON.stringify({ ...snapshot, authVersion: -1 }))
    ).toThrow();
    expect(() => parseAuthUserSnapshotValue(JSON.stringify({ ...snapshot, roles: 8 }))).toThrow();
    expect(() =>
      parseAuthUserSnapshotValue(JSON.stringify({ ...snapshot, passwordHash: "secret" }))
    ).toThrow();
  });
});
