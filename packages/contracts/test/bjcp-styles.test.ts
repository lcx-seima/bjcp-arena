import { describe, expect, it } from "vitest";
import {
  bjcpSubcategories,
  bjcpSubcategoryCodeSchema,
  findBjcpSubcategory,
} from "../src/index.js";

describe("BJCP 2021 beer style contracts", () => {
  it("stores every official subcategory from the 2021 beer style guidelines", () => {
    const officialSubcategories = bjcpSubcategories.filter(
      (style) => style.subcategoryCode !== "999"
    );

    expect(officialSubcategories).toHaveLength(109);

    expect(bjcpSubcategories[0]).toEqual({
      categoryCode: "1",
      categoryName: "Standard American Beer",
      subcategoryCode: "1A",
      subcategoryName: "American Light Lager",
      doc: "https://www.bjcp.org/style/2021/1/1A/american-light-lager/",
    });
    expect(findBjcpSubcategory("7C")).toEqual({
      categoryCode: "7",
      categoryName: "Amber Bitter European Beer",
      subcategoryCode: "7C",
      subcategoryName: "Kellerbier",
      doc: "https://www.bjcp.org/style/2015/7/7C/kellerbier/",
    });
    expect(findBjcpSubcategory("21B")).toEqual({
      categoryCode: "21",
      categoryName: "IPA",
      subcategoryCode: "21B",
      subcategoryName: "Specialty IPA",
      doc: "https://www.bjcp.org/style/2021/21/21B/specialty-ipa/",
    });
    expect(officialSubcategories.at(-1)).toEqual({
      categoryCode: "34",
      categoryName: "Specialty Beer",
      subcategoryCode: "34C",
      subcategoryName: "Experimental Beer",
      doc: "https://www.bjcp.org/style/2021/34/34C/experimental-beer/",
    });
  });

  it("validates only official subcategory codes and exposes a document link for each one", () => {
    const officialSubcategories = bjcpSubcategories.filter(
      (style) => style.subcategoryCode !== "999"
    );

    expect(bjcpSubcategoryCodeSchema.parse("34C")).toBe("34C");
    expect(() => bjcpSubcategoryCodeSchema.parse("21B-BELGIAN")).toThrow();

    for (const style of officialSubcategories) {
      expect(style.doc).toMatch(/^https:\/\/www\.bjcp\.org\/style\/20(15|21)\//);
    }
  });

  it("adds a non-BJCP uncategorized placeholder for business-side beer entry", () => {
    expect(bjcpSubcategories).toHaveLength(110);
    expect(new Set(bjcpSubcategories.map((style) => style.subcategoryCode)).size).toBe(110);
    expect(bjcpSubcategoryCodeSchema.parse("999")).toBe("999");

    const uncategorized = findBjcpSubcategory("999");

    expect(uncategorized).toEqual({
      categoryCode: "999",
      categoryName: "未分类",
      subcategoryCode: "999",
      subcategoryName: "未分类",
    });
    expect(uncategorized).not.toHaveProperty("doc");
  });
});
