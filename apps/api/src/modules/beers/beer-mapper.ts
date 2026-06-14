import type { StoredBeer } from "./beers.types.js";

export function toBeerResult(beer: StoredBeer) {
  return {
    id: beer.id,
    competitionId: beer.competitionId,
    entryNumber: beer.entryNumber,
    realName: beer.realName,
    producer: beer.producer,
    bjcpCategoryCode: beer.bjcpCategoryCode,
    bjcpCategoryName: beer.bjcpCategoryName,
    bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
    bjcpSubcategoryName: beer.bjcpSubcategoryName,
    description: beer.description,
    status: beer.status,
    createdAt: beer.createdAt.toISOString(),
    updatedAt: beer.updatedAt.toISOString(),
  };
}
