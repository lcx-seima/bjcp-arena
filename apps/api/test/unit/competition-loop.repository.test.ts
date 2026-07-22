import { describe, expect, it } from "vitest";
import type { ImportBeerRow } from "@bjcp-arena/contracts";
import { createMemoryCompetitionLoopRepository } from "../../src/modules/competition-loop/competition-loop.repository.js";

function importRow(entryCode: string, rowNumber: number): ImportBeerRow {
  return {
    rowNumber,
    entryCode,
    bjcpSubcategoryCode: "21A",
    categoryRemark: "",
    description: "介绍",
    name: "酒款",
    brewery: "酒厂",
  };
}

describe("competition loop repository beer import", () => {
  it("does not commit staged rows when an atomic memory import fails", async () => {
    const repository = createMemoryCompetitionLoopRepository();
    const competition = await repository.createCompetition({ name: "原子导入测试" });
    const invalid = {
      ...importRow("SA0002", 3),
      bjcpSubcategoryCode: "INVALID" as ImportBeerRow["bjcpSubcategoryCode"],
    };

    await expect(
      repository.upsertBeersAtomically(competition.id, [importRow("SA0001", 2), invalid])
    ).rejects.toThrow("BJCP subcategory not found");
    await expect(repository.listBeers(competition.id)).resolves.toEqual([]);
  });
});
