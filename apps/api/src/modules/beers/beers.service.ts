import {
  findBjcpSubcategory,
  updateBeerInputSchema,
  type BeerStatus,
  type CreateBeerInput,
  type UpdateBeerInput,
} from "@bjcp-arena/contracts";
import {
  DuplicateBeerEntryNumberError,
  type BeerRepository,
} from "./beers.repository.js";
import type { CreateStoredBeerInput, StoredBeer, UpdateStoredBeerInput } from "./beers.types.js";

export class BeerStyleNotFoundError extends Error {
  constructor(styleCode: string) {
    super(`BJCP subcategory code not found: ${styleCode}`);
  }
}

export class EmptyBeerUpdateError extends Error {
  constructor() {
    super("At least one field is required");
  }
}

export interface BeerServiceDependencies {
  beers: BeerRepository;
}

export function createBeerService({ beers }: BeerServiceDependencies) {
  function resolveBeerStyle(bjcpSubcategoryCode: string) {
    const style = findBjcpSubcategory(bjcpSubcategoryCode);
    if (!style) {
      throw new BeerStyleNotFoundError(bjcpSubcategoryCode);
    }
    return style;
  }

  function toStoredBeerInput(
    competitionId: number,
    entryNumber: number,
    input: CreateBeerInput
  ): CreateStoredBeerInput {
    const style = resolveBeerStyle(input.bjcpSubcategoryCode);
    return {
      competitionId,
      entryNumber,
      realName: input.realName,
      producer: input.producer,
      bjcpCategoryCode: style.categoryCode,
      bjcpCategoryName: style.categoryName,
      bjcpSubcategoryCode: style.subcategoryCode,
      bjcpSubcategoryName: style.subcategoryName,
      description: input.description,
      status: "draft",
    };
  }

  function toUpdateStoredBeerInput(input: UpdateBeerInput): UpdateStoredBeerInput {
    const parsedResult = updateBeerInputSchema.safeParse(input);
    if (!parsedResult.success) {
      if (
        input !== null &&
        typeof input === "object" &&
        !Array.isArray(input) &&
        Object.keys(input).length === 0
      ) {
        throw new EmptyBeerUpdateError();
      }

      throw parsedResult.error;
    }

    const parsed = parsedResult.data;
    if (Object.keys(parsed).length === 0) {
      throw new EmptyBeerUpdateError();
    }

    const update: UpdateStoredBeerInput = {};

    if (parsed.realName !== undefined) {
      update.realName = parsed.realName;
    }
    if (parsed.producer !== undefined) {
      update.producer = parsed.producer;
    }
    if (parsed.description !== undefined) {
      update.description = parsed.description;
    }

    if (parsed.bjcpSubcategoryCode !== undefined) {
      const style = resolveBeerStyle(parsed.bjcpSubcategoryCode);
      update.bjcpCategoryCode = style.categoryCode;
      update.bjcpCategoryName = style.categoryName;
      update.bjcpSubcategoryCode = style.subcategoryCode;
      update.bjcpSubcategoryName = style.subcategoryName;
    }

    return update;
  }

  async function listBeers(competitionId: number) {
    return beers.listBeers(competitionId);
  }

  async function listPublishedBeers(competitionId: number) {
    return beers.listPublishedBeers(competitionId);
  }

  async function createBeer(competitionId: number, input: CreateBeerInput): Promise<StoredBeer> {
    let lastError: DuplicateBeerEntryNumberError | null = null;

    for (let attempts = 0; attempts < 3; attempts += 1) {
      const entryNumber = (await beers.findMaxEntryNumber(competitionId)) + 1;
      try {
        return await beers.createBeer(toStoredBeerInput(competitionId, entryNumber, input));
      } catch (error) {
        if (error instanceof DuplicateBeerEntryNumberError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new DuplicateBeerEntryNumberError();
  }

  async function updateBeer(competitionId: number, id: number, input: UpdateBeerInput) {
    const update = toUpdateStoredBeerInput(input);
    return beers.updateBeer(competitionId, id, update);
  }

  async function updateBeerStatus(
    competitionId: number,
    id: number,
    status: BeerStatus
  ): Promise<StoredBeer | null> {
    return beers.updateBeerStatus(competitionId, id, status);
  }

  return {
    listBeers,
    listPublishedBeers,
    createBeer,
    updateBeer,
    updateBeerStatus,
  };
}
