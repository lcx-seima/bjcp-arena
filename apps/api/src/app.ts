import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";
import {
  createMemoryAuthUserSnapshotStore,
  createRedisAuthUserSnapshotStore,
  type AuthUserSnapshotStore,
} from "./auth/auth-user-snapshot-store.js";
import { createAuthService } from "./auth/auth-service.js";
import { createTokenService } from "./auth/token.js";
import { defaultAllowedOrigins, getApiConfig } from "./config.js";
import { createPrismaClient } from "./db/prisma.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerUserRoutes } from "./routes/users.routes.js";
import {
  createMemoryUserRepository,
  createPrismaUserRepository,
  type UserRepository,
} from "./users/user-repository.js";

export interface CreateAppOptions {
  allowedOrigins?: string[];
  users?: UserRepository;
  authUserSnapshots?: AuthUserSnapshotStore;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  authUserCacheTtlSeconds?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const config = getApiConfig();
  const allowedOrigins = options.allowedOrigins ?? defaultAllowedOrigins;
  let prisma: ReturnType<typeof createPrismaClient> | undefined;
  let users = options.users;
  if (!users) {
    prisma = createPrismaClient(config.databaseUrl);
    users = createPrismaUserRepository(prisma);
  }
  const authUserSnapshots =
    options.authUserSnapshots ??
    createRedisAuthUserSnapshotStore(
      config.redisUrl,
      options.authUserCacheTtlSeconds ?? config.authUserCacheTtlSeconds
    );
  const tokens = createTokenService({
    jwtSecret: options.jwtSecret ?? config.jwtSecret,
    jwtExpiresIn: options.jwtExpiresIn ?? config.jwtExpiresIn,
  });
  const auth = createAuthService({ users, authUserSnapshots, tokens });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
    origin: allowedOrigins,
  });

  app.addHook("onClose", async () => {
    await authUserSnapshots.close();
    await prisma?.$disconnect();
  });

  app.get(
    pingPath,
    {
      schema: {
        response: {
          200: pingResultSchema,
        },
        summary: "Check API reachability",
        tags: ["system"],
      },
    },
    async (): Promise<PingResult> => {
      return {
        message: "pong",
        service: "bjcp-arena-api",
      };
    }
  );

  registerAuthRoutes(app, auth);
  registerUserRoutes(app, {
    auth,
    users,
    authUserSnapshots,
  });

  return app;
}

export function createTestDependencies() {
  const users = createMemoryUserRepository();
  const authUserSnapshots = createMemoryAuthUserSnapshotStore();

  return {
    users,
    authUserSnapshots,
  };
}
