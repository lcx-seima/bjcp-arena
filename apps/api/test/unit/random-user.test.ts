import { describe, expect, it } from "vitest";
import { createRandomNickname, createRandomUsername } from "../../src/users/random-user.js";

describe("random user helpers", () => {
  it("creates 6-character alphanumeric username", () => {
    const username = createRandomUsername();

    expect(username).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it("creates bjcp nickname with 6-character suffix", () => {
    const nickname = createRandomNickname();

    expect(nickname).toMatch(/^bjcp_[A-Za-z0-9]{6}$/);
  });
});
