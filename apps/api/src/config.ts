import "dotenv/config";

export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

export interface ApiConfig {
  host: string;
  port: number;
  allowedOrigins: string[];
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
  };
}
