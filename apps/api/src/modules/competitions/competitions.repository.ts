import { Prisma, type PrismaClient } from "@prisma/client";
import { competitionStatusSchema, type CompetitionStatus } from "@bjcp-arena/contracts";
import {
  type CreateStoredCompetitionInput,
  type UpdateStoredCompetitionInput,
  type StoredCompetition,
} from "./competitions.types.js";

export interface CompetitionRepository {
  listCompetitions(): Promise<StoredCompetition[]>;
  findCompetition(id: number): Promise<StoredCompetition | null>;
  createCompetition(input: CreateStoredCompetitionInput): Promise<StoredCompetition>;
  updateCompetition(id: number, input: UpdateStoredCompetitionInput): Promise<StoredCompetition | null>;
  updateCompetitionStatus(id: number, status: CompetitionStatus): Promise<StoredCompetition | null>;
}

export function cloneStoredCompetition(competition: StoredCompetition): StoredCompetition {
  return {
    ...competition,
    createdAt: new Date(competition.createdAt),
    updatedAt: new Date(competition.updatedAt),
  };
}

function toStoredCompetition(competition: Prisma.CompetitionGetPayload<object>): StoredCompetition {
  return {
    id: competition.id,
    name: competition.name,
    description: competition.description,
    status: competitionStatusSchema.parse(competition.status),
    createdAt: new Date(competition.createdAt),
    updatedAt: new Date(competition.updatedAt),
  };
}

function toStoredCompetitionOrNull(
  competition: Prisma.CompetitionGetPayload<object> | null
): StoredCompetition | null {
  return competition ? toStoredCompetition(competition) : null;
}

function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function toStoredCompetitionOrThrowNull(error: unknown) {
  if (isRecordNotFoundError(error)) {
    return null;
  }
  throw error;
}

export function createPrismaCompetitionRepository(prisma: PrismaClient): CompetitionRepository {
  return {
    async listCompetitions() {
      const competitions = await prisma.competition.findMany({
        orderBy: { id: "desc" },
      });
      return competitions.map(toStoredCompetition);
    },

    findCompetition(id) {
      return prisma.competition
        .findUnique({ where: { id } })
        .then((competition) => toStoredCompetitionOrNull(competition));
    },

    async createCompetition(input) {
      const createdCompetition = await prisma.competition.create({
        data: {
          ...input,
        },
      });

      return toStoredCompetition(createdCompetition);
    },

    async updateCompetition(id, input) {
      const competition = await prisma.competition.findUnique({ where: { id } });
      if (!competition) {
        return null;
      }

      try {
        const updatedCompetition = await prisma.competition.update({
          where: { id },
          data: input,
        });
        return toStoredCompetition(updatedCompetition);
      } catch (error) {
        return toStoredCompetitionOrThrowNull(error);
      }
    },

    async updateCompetitionStatus(id, status) {
      const competition = await prisma.competition.findUnique({ where: { id } });
      if (!competition) {
        return null;
      }

      try {
        const updatedCompetition = await prisma.competition.update({
          where: { id },
          data: { status },
        });
        return toStoredCompetition(updatedCompetition);
      } catch (error) {
        return toStoredCompetitionOrThrowNull(error);
      }
    },
  };
}

export function createMemoryCompetitionRepository(
  initialCompetitions: StoredCompetition[] = []
): CompetitionRepository {
  const competitions = new Map<number, StoredCompetition>(
    initialCompetitions.map((competition) => [competition.id, cloneStoredCompetition(competition)])
  );
  let nextId = initialCompetitions.reduce((max, competition) => Math.max(max, competition.id), 0) + 1;

  const now = () => new Date("2026-05-28T00:00:00.000Z");

  return {
    async listCompetitions() {
      return Array.from(competitions.values())
        .sort((a, b) => b.id - a.id)
        .map(cloneStoredCompetition);
    },

    async findCompetition(id) {
      const competition = competitions.get(id);
      return competition ? cloneStoredCompetition(competition) : null;
    },

    async createCompetition(input) {
      const createdAt = now();
      const created: StoredCompetition = {
        id: nextId,
        name: input.name,
        description: input.description ?? null,
        status: "draft",
        createdAt,
        updatedAt: createdAt,
      };
      nextId += 1;
      competitions.set(created.id, created);
      return cloneStoredCompetition(created);
    },

    async updateCompetition(id, input) {
      const competition = competitions.get(id);
      if (!competition) {
        return null;
      }

      const updated: StoredCompetition = {
        ...competition,
        ...input,
        updatedAt: now(),
      };
      competitions.set(id, updated);
      return cloneStoredCompetition(updated);
    },

    async updateCompetitionStatus(id, status) {
      const competition = competitions.get(id);
      if (!competition) {
        return null;
      }

      const updated: StoredCompetition = {
        ...competition,
        status,
        updatedAt: now(),
      };
      competitions.set(id, updated);
      return cloneStoredCompetition(updated);
    },
  };
}
