import { describe, expect, it } from "vitest";
import type { Beer, RoundBeer } from "./competitions-api.js";
import {
  availableRoundBeers,
  beerDescriptionToPlainText,
  filterBeerList,
  matchesRoundBeerSearch,
} from "./beer-list.js";

function createBeer(overrides: Partial<Beer> = {}): Beer {
  return {
    id: 1,
    competitionId: 1,
    entryCode: "SA0001",
    entryNumber: 1,
    bjcpCategoryCode: "21",
    bjcpCategoryName: "IPA",
    bjcpSubcategoryCode: "21A",
    bjcpSubcategoryName: "American IPA",
    categoryRemark: "",
    description: "介绍",
    name: "松针 IPA",
    brewery: "山谷酒厂",
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    ...overrides,
  };
}

function createRoundBeer(beerId: number): RoundBeer {
  return {
    id: beerId,
    roundId: 1,
    beerId,
    competitionId: 1,
    entryCode: "SA0001",
    entryNumber: beerId,
    bjcpCategoryCode: "21",
    bjcpCategoryName: "IPA",
    bjcpSubcategoryCode: "21A",
    bjcpSubcategoryName: "American IPA",
    description: "介绍",
    name: "松针 IPA",
    brewery: "山谷酒厂",
    scoreCount: 0,
    createdAt: "2026-07-22T00:00:00.000Z",
  };
}

describe("admin beer list helpers", () => {
  const beers = [
    createBeer(),
    createBeer({
      id: 2,
      entryCode: "BB0002",
      entryNumber: 2,
      bjcpSubcategoryCode: "10A",
      name: "麦香啤酒",
      brewery: "北方工坊",
    }),
  ];

  it("combines case-insensitive keyword and exact BJCP filters", () => {
    expect(filterBeerList(beers, { keyword: "sa", bjcpSubcategoryCode: "21A" })).toEqual([
      beers[0],
    ]);
    expect(filterBeerList(beers, { keyword: "酒厂", bjcpSubcategoryCode: "10A" })).toEqual([]);
    expect(filterBeerList(beers, {})).toEqual(beers);
  });

  it("filters round beers with the same keyword and BJCP rules", () => {
    const roundBeers = [
      createRoundBeer(1),
      {
        ...createRoundBeer(2),
        entryCode: "BB0002",
        bjcpSubcategoryCode: "10A",
        name: "麦香啤酒",
        brewery: "北方工坊",
      },
    ];

    expect(filterBeerList(roundBeers, { keyword: "山谷", bjcpSubcategoryCode: "21A" })).toEqual([
      roundBeers[0],
    ]);
    expect(filterBeerList(roundBeers, { keyword: "北方", bjcpSubcategoryCode: "21A" })).toEqual([]);
  });

  it("turns generated Markdown into a single readable plain-text summary", () => {
    expect(
      beerDescriptionToPlainText("#### 香\\#气\n\n松针 &amp; 柑橘\n第二行\n\n#### 口感\n\n\\-")
    ).toBe("香#气 松针 & 柑橘 第二行 口感 -");
  });

  it("excludes beers already imported into the selected round", () => {
    expect(availableRoundBeers(beers, [createRoundBeer(1)])).toEqual([beers[1]]);
  });

  it("searches Transfer items by number, code, BJCP, name, and brewery", () => {
    expect(matchesRoundBeerSearch(beers[0]!, "1")).toBe(true);
    expect(matchesRoundBeerSearch(beers[0]!, "sa0001")).toBe(true);
    expect(matchesRoundBeerSearch(beers[0]!, "21a")).toBe(true);
    expect(matchesRoundBeerSearch(beers[0]!, "松针")).toBe(true);
    expect(matchesRoundBeerSearch(beers[0]!, "山谷")).toBe(true);
    expect(matchesRoundBeerSearch(beers[0]!, "北方")).toBe(false);
  });
});
