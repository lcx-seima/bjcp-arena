import { Prisma, type PrismaClient } from "@prisma/client";
import { beerStatusSchema, type BeerStatus } from "@bjcp-arena/contracts";
import type {
  CreateStoredBeerInput,
  StoredBeer,
  UpdateStoredBeerInput,
} from "./beers.types.js";

export class DuplicateBeerEntryNumberError extends Error {
  constructor() {
    super("Beer entry number already exists in competition");
  }
}

export interface BeerRepository {
  listBeers(competitionId: number): Promise<StoredBeer[]>;
  listPublishedBeers(competitionId: number): Promise<StoredBeer[]>;
  findBeer(competitionId: number, id: number): Promise<StoredBeer | null>;
  findMaxEntryNumber(competitionId: number): Promise<number>;
  createBeer(input: CreateStoredBeerInput): Promise<StoredBeer>;
  updateBeer(
    competitionId: number,
    id: number,
    input: UpdateStoredBeerInput
  ): Promise<StoredBeer | null>;
  updateBeerStatus(
    competitionId: number,
    id: number,
    status: BeerStatus
  ): Promise<StoredBeer | null>;
}

export function cloneStoredBeer(beer: StoredBeer): StoredBeer {
  return {
    ...beer,
    createdAt: new Date(beer.createdAt),
    updatedAt: new Date(beer.updatedAt),
  };
}

function toStoredBeer(prismaBeer: Prisma.BeerEntryGetPayload<object>): StoredBeer {
  return {
    id: prismaBeer.id,
    competitionId: prismaBeer.competitionId,
    entryNumber: prismaBeer.entryNumber,
    realName: prismaBeer.realName,
    producer: prismaBeer.producer,
    bjcpCategoryCode: prismaBeer.bjcpCategoryCode,
    bjcpCategoryName: prismaBeer.bjcpCategoryName,
    bjcpSubcategoryCode: prismaBeer.bjcpSubcategoryCode,
    bjcpSubcategoryName: prismaBeer.bjcpSubcategoryName,
    description: prismaBeer.description,
    status: beerStatusSchema.parse(prismaBeer.status),
    createdAt: new Date(prismaBeer.createdAt),
    updatedAt: new Date(prismaBeer.updatedAt),
  };
}

function toStoredBeerOrNull(prismaBeer: Prisma.BeerEntryGetPayload<object> | null) {
  return prismaBeer ? toStoredBeer(prismaBeer) : null;
}

function isDuplicateBeerEntryNumberError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    const normalizedTarget = target
      .map((entry) => String(entry))
      .filter((entry) => entry === "competition_id" || entry === "entry_number");
    return normalizedTarget.includes("competition_id") && normalizedTarget.includes("entry_number");
  }

  return target === "beer_entries_competition_entry_number_key";
}

export function createPrismaBeerRepository(prisma: PrismaClient): BeerRepository {
  return {
    listBeers(competitionId) {
      return prisma.beerEntry
        .findMany({
          where: { competitionId },
          orderBy: { entryNumber: "asc" },
        })
        .then((beers) => beers.map(toStoredBeer));
    },

    listPublishedBeers(competitionId) {
      return prisma.beerEntry
        .findMany({
          where: { competitionId, status: "published" },
          orderBy: { entryNumber: "asc" },
        })
        .then((beers) => beers.map(toStoredBeer));
    },

    findBeer(competitionId, id) {
      return prisma.beerEntry
        .findFirst({ where: { competitionId, id } })
        .then((beer) => toStoredBeerOrNull(beer));
    },

    async findMaxEntryNumber(competitionId) {
      const { _max } = await prisma.beerEntry.aggregate({
        where: { competitionId },
        _max: { entryNumber: true },
      });
      return _max.entryNumber ?? 0;
    },

    async createBeer(input) {
      try {
        const beer = await prisma.beerEntry.create({ data: input });
        return toStoredBeer(beer);
      } catch (error) {
        if (isDuplicateBeerEntryNumberError(error)) {
          throw new DuplicateBeerEntryNumberError();
        }
        throw error;
      }
    },

    async updateBeer(competitionId, id, input) {
      const result = await prisma.beerEntry.updateMany({
        where: { competitionId, id },
        data: input,
      });
      if (result.count === 0) {
        return null;
      }

      return prisma.beerEntry
        .findFirst({ where: { competitionId, id } })
        .then((beer) => toStoredBeerOrNull(beer));
    },

    async updateBeerStatus(competitionId, id, status) {
      const result = await prisma.beerEntry.updateMany({
        where: { competitionId, id },
        data: { status },
      });
      if (result.count === 0) {
        return null;
      }

      return prisma.beerEntry
        .findFirst({ where: { competitionId, id } })
        .then((beer) => toStoredBeerOrNull(beer));
    },
  };
}

export function createMemoryBeerRepository(initialBeers: StoredBeer[] = []): BeerRepository {
  const beers = new Map<number, StoredBeer>(
    initialBeers.map((beer) => [beer.id, cloneStoredBeer(beer)])
  );
  let nextId = initialBeers.reduce((max, beer) => Math.max(max, beer.id), 0) + 1;

  const now = () => new Date("2026-05-28T00:00:00.000Z");

  return {
    async listBeers(competitionId) {
      return Array.from(beers.values())
        .filter((beer) => beer.competitionId === competitionId)
        .sort((a, b) => a.entryNumber - b.entryNumber)
        .map(cloneStoredBeer);
    },

    async listPublishedBeers(competitionId) {
      return Array.from(beers.values())
        .filter((beer) => beer.competitionId === competitionId && beer.status === "published")
        .sort((a, b) => a.entryNumber - b.entryNumber)
        .map(cloneStoredBeer);
    },

    async findBeer(competitionId, id) {
      const beer = beers.get(id);
      return beer && beer.competitionId === competitionId ? cloneStoredBeer(beer) : null;
    },

    async findMaxEntryNumber(competitionId) {
      return Array.from(beers.values())
        .filter((beer) => beer.competitionId === competitionId)
        .reduce((max, beer) => Math.max(max, beer.entryNumber), 0);
    },

    async createBeer(input) {
      if (
        Array.from(beers.values()).some(
          (candidate) =>
            candidate.competitionId === input.competitionId &&
            candidate.entryNumber === input.entryNumber
        )
      ) {
        throw new DuplicateBeerEntryNumberError();
      }

      const created: StoredBeer = {
        ...input,
        id: nextId,
        createdAt: now(),
        updatedAt: now(),
      };
      nextId += 1;
      beers.set(created.id, created);
      return cloneStoredBeer(created);
    },

    async updateBeer(competitionId, id, input) {
      const beer = beers.get(id);
      if (!beer || beer.competitionId !== competitionId) {
        return null;
      }

      const updated = {
        ...beer,
        ...input,
        updatedAt: now(),
      };
      beers.set(id, updated);
      return cloneStoredBeer(updated);
    },

    async updateBeerStatus(competitionId, id, status) {
      const beer = beers.get(id);
      if (!beer || beer.competitionId !== competitionId) {
        return null;
      }

      const updated: StoredBeer = {
        ...beer,
        status,
        updatedAt: now(),
      };
      beers.set(id, updated);
      return cloneStoredBeer(updated);
    },
  };
}
