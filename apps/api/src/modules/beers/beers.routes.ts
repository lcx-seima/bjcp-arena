import { AuthError, type createAuthService } from "../auth/auth.service.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  beerListResultSchema,
  beerQrCodeListResultSchema,
  beerResultSchema,
  competitionListPath,
  createBeerInputSchema,
  updateBeerInputSchema,
  updateBeerStatusInputSchema,
} from "@bjcp-arena/contracts";
import { DuplicateBeerEntryNumberError } from "./beers.repository.js";
import {
  BeerStyleNotFoundError,
  EmptyBeerUpdateError,
  createBeerService,
} from "./beers.service.js";
import {
  CompetitionNotFoundError,
  type createCompetitionService,
} from "../competitions/competitions.service.js";
import { toBeerResult } from "./beer-mapper.js";
import { requireAdmin } from "../../shared/http/auth-guards.js";
import { type ApiConfig as AppConfig } from "../../config.js";

type BeerService = ReturnType<typeof createBeerService>;
type CompetitionService = ReturnType<typeof createCompetitionService>;
type AuthService = ReturnType<typeof createAuthService>;

function sendRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error instanceof BeerStyleNotFoundError || error instanceof EmptyBeerUpdateError) {
    return reply.status(400).send({
      message: error.message,
    });
  }

  if (error instanceof DuplicateBeerEntryNumberError) {
    return reply.status(409).send({
      message: "Beer entry number conflict, please retry",
    });
  }

  if (error instanceof CompetitionNotFoundError) {
    return reply.status(404).send({
      message: "Competition not found",
    });
  }

  throw error;
}

function parseCompetitionId(request: FastifyRequest) {
  const params = request.params as { competitionId?: string; beerId?: string };
  const competitionId = Number(params.competitionId);
  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new AuthError("Invalid competition id", 400);
  }
  return competitionId;
}

function parseBeerId(request: FastifyRequest) {
  const params = request.params as { competitionId?: string; beerId?: string };
  const beerId = Number(params.beerId);
  if (!Number.isInteger(beerId) || beerId <= 0) {
    throw new AuthError("Invalid beer id", 400);
  }
  return beerId;
}

function sendNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    message: "Beer not found",
  });
}

function toJudgeUrl(config: AppConfig, competitionId: number, beerId: number) {
  const judgeAppBaseUrl = config.judgeAppBaseUrl.replace(/\/+$/, "");
  return `${judgeAppBaseUrl}/competitions/${competitionId}/beers/${beerId}`;
}

export function registerBeerRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    competitions: CompetitionService;
    beers: BeerService;
    config: AppConfig;
  }
) {
  const { auth, competitions, beers, config } = dependencies;

  app.get(
    `${competitionListPath}/:competitionId/beers`,
    {
      schema: {
        response: { 200: beerListResultSchema },
        summary: "List beers",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          await competitions.ensureCompetitionExists(competitionId);
          return beerListResultSchema.parse({
            beers: (await beers.listBeers(competitionId)).map(toBeerResult),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.post(
    `${competitionListPath}/:competitionId/beers`,
    {
      schema: {
        body: createBeerInputSchema,
        response: { 200: beerResultSchema },
        summary: "Create beer",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          await competitions.ensureCompetitionExists(competitionId);
          const input = createBeerInputSchema.parse(request.body);
          const beer = await beers.createBeer(competitionId, input);

          return beerResultSchema.parse({
            beer: toBeerResult(beer),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.get(
    `${competitionListPath}/:competitionId/beers/:beerId`,
    {
      schema: {
        response: { 200: beerResultSchema },
        summary: "Get beer",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          await competitions.ensureCompetitionExists(competitionId);

          const beer = (await beers.listBeers(competitionId)).find(
            (entry) => entry.id === beerId
          );
          if (!beer) {
            return sendNotFound(reply);
          }

          return beerResultSchema.parse({
            beer: toBeerResult(beer),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.patch(
    `${competitionListPath}/:competitionId/beers/:beerId`,
    {
      schema: {
        body: updateBeerInputSchema,
        response: { 200: beerResultSchema },
        summary: "Update beer",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          await competitions.ensureCompetitionExists(competitionId);
          const input = updateBeerInputSchema.parse(request.body);
          const beer = await beers.updateBeer(competitionId, beerId, input);
          if (!beer) {
            return sendNotFound(reply);
          }
          return beerResultSchema.parse({
            beer: toBeerResult(beer),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.patch(
    `${competitionListPath}/:competitionId/beers/:beerId/status`,
    {
      schema: {
        body: updateBeerStatusInputSchema,
        response: { 200: beerResultSchema },
        summary: "Update beer status",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          await competitions.ensureCompetitionExists(competitionId);
          const input = updateBeerStatusInputSchema.parse(request.body);
          const beer = await beers.updateBeerStatus(competitionId, beerId, input.status);
          if (!beer) {
            return sendNotFound(reply);
          }
          return beerResultSchema.parse({
            beer: toBeerResult(beer),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.get(
    `${competitionListPath}/:competitionId/qr-codes`,
    {
      schema: {
        response: { 200: beerQrCodeListResultSchema },
        summary: "List published beer QR code data",
        tags: ["beers"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          await competitions.ensureCompetitionExists(competitionId);
          const publishedBeers = await beers.listPublishedBeers(competitionId);

          return beerQrCodeListResultSchema.parse({
            beers: publishedBeers.map((beer) => ({
              id: beer.id,
              competitionId: beer.competitionId,
              entryNumber: beer.entryNumber,
              realName: beer.realName,
              producer: beer.producer,
              bjcpCategoryCode: beer.bjcpCategoryCode,
              bjcpCategoryName: beer.bjcpCategoryName,
              bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
              bjcpSubcategoryName: beer.bjcpSubcategoryName,
              judgeUrl: toJudgeUrl(config, competitionId, beer.id),
            })),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );
}
