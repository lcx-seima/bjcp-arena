import { describe, expect, it } from "vitest";
import { formatJudgeSubmittedBeerListItem } from "./judge-submitted-beer-list.js";

describe("formatJudgeSubmittedBeerListItem", () => {
  it("builds submitted beer list copy with code, BJCP subcategory and submitted time", () => {
    expect(
      formatJudgeSubmittedBeerListItem({
        entryCode: "AB1234",
        totalScore: 18,
        bjcpSubcategoryCode: "21A",
        bjcpSubcategoryName: "American IPA",
        submittedAt: new Date(2026, 6, 8, 13, 14, 15),
      })
    ).toEqual({
      entryCode: "AB1234",
      totalScoreLabel: "18分",
      bjcpSubcategoryLabel: "21A American IPA",
      submittedAtLabel: "2026-07-08 13:14:15",
    });
  });
});
