import { formatFullDateTime } from "../../utils/datetime.js";

type JudgeSubmittedBeerListItemInput = {
  entryCode: string;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  submittedAt: string | Date;
};

export function formatJudgeSubmittedBeerListItem(beer: JudgeSubmittedBeerListItemInput) {
  return {
    entryCode: beer.entryCode,
    bjcpSubcategoryLabel: `${beer.bjcpSubcategoryCode} ${beer.bjcpSubcategoryName}`,
    submittedAtLabel: `提交时间：${formatFullDateTime(beer.submittedAt)}`,
  };
}
