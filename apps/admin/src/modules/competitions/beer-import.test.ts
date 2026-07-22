import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  BeerImportError,
  buildImportBeerRows,
  createEmptyBeerImportMapping,
  isBeerImportMappingComplete,
  parseBeerImportWorkbook,
  type BeerImportMapping,
} from "./beer-import.js";

function workbookData(rows: unknown[][], secondSheetRows?: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "首表");
  if (secondSheetRows) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(secondSheetRows), "次表");
  }
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

const mapping: BeerImportMapping = {
  entryCodeColumn: 0,
  nameColumn: 1,
  breweryColumn: 2,
  bjcpSubcategoryCodeColumn: 3,
  categoryRemarkColumn: 4,
  descriptionColumns: [5, 6],
};

describe("beer Excel import", () => {
  it("reads only the first sheet and keeps physical row numbers and duplicate headers", () => {
    const parsed = parseBeerImportWorkbook(
      workbookData(
        [
          ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "介绍", "介绍"],
          ["SA0001", "酒款一", "酒厂一", "21A", "", "香气", "口感"],
          [],
          ["SA0002", "酒款二", "酒厂二", "999", "", "", ""],
        ],
        [["错误工作表"]]
      ),
      "酒款.xlsx"
    );

    expect(parsed).toMatchObject({ fileName: "酒款.xlsx", sheetName: "首表" });
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual([2, 4]);
    expect(parsed.columns.map((column) => column.label)).toEqual([
      "参赛ID",
      "参赛酒名",
      "参赛酒厂",
      "BJCP类型",
      "备注",
      "介绍（F列）",
      "介绍（G列）",
    ]);
  });

  it("rejects a column that has data without a header", () => {
    expect(() =>
      parseBeerImportWorkbook(
        workbookData([
          ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "介绍", ""],
          ["SA0001", "酒款一", "酒厂一", "21A", "", "香气", "无表头数据"],
        ]),
        "酒款.xlsx"
      )
    ).toThrow("G 列存在数据，但第一行表头为空");
  });

  it("rejects workbooks without data and imports over the row limit", () => {
    const headers = ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "介绍"];
    expect(() =>
      parseBeerImportWorkbook(workbookData([headers]), "空文件.xlsx")
    ).toThrow("Excel 中没有可导入的数据");

    const dataRows = Array.from({ length: 1001 }, (_, index) => [
      `SA${String(index).padStart(4, "0")}`,
      "酒款",
      "酒厂",
      "21A",
      "",
      "介绍",
    ]);
    expect(() =>
      parseBeerImportWorkbook(workbookData([headers, ...dataRows]), "超限.xlsx")
    ).toThrow("单次最多导入 1000 条数据");
  });

  it("requires all mappings and prevents source-column reuse", () => {
    expect(isBeerImportMappingComplete(createEmptyBeerImportMapping())).toBe(false);
    expect(isBeerImportMappingComplete(mapping)).toBe(true);
    expect(
      isBeerImportMappingComplete({
        ...mapping,
        descriptionColumns: [4, 6],
      })
    ).toBe(false);
  });

  it("builds escaped Markdown in selected-column order and uses a dash for empty cells", () => {
    const parsed = parseBeerImportWorkbook(
      workbookData([
        ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "香气", "口感"],
        [" sa0001 ", " 酒款一 ", " 酒厂一 ", " 21a ", "", "#柑橘*", ""],
      ]),
      "酒款.xlsx"
    );

    expect(buildImportBeerRows(parsed, mapping)).toEqual([
      {
        rowNumber: 2,
        entryCode: "SA0001",
        name: "酒款一",
        brewery: "酒厂一",
        bjcpSubcategoryCode: "21A",
        categoryRemark: "",
        description: "#### 香气\n\n\\#柑橘\\*\n\n#### 口感\n\n\\-",
      },
    ]);
  });

  it("stops at the first invalid row", () => {
    const parsed = parseBeerImportWorkbook(
      workbookData([
        ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "介绍", "备用介绍"],
        ["SA0001", "", "酒厂一", "21A", "", "介绍", ""],
        ["BAD", "酒款二", "酒厂二", "错误", "", "介绍", ""],
      ]),
      "酒款.xlsx"
    );

    expect(() => buildImportBeerRows(parsed, mapping)).toThrow(
      new BeerImportError("第 2 行：参赛酒名不能为空")
    );
  });

  it("rejects a duplicate entry ID at its second occurrence", () => {
    const parsed = parseBeerImportWorkbook(
      workbookData([
        ["参赛ID", "参赛酒名", "参赛酒厂", "BJCP类型", "备注", "介绍", "备用介绍"],
        ["SA0001", "酒款一", "酒厂一", "21A", "", "介绍", ""],
        ["sa0001", "酒款二", "酒厂二", "21A", "", "介绍", ""],
      ]),
      "酒款.xlsx"
    );

    expect(() => buildImportBeerRows(parsed, mapping)).toThrow(
      "第 3 行：参赛ID SA0001 重复，首次出现在第 2 行"
    );
  });
});
