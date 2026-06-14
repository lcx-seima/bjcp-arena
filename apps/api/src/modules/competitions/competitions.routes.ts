import { AuthError, type createAuthService } from "../auth/auth.service.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  competitionListPath,
  competitionListResultSchema,
  competitionResultSchema,
  createCompetitionInputSchema,
  updateCompetitionInputSchema,
  updateCompetitionStatusInputSchema,
} from "@bjcp-arena/contracts";
import { toCompetitionResult } from "./competition-mapper.js";
import type { createCompetitionService } from "./competitions.service.js";
import { requireAdmin } from "../../shared/http/auth-guards.js";

type AuthService = ReturnType<typeof createAuthService>;
type CompetitionService = ReturnType<typeof createCompetitionService>;

function sendRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  throw error;
}

function parseCompetitionId(request: FastifyRequest) {
  const params = request.params as { competitionId?: string };
  const competitionId = Number(params.competitionId);

  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    throw new AuthError("Invalid competition id", 400);
  }

  return competitionId;
}

function sendNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    message: "Competition not found",
  });
}

export function registerCompetitionRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    competitions: CompetitionService;
  }
) {
  const { auth, competitions } = dependencies;

  app.get(
    competitionListPath,
    {
      schema: {
        response: {
          200: competitionListResultSchema,
        },
        summary: "List competitions",
        tags: ["competitions"],
      },
    },
    async (_request, reply) => {
      return requireAdmin(auth, _request)
        .then(async () => competitions.listCompetitions())
        .then((competitionsResult) =>
          competitionListResultSchema.parse({
            competitions: competitionsResult.map(toCompetitionResult),
          })
        )
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.post(
    competitionListPath,
    {
      schema: {
        body: createCompetitionInputSchema,
        response: { 200: competitionResultSchema },
        summary: "Create competition",
        tags: ["competitions"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const input = createCompetitionInputSchema.parse(request.body);
          const competition = await competitions.createCompetition({
            name: input.name,
            description: input.description ?? null,
          });

          return competitionResultSchema.parse({
            competition: toCompetitionResult(competition),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.get(
    `${competitionListPath}/:competitionId`,
    {
      schema: {
        response: { 200: competitionResultSchema },
        summary: "Get competition details",
        tags: ["competitions"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const competition = await competitions.findCompetition(competitionId);
          if (!competition) {
            return sendNotFound(reply);
          }

          return competitionResultSchema.parse({
            competition: toCompetitionResult(competition),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.patch(
    `${competitionListPath}/:competitionId`,
    {
      schema: {
        body: updateCompetitionInputSchema,
        response: { 200: competitionResultSchema },
        summary: "Update competition",
        tags: ["competitions"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const input = updateCompetitionInputSchema.parse(request.body);
          const update: { name?: string; description?: string | null } = {};
          if (input.name !== undefined) {
            update.name = input.name;
          }
          if (input.description !== undefined) {
            update.description = input.description;
          }

          const competition = await competitions.updateCompetition(competitionId, update);
          if (!competition) {
            return sendNotFound(reply);
          }

          return competitionResultSchema.parse({
            competition: toCompetitionResult(competition),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );

  app.patch(
    `${competitionListPath}/:competitionId/status`,
    {
      schema: {
        body: updateCompetitionStatusInputSchema,
        response: { 200: competitionResultSchema },
        summary: "Update competition status",
        tags: ["competitions"],
      },
    },
    async (request, reply) => {
      return requireAdmin(auth, request)
        .then(async () => {
          const competitionId = parseCompetitionId(request);
          const input = updateCompetitionStatusInputSchema.parse(request.body);
          const competition = await competitions.updateCompetitionStatus(competitionId, input.status);
          if (!competition) {
            return sendNotFound(reply);
          }

          return competitionResultSchema.parse({
            competition: toCompetitionResult(competition),
          });
        })
        .catch((error: unknown) => sendRouteError(reply, error));
    }
  );
}
