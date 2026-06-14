import type { BoardCompetitionSummary } from "@bjcp-arena/contracts";
import type { StoredBeer } from "../beers/beers.types.js";
import type { StoredCompetition } from "../competitions/competitions.types.js";
import type { StoredScore } from "./scores.types.js";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function presentNumbers(values: Array<number | null>) {
  return values.filter((value): value is number => value !== null);
}

export function buildBoardCompetitionSummary(input: {
  competition: StoredCompetition;
  beers: StoredBeer[];
  scores: StoredScore[];
  updatedAt?: Date;
}): BoardCompetitionSummary {
  const shouldRevealBeerIdentity = input.competition.status === "published";
  const scoresByBeer = new Map<number, StoredScore[]>();
  for (const score of input.scores) {
    scoresByBeer.set(score.beerId, [...(scoresByBeer.get(score.beerId) ?? []), score]);
  }

  const beers = [...input.beers]
    .sort((a, b) => a.entryNumber - b.entryNumber)
    .map((beer) => {
      const beerScores = scoresByBeer.get(beer.id) ?? [];
      const professionalScores = beerScores.filter(
        (score) => score.judgeTypeSnapshot === "professional"
      );
      const publicScores = beerScores.filter((score) => score.judgeTypeSnapshot === "public");

      return {
        beerId: beer.id,
        entryNumber: beer.entryNumber,
        realName: shouldRevealBeerIdentity ? beer.realName : null,
        producer: shouldRevealBeerIdentity ? beer.producer : null,
        bjcpCategoryCode: beer.bjcpCategoryCode,
        bjcpCategoryName: beer.bjcpCategoryName,
        bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
        bjcpSubcategoryName: beer.bjcpSubcategoryName,
        professionalJudgeCount: professionalScores.length,
        professionalAverageTotalScore: average(
          presentNumbers(professionalScores.map((score) => score.professionalTotalScore))
        ),
        publicJudgeCount: publicScores.length,
        publicAverageOverallPreference: average(
          presentNumbers(publicScores.map((score) => score.publicOverallPreferenceScore))
        ),
        publicAverageAromaBodyFoam: average(
          presentNumbers(publicScores.map((score) => score.publicAromaBodyFoamScore))
        ),
        publicAverageEntryAcceptance: average(
          presentNumbers(publicScores.map((score) => score.publicEntryAcceptanceScore))
        ),
        publicAverageWillingToDrink: average(
          presentNumbers(publicScores.map((score) => score.publicWillingToDrinkScore))
        ),
      };
    });

  return {
    competition: {
      id: input.competition.id,
      name: input.competition.name,
      status: input.competition.status,
    },
    beerCount: beers.length,
    beers,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
  };
}
