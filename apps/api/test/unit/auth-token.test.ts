import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createTokenService } from "../../src/auth/token.js";

describe("auth token service", () => {
  const jwtSecret = "test-secret";
  const encodedSecret = new TextEncoder().encode(jwtSecret);
  const payload = {
    userId: 42,
    username: "superadmin",
    roles: 1,
    authVersion: 3,
  };

  it("signs and verifies the auth payload", async () => {
    const tokens = createTokenService({
      jwtSecret,
      jwtExpiresIn: "7d",
    });

    const token = await tokens.sign(payload);
    const verified = await tokens.verify(token);

    expect(verified).toEqual(payload);
  });

  it("rejects tokens signed with a different secret", async () => {
    const issuer = createTokenService({
      jwtSecret: "issuer-secret",
      jwtExpiresIn: "7d",
    });
    const verifier = createTokenService({
      jwtSecret: "verifier-secret",
      jwtExpiresIn: "7d",
    });

    const token = await issuer.sign(payload);

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it("rejects tokens with unsupported roles", async () => {
    const tokens = createTokenService({
      jwtSecret,
      jwtExpiresIn: "7d",
    });
    const token = await signRawToken({
      sub: String(payload.userId),
      username: payload.username,
      roles: 8,
      authVersion: payload.authVersion,
    });

    await expect(tokens.verify(token)).rejects.toThrow();
  });

  it("rejects tokens with invalid authVersion", async () => {
    const tokens = createTokenService({
      jwtSecret,
      jwtExpiresIn: "7d",
    });
    const token = await signRawToken({
      sub: String(payload.userId),
      username: payload.username,
      roles: payload.roles,
      authVersion: -1,
    });

    await expect(tokens.verify(token)).rejects.toThrow();
  });

  async function signRawToken(claims: Record<string, unknown>) {
    const { sub, ...payloadClaims } = claims;

    return new SignJWT(payloadClaims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(sub))
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(encodedSecret);
  }
});
