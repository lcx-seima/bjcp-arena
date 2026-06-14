import {
  beerStatuses,
  bjcpSubcategories,
  competitionStatuses,
  type BeerResult,
  type BeerStatus,
  type CompetitionResult,
  type CompetitionStatus,
} from "@bjcp-arena/contracts";

export type Competition = CompetitionResult["competition"];
export type Beer = BeerResult["beer"];

export const competitionStatusLabels: Record<CompetitionStatus, string> = {
  draft: "草稿",
  judging: "评审中",
  closed: "已结束",
  published: "已公布",
};

export const beerStatusLabels: Record<BeerStatus, string> = {
  draft: "草稿",
  published: "比赛中",
  removed: "已退出",
};

export const competitionStatusOptions = competitionStatuses.map((status) => ({
  label: competitionStatusLabels[status],
  value: status,
}));

export const beerStatusOptions = beerStatuses.map((status) => ({
  label: beerStatusLabels[status],
  value: status,
}));

export const bjcpStyleOptions = bjcpSubcategories.map((style) => ({
  label: `${style.subcategoryCode} ${style.subcategoryName}`,
  value: style.subcategoryCode,
}));
