import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";
import {
  createMemoryAuthUserSnapshotStore,
  createRedisAuthUserSnapshotStore,
  type AuthUserSnapshotStore,
} from "./modules/auth/auth-user-snapshot-store.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createTokenService } from "./modules/auth/token.js";
import { getApiConfig, type ApiConfig } from "./config.js";
import { createPrismaClient } from "./db/prisma.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerUserRoutes } from "./modules/users/users.routes.js";
import {
  createMemoryCompetitionLoopRepository,
  createPrismaCompetitionLoopRepository,
  type CompetitionLoopRepository,
} from "./modules/competition-loop/competition-loop.repository.js";
import { createCompetitionLoopService } from "./modules/competition-loop/competition-loop.service.js";
import { registerCompetitionLoopRoutes } from "./modules/competition-loop/competition-loop.routes.js";
import {
  createMemoryUserRepository,
  createPrismaUserRepository,
  type UserRepository,
} from "./modules/users/users.repository.js";

export interface CreateAppOptions {
  config?: Partial<ApiConfig>;
  allowedOrigins?: string[];
  users?: UserRepository;
  competitionLoop?: CompetitionLoopRepository;
  authUserSnapshots?: AuthUserSnapshotStore;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  authUserCacheTtlSeconds?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const config: ApiConfig = {
    ...getApiConfig(),
    ...options.config,
  };
  const allowedOrigins = options.allowedOrigins ?? config.allowedOrigins;
  const corsOrigin = allowedOrigins.includes("*") ? true : allowedOrigins;
  let prisma: ReturnType<typeof createPrismaClient> | undefined;
  let users = options.users;
  let competitionLoop = options.competitionLoop;
  if (!users) {
    prisma = createPrismaClient(config.databaseUrl);
    users = createPrismaUserRepository(prisma);
  }
  if (!competitionLoop) {
    prisma ??= createPrismaClient(config.databaseUrl);
    competitionLoop = createPrismaCompetitionLoopRepository(prisma);
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
  const competitionLoopService = createCompetitionLoopService({ repository: competitionLoop });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS"],
    origin: corsOrigin,
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
  registerCompetitionLoopRoutes(app, {
    auth,
    competitionLoop: competitionLoopService,
  });

  return app;
}

export function createTestDependencies() {
  const users = createMemoryUserRepository();
  const authUserSnapshots = createMemoryAuthUserSnapshotStore();
  const competitionLoop = createMemoryCompetitionLoopRepository();

  return {
    users,
    authUserSnapshots,
    competitionLoop,
  };
}
