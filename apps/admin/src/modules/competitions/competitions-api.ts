import {
  bjcpSubcategories,
  type BeerResult,
  type CompetitionStatus,
  type CompetitionResult,
  type EntityStatus,
  type RoundBeerListResult,
  type RoundListResult,
} from "@bjcp-arena/contracts";

export type Competition = CompetitionResult["competition"];
export type Beer = BeerResult["beer"];
export type CompetitionRound = RoundListResult["rounds"][number];
export type RoundBeer = RoundBeerListResult["beers"][number];

export const competitionStatusLabels: Record<CompetitionStatus, string> = {
  ongoing: "比赛中",
  ended: "已关闭",
  archived: "已归档",
};

export const roundStatusLabels: Record<EntityStatus, string> = {
  ongoing: "进行中",
  ended: "已结束",
};

export const bjcpStyleOptions = bjcpSubcategories.map((style) => ({
  label: `${style.subcategoryCode} ${style.subcategoryName}`,
  value: style.subcategoryCode,
}));
