import { formatFullDateTime } from "../../utils/datetime.js";

type JudgeSubmittedBeerListItemInput = {
  entryCode: string;
  totalScore: number;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  submittedAt: string | Date;
};

export function formatJudgeSubmittedBeerListItem(beer: JudgeSubmittedBeerListItemInput) {
  return {
    entryCode: beer.entryCode,
    totalScoreLabel: `${beer.totalScore}分`,
    bjcpSubcategoryLabel: `${beer.bjcpSubcategoryCode} ${beer.bjcpSubcategoryName}`,
    submittedAtLabel: formatFullDateTime(beer.submittedAt),
  };
}
