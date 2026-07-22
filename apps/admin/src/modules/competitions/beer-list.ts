import type { Beer, RoundBeer } from "./competitions-api.js";

export interface BeerListFilters {
  keyword?: string;
  bjcpSubcategoryCode?: string;
}

type FilterableBeer = Pick<Beer, "entryCode" | "name" | "brewery" | "bjcpSubcategoryCode">;

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterBeerList<T extends FilterableBeer>(beers: T[], filters: BeerListFilters) {
  const keyword = normalizeSearchText(filters.keyword ?? "");
  return beers.filter((beer) => {
    if (
      keyword &&
      ![beer.entryCode, beer.name, beer.brewery].some((value) =>
        normalizeSearchText(value).includes(keyword)
      )
    ) {
      return false;
    }
    return !filters.bjcpSubcategoryCode || beer.bjcpSubcategoryCode === filters.bjcpSubcategoryCode;
  });
}

const markdownEscapableCharacters = new Set("\\`*_{}[]()#+-.!|".split(""));

export function beerDescriptionToPlainText(description: string) {
  return description
    .replace(/^#{1,6}[\t ]+/gm, "")
    .replace(/\\(.)/g, (match, character: string) =>
      markdownEscapableCharacters.has(character) ? character : match
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

export function availableRoundBeers(beers: Beer[], roundBeers: RoundBeer[]) {
  const existingBeerIds = new Set(roundBeers.map((beer) => beer.beerId));
  return beers.filter((beer) => !existingBeerIds.has(beer.id));
}

export function matchesRoundBeerSearch(beer: Beer, input: string) {
  const keyword = normalizeSearchText(input);
  if (!keyword) return true;
  return normalizeSearchText(
    [beer.entryNumber, beer.entryCode, beer.bjcpSubcategoryCode, beer.name, beer.brewery].join(" ")
  ).includes(keyword);
}
