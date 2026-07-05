import { AuthError, type createAuthService } from "../auth/auth.service.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  addRoundBeerInputSchema,
  beerImportPath,
  beerListResultSchema,
  beerResultSchema,
  competitionListPath,
  competitionListQuerySchema,
  competitionListResultSchema,
  competitionResultSchema,
  competitionStatusPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createRoundInputSchema,
  importBeersInputSchema,
  importBeersResultSchema,
  judgeBeerLookupInputSchema,
  judgeBeerResultSchema,
  judgeCompetitionListPath,
  judgeCompetitionListResultSchema,
  judgeRoundBeerLookupPath,
  judgeRoundBeerDetailPath,
  judgeRoundBeerScorePath,
  judgeRoundDetailPath,
  judgeRoundDetailResultSchema,
  judgeRoundListPath,
  judgeRoundListResultSchema,
  myScoreResultSchema,
  removeRoundBeerInputSchema,
  roundBeerListResultSchema,
  roundBeerPath,
  roundBeerResultSchema,
  roundByIdPath,
  roundListPath,
  roundListResultSchema,
  roundResultSchema,
  roundStatusPath,
  scoreInputSchema,
  submitMyScoreResultSchema,
  updateBeerInputSchema,
  updateCompetitionInputSchema,
  updateCompetitionStatusInputSchema,
  updateEntityStatusInputSchema,
  updateRoundInputSchema,
} from "@bjcp-arena/contracts";
import { requireAdmin, requireJudge } from "../../shared/http/auth-guards.js";
import {
  CompetitionLoopError,
  type createCompetitionLoopService,
} from "./competition-loop.service.js";

type AuthService = ReturnType<typeof createAuthService>;
type CompetitionLoopService = ReturnType<typeof createCompetitionLoopService>;

function sendRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }
  if (error instanceof CompetitionLoopError) {
    return reply.status(error.statusCode).send({
      message: error.message,
      ...(error.details ?? {}),
    });
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({ message: "Invalid request" });
  }
  throw error;
}

function readPositiveId(request: FastifyRequest, name: string) {
  const value = Number((request.params as Record<string, string | undefined>)[name]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AuthError(`Invalid ${name}`, 400);
  }
  return value;
}

export function registerCompetitionLoopRoutes(
  app: FastifyInstance,
  dependencies: { auth: AuthService; competitionLoop: CompetitionLoopService }
) {
  const { auth, competitionLoop } = dependencies;

  app.get(
    competitionListPath,
    { schema: { response: { 200: competitionListResultSchema }, tags: ["competitions"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionListResultSchema.parse(
            await competitionLoop.listCompetitions(competitionListQuerySchema.parse(request.query))
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    competitionListPath,
    {
      schema: {
        body: createCompetitionInputSchema,
        response: { 200: competitionResultSchema },
        tags: ["competitions"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionResultSchema.parse(
            await competitionLoop.createCompetition(
              createCompetitionInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    `${competitionListPath}/:competitionId`,
    { schema: { response: { 200: competitionResultSchema }, tags: ["competitions"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionResultSchema.parse(
            await competitionLoop.getCompetition(readPositiveId(request, "competitionId"))
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.patch(
    `${competitionListPath}/:competitionId`,
    {
      schema: {
        body: updateCompetitionInputSchema,
        response: { 200: competitionResultSchema },
        tags: ["competitions"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionResultSchema.parse(
            await competitionLoop.updateCompetition(
              readPositiveId(request, "competitionId"),
              updateCompetitionInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.patch(
    competitionStatusPath(":competitionId" as unknown as number),
    {
      schema: {
        body: updateCompetitionStatusInputSchema,
        response: { 200: competitionResultSchema },
        tags: ["competitions"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionResultSchema.parse(
            await competitionLoop.updateCompetitionStatus(
              readPositiveId(request, "competitionId"),
              updateCompetitionStatusInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    `${competitionListPath}/:competitionId/beers`,
    { schema: { response: { 200: beerListResultSchema }, tags: ["beers"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          beerListResultSchema.parse(
            await competitionLoop.listBeers(readPositiveId(request, "competitionId"))
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    `${competitionListPath}/:competitionId/beers`,
    {
      schema: { body: createBeerInputSchema, response: { 200: beerResultSchema }, tags: ["beers"] },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          beerResultSchema.parse(
            await competitionLoop.upsertBeer(
              readPositiveId(request, "competitionId"),
              createBeerInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.patch(
    `${competitionListPath}/:competitionId/beers/:beerId`,
    {
      schema: { body: updateBeerInputSchema, response: { 200: beerResultSchema }, tags: ["beers"] },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          beerResultSchema.parse(
            await competitionLoop.updateBeer(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "beerId"),
              updateBeerInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    beerImportPath(":competitionId" as unknown as number),
    {
      schema: {
        body: importBeersInputSchema,
        response: { 200: importBeersResultSchema },
        tags: ["beers"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          importBeersResultSchema.parse(
            await competitionLoop.importBeers(
              readPositiveId(request, "competitionId"),
              importBeersInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    roundListPath(":competitionId" as unknown as number),
    { schema: { response: { 200: roundListResultSchema }, tags: ["rounds"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundListResultSchema.parse(
            await competitionLoop.listRounds(readPositiveId(request, "competitionId"))
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    roundListPath(":competitionId" as unknown as number),
    {
      schema: {
        body: createRoundInputSchema,
        response: { 200: roundResultSchema },
        tags: ["rounds"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundResultSchema.parse(
            await competitionLoop.createRound(
              readPositiveId(request, "competitionId"),
              createRoundInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.patch(
    roundByIdPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    {
      schema: {
        body: updateRoundInputSchema,
        response: { 200: roundResultSchema },
        tags: ["rounds"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundResultSchema.parse(
            await competitionLoop.updateRound(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              updateRoundInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.patch(
    roundStatusPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    {
      schema: {
        body: updateEntityStatusInputSchema,
        response: { 200: roundResultSchema },
        tags: ["rounds"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundResultSchema.parse(
            await competitionLoop.updateRoundStatus(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              updateEntityStatusInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.delete(
    roundByIdPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    { schema: { tags: ["rounds"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionLoop.deleteRound(
            readPositiveId(request, "competitionId"),
            readPositiveId(request, "roundId")
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    roundBeerPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    { schema: { response: { 200: roundBeerListResultSchema }, tags: ["rounds"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundBeerListResultSchema.parse(
            await competitionLoop.listRoundBeers(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId")
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    roundBeerPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    {
      schema: {
        body: addRoundBeerInputSchema,
        response: { 200: roundBeerResultSchema },
        tags: ["rounds"],
      },
    },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          roundBeerResultSchema.parse(
            await competitionLoop.addRoundBeer(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              addRoundBeerInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.delete(
    `${roundBeerPath(":competitionId" as unknown as number, ":roundId" as unknown as number)}/:beerId`,
    { schema: { body: removeRoundBeerInputSchema, tags: ["rounds"] } },
    async (request, reply) =>
      requireAdmin(auth, request)
        .then(async () =>
          competitionLoop.removeRoundBeer(
            readPositiveId(request, "competitionId"),
            readPositiveId(request, "roundId"),
            readPositiveId(request, "beerId"),
            removeRoundBeerInputSchema.parse(request.body ?? {})
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    judgeCompetitionListPath,
    { schema: { response: { 200: judgeCompetitionListResultSchema }, tags: ["judge"] } },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async () =>
          judgeCompetitionListResultSchema.parse(await competitionLoop.listJudgeCompetitions())
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    judgeRoundListPath(":competitionId" as unknown as number),
    { schema: { response: { 200: judgeRoundListResultSchema }, tags: ["judge"] } },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          judgeRoundListResultSchema.parse(
            await competitionLoop.listJudgeRounds(
              readPositiveId(request, "competitionId"),
              currentUser
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    judgeRoundDetailPath(":competitionId" as unknown as number, ":roundId" as unknown as number),
    { schema: { response: { 200: judgeRoundDetailResultSchema }, tags: ["judge"] } },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          judgeRoundDetailResultSchema.parse(
            await competitionLoop.getJudgeRound(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              currentUser
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.post(
    judgeRoundBeerLookupPath(
      ":competitionId" as unknown as number,
      ":roundId" as unknown as number
    ),
    {
      schema: {
        body: judgeBeerLookupInputSchema,
        response: { 200: judgeBeerResultSchema },
        tags: ["judge"],
      },
    },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          judgeBeerResultSchema.parse(
            await competitionLoop.lookupJudgeBeer(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              judgeBeerLookupInputSchema.parse(request.body).entryCode,
              currentUser
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    judgeRoundBeerDetailPath(
      ":competitionId" as unknown as number,
      ":roundId" as unknown as number,
      ":beerId" as unknown as number
    ),
    { schema: { response: { 200: judgeBeerResultSchema }, tags: ["judge"] } },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          judgeBeerResultSchema.parse(
            await competitionLoop.getJudgeBeer(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              readPositiveId(request, "beerId"),
              currentUser
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.get(
    judgeRoundBeerScorePath(
      ":competitionId" as unknown as number,
      ":roundId" as unknown as number,
      ":beerId" as unknown as number
    ),
    { schema: { response: { 200: myScoreResultSchema }, tags: ["judge"] } },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          myScoreResultSchema.parse(
            await competitionLoop.getMyScore(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              readPositiveId(request, "beerId"),
              currentUser
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );

  app.put(
    judgeRoundBeerScorePath(
      ":competitionId" as unknown as number,
      ":roundId" as unknown as number,
      ":beerId" as unknown as number
    ),
    {
      schema: {
        body: scoreInputSchema,
        response: { 200: submitMyScoreResultSchema },
        tags: ["judge"],
      },
    },
    async (request, reply) =>
      requireJudge(auth, request)
        .then(async (currentUser) =>
          submitMyScoreResultSchema.parse(
            await competitionLoop.submitMyScore(
              readPositiveId(request, "competitionId"),
              readPositiveId(request, "roundId"),
              readPositiveId(request, "beerId"),
              currentUser,
              scoreInputSchema.parse(request.body)
            )
          )
        )
        .catch((error: unknown) => sendRouteError(reply, error))
  );
}
