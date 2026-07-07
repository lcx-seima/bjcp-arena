import { describe, expect, it } from "vitest";
import {
  createRandomDefaultUsername,
  createUniqueDefaultUsername,
} from "../../src/modules/users/random-user.js";

describe("random user helpers", () => {
  it("creates tbc username with 4 random digits", () => {
    const username = createRandomDefaultUsername();

    expect(username).toMatch(/^tbc\d{4}$/);
  });

  it("skips existing generated usernames", async () => {
    const candidates = ["tbc0001", "tbc0001", "tbc0002"];
    const username = await createUniqueDefaultUsername({
      generate: () => candidates.shift() ?? "tbc9999",
      exists: async (candidate) => candidate === "tbc0001",
    });

    expect(username).toBe("tbc0002");
  });

  it("fails after generated username attempts are exhausted", async () => {
    await expect(
      createUniqueDefaultUsername({
        maxAttempts: 2,
        generate: () => "tbc0001",
        exists: async () => true,
      })
    ).rejects.toThrow("Unable to generate unique username");
  });
});
