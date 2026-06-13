import { SignJWT, jwtVerify } from "jose";
export interface AuthTokenPayload {
  userId: number;
  authVersion: number;
}

export interface TokenServiceOptions {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface TokenService {
  sign(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>;
}

const textEncoder = new TextEncoder();

function encodeSecret(secret: string): Uint8Array {
  return textEncoder.encode(secret);
}

function readStringClaim(value: unknown, claim: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`JWT ${claim} claim is required`);
  }
  return value;
}

function readNumberClaim(value: unknown, claim: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`JWT ${claim} claim must be a number`);
  }
  return value;
}

function readAuthVersionClaim(value: unknown): number {
  const authVersion = readNumberClaim(value, "authVersion");

  if (!Number.isSafeInteger(authVersion) || authVersion < 0) {
    throw new Error("JWT authVersion claim must be a non-negative safe integer");
  }

  return authVersion;
}

export function createTokenService(options: TokenServiceOptions): TokenService {
  const secret = encodeSecret(options.jwtSecret);

  return {
    async sign(payload) {
      return new SignJWT({
        authVersion: payload.authVersion,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(payload.userId))
        .setIssuedAt()
        .setExpirationTime(options.jwtExpiresIn)
        .sign(secret);
    },

    async verify(token) {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      const subject = readStringClaim(payload.sub, "sub");
      const userId = Number(subject);

      if (!Number.isSafeInteger(userId)) {
        throw new Error("JWT sub claim must be a user id");
      }

      return {
        userId,
        authVersion: readAuthVersionClaim(payload.authVersion),
      };
    },
  };
}
