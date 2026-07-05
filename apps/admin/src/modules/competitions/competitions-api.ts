import {
  bjcpSubcategories,
  entityStatuses,
  type BeerResult,
  type CompetitionResult,
  type EntityStatus,
  type RoundBeerListResult,
  type RoundListResult,
} from "@bjcp-arena/contracts";

export type Competition = CompetitionResult["competition"];
export type Beer = BeerResult["beer"];
export type CompetitionRound = RoundListResult["rounds"][number];
export type RoundBeer = RoundBeerListResult["beers"][number];

export const entityStatusLabels: Record<EntityStatus, string> = {
  ongoing: "比赛中",
  ended: "结束",
};

export const entityStatusOptions = entityStatuses.map((status) => ({
  label: entityStatusLabels[status],
  value: status,
}));

export const bjcpStyleOptions = bjcpSubcategories.map((style) => ({
  label: `${style.subcategoryCode} ${style.subcategoryName}`,
  value: style.subcategoryCode,
}));
