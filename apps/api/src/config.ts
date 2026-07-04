import "dotenv/config";

export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

export interface ApiConfig {
  host: string;
  port: number;
  allowedOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  authUserCacheTtlSeconds: number;
  judgeAppBaseUrl: string;
}

function readCsv(value: string | undefined) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function getApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    host: env.API_HOST ?? "0.0.0.0",
    port: Number(env.API_PORT ?? 4000),
    allowedOrigins: readCsv(env.API_ALLOWED_ORIGINS) ?? defaultAllowedOrigins,
    databaseUrl:
      env.DATABASE_URL ?? "postgresql://bjcp_arena:bjcp_arena@127.0.0.1:25432/bjcp_arena",
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:26379",
    jwtSecret: env.JWT_SECRET ?? "local-development-secret-change-me",
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? "7d",
    authUserCacheTtlSeconds: Number(env.AUTH_USER_CACHE_TTL_SECONDS ?? 1800),
    judgeAppBaseUrl: env.JUDGE_APP_BASE_URL ?? "http://localhost:5174",
  };
}
