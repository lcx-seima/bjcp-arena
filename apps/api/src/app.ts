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
import { registerCompetitionRoutes } from "./modules/competitions/competitions.routes.js";
import { createPrismaCompetitionRepository, createMemoryCompetitionRepository, type CompetitionRepository } from "./modules/competitions/competitions.repository.js";
import { createCompetitionService } from "./modules/competitions/competitions.service.js";
import { registerBeerRoutes } from "./modules/beers/beers.routes.js";
import { createBeerService } from "./modules/beers/beers.service.js";
import { createMemoryBeerRepository, createPrismaBeerRepository, type BeerRepository } from "./modules/beers/beers.repository.js";
import { createMemoryScoreRepository, createPrismaScoreRepository, type ScoreRepository } from "./modules/scores/scores.repository.js";
import { registerScoreRoutes } from "./modules/scores/scores.routes.js";
import { createScoreService } from "./modules/scores/scores.service.js";
import {
  createMemoryUserRepository,
  createPrismaUserRepository,
  type UserRepository,
} from "./modules/users/users.repository.js";

export interface CreateAppOptions {
  config?: Partial<ApiConfig>;
  allowedOrigins?: string[];
  users?: UserRepository;
  competitions?: CompetitionRepository;
  beers?: BeerRepository;
  scores?: ScoreRepository;
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
  let competitions = options.competitions;
  let beers = options.beers;
  let scores = options.scores;
  if (!users) {
    prisma = createPrismaClient(config.databaseUrl);
    users = createPrismaUserRepository(prisma);
  }
  if (!competitions) {
    prisma ??= createPrismaClient(config.databaseUrl);
    competitions = createPrismaCompetitionRepository(prisma);
  }
  if (!beers) {
    prisma ??= createPrismaClient(config.databaseUrl);
    beers = createPrismaBeerRepository(prisma);
  }
  if (!scores) {
    scores = prisma ? createPrismaScoreRepository(prisma) : createMemoryScoreRepository();
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
  const competitionService = createCompetitionService({ competitions });
  const beerService = createBeerService({ beers });
  const scoreService = createScoreService({
    competitions: competitionService,
    beers: beerService,
    scores,
  });

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
  registerCompetitionRoutes(app, { auth, competitions: competitionService });
  registerBeerRoutes(app, {
    auth,
    competitions: competitionService,
    beers: beerService,
    config,
  });
  registerScoreRoutes(app, {
    auth,
    scores: scoreService,
  });

  return app;
}

export function createTestDependencies() {
  const users = createMemoryUserRepository();
  const authUserSnapshots = createMemoryAuthUserSnapshotStore();
  const competitions = createMemoryCompetitionRepository();
  const beers = createMemoryBeerRepository();
  const scores = createMemoryScoreRepository();

  return {
    users,
    authUserSnapshots,
    competitions,
    beers,
    scores,
  };
}
