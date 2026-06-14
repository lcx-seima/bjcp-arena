import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { type UpdateBeerInput } from "@bjcp-arena/contracts";
import {
  BeerStyleNotFoundError,
  EmptyBeerUpdateError,
  createBeerService,
} from "../../src/modules/beers/beers.service.js";
import {
  DuplicateBeerEntryNumberError,
  createMemoryBeerRepository,
} from "../../src/modules/beers/beers.repository.js";
import type { CreateStoredBeerInput } from "../../src/modules/beers/beers.types.js";

describe("beer service", () => {
  it("assigns entry numbers per competition and never reuses removed numbers", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });

    const first = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });
    const second = await service.createBeer(1, {
      realName: "Beer B",
      producer: "Brewery",
      bjcpSubcategoryCode: "21A",
      description: "B",
    });

    await service.updateBeerStatus(1, second.id, "removed");

    const third = await service.createBeer(1, {
      realName: "Beer C",
      producer: "Brewery",
      bjcpSubcategoryCode: "21B",
      description: "C",
    });

    const otherCompetitionFirst = await service.createBeer(2, {
      realName: "Beer D",
      producer: "Another Brewery",
      bjcpSubcategoryCode: "10A",
      description: "D",
    });

    expect(first.entryNumber).toBe(1);
    expect(second.entryNumber).toBe(2);
    expect(third.entryNumber).toBe(3);
    expect(otherCompetitionFirst.entryNumber).toBe(1);
  });

  it("throws BeerStyleNotFoundError when BJCP code is invalid", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });
    const invalidCode = "ZZ" as unknown as "10A";

    await expect(() =>
      service.createBeer(1, {
        realName: "Invalid Beer",
        producer: "Brewery",
        bjcpSubcategoryCode: invalidCode,
        description: "Invalid style",
      })
    ).rejects.toBeInstanceOf(BeerStyleNotFoundError);
  });

  it("syncs BJCP snapshot fields when style changes", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });

    const beer = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });

    const updated = await service.updateBeer(1, beer.id, {
      bjcpSubcategoryCode: "21A",
    });

    expect(updated).toMatchObject({
      bjcpCategoryCode: "21",
      bjcpCategoryName: "IPA",
      bjcpSubcategoryCode: "21A",
      bjcpSubcategoryName: "American IPA",
    });
  });

  it("throws EmptyBeerUpdateError when update payload is empty", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });

    const beer = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });

    await expect(() => service.updateBeer(1, beer.id, {})).rejects.toBeInstanceOf(
      EmptyBeerUpdateError
    );
  });

  it("throws zod parse error when update payload is null", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });

    const beer = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });

    await expect(() =>
      service.updateBeer(1, beer.id, null as unknown as UpdateBeerInput)
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("retries create when entry number collides, then succeeds", async () => {
    const backing = createMemoryBeerRepository();
    const createCalls: number[] = [];

    const beers = {
      ...backing,
      async createBeer(input: CreateStoredBeerInput) {
        createCalls.push(input.entryNumber);
        if (createCalls.length === 1) {
          await backing.createBeer(input);
          throw new DuplicateBeerEntryNumberError();
        }
        return backing.createBeer(input);
      },
    };

    const service = createBeerService({ beers });

    const created = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });

    expect(createCalls.length).toBe(2);
    expect(createCalls[0]).toBe(1);
    expect(createCalls[1]).toBe(2);
    expect(created.entryNumber).toBe(2);
  });
});
