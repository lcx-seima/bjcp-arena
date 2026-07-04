import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  judgeBeerResultSchema,
  myScoreResultSchema,
  scoreInputSchema,
  submitMyScoreResultSchema,
} from "@bjcp-arena/contracts";
import { AuthError, type createAuthService } from "../auth/auth.service.js";
import { CompetitionNotFoundError } from "../competitions/competitions.service.js";
import { requireJudge } from "../../shared/http/auth-guards.js";
import {
  BeerNotFoundForScoreError,
  ScoreNotAllowedError,
  createScoreService,
} from "./scores.service.js";

type AuthService = ReturnType<typeof createAuthService>;
type ScoreService = ReturnType<typeof createScoreService>;

function sendRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error instanceof CompetitionNotFoundError) {
    return reply.status(404).send({
      message: "Competition not found",
    });
  }

  if (error instanceof BeerNotFoundForScoreError) {
    return reply.status(404).send({
      message: "Beer not found",
    });
  }

  if (error instanceof ScoreNotAllowedError) {
    return reply.status(409).send({
      message: error.message,
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

export function registerScoreRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    scores: ScoreService;
  }
) {
  const { auth, scores } = dependencies;

  app.get(
    "/api/judge/competitions/:competitionId/beers/:beerId",
    {
      schema: {
        response: { 200: judgeBeerResultSchema },
        summary: "Get judge beer detail",
        tags: ["scores"],
      },
    },
    async (request, reply) => {
      return requireJudge(auth, request)
        .then(async (currentUser) => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          return judgeBeerResultSchema.parse({
            beer: await scores.getJudgeBeerDetail(competitionId, beerId, currentUser),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.get(
    "/api/judge/competitions/:competitionId/beers/:beerId/my-score",
    {
      schema: {
        response: { 200: myScoreResultSchema },
        summary: "Get my score for beer",
        tags: ["scores"],
      },
    },
    async (request, reply) => {
      return requireJudge(auth, request)
        .then(async (currentUser) => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          return myScoreResultSchema.parse({
            score: await scores.getMyScore(competitionId, beerId, currentUser),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.put(
    "/api/judge/competitions/:competitionId/beers/:beerId/my-score",
    {
      schema: {
        body: scoreInputSchema,
        response: { 200: submitMyScoreResultSchema },
        summary: "Submit my score for beer",
        tags: ["scores"],
      },
    },
    async (request, reply) => {
      return requireJudge(auth, request)
        .then(async (currentUser) => {
          const competitionId = parseCompetitionId(request);
          const beerId = parseBeerId(request);
          const input = scoreInputSchema.parse(request.body);
          return submitMyScoreResultSchema.parse({
            score: await scores.submitMyScore(competitionId, beerId, currentUser, input),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

}
