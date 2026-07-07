import { describe, expect, it } from "vitest";
import { formatFullDateTime } from "./datetime.js";

describe("formatFullDateTime", () => {
  it("formats date time as YYYY-MM-DD HH:mm:ss", () => {
    expect(formatFullDateTime(new Date(2026, 0, 2, 3, 4, 5))).toBe("2026-01-02 03:04:05");
  });
});
