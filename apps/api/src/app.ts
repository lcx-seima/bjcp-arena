import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";
import {
  createMemoryAuthVersionStore,
  createRedisAuthVersionStore,
  type AuthVersionStore,
} from "./auth/auth-version-store.js";
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
  authVersions?: AuthVersionStore;
  jwtSecret?: string;
  jwtExpiresIn?: string;
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
  const authVersions = options.authVersions ?? createRedisAuthVersionStore(config.redisUrl);
  const tokens = createTokenService({
    jwtSecret: options.jwtSecret ?? config.jwtSecret,
    jwtExpiresIn: options.jwtExpiresIn ?? config.jwtExpiresIn,
  });
  const auth = createAuthService({ users, authVersions, tokens });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: allowedOrigins,
  });

  app.addHook("onClose", async () => {
    await authVersions.close();
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
    authVersions,
  });

  return app;
}

export function createTestDependencies() {
  const users = createMemoryUserRepository();
  const authVersions = createMemoryAuthVersionStore();

  return {
    users,
    authVersions,
  };
}
