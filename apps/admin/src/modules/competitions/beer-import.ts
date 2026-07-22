import * as XLSX from "xlsx";
import {
  findBjcpSubcategory,
  importBeerRowSchema,
  normalizeEntryCode,
  type ImportBeerRow,
} from "@bjcp-arena/contracts";

const MAX_IMPORT_ROWS = 1000;
const MIN_IMPORT_COLUMNS = 6;

export interface BeerImportColumn {
  index: number;
  letter: string;
  name: string;
  label: string;
}

export interface BeerImportSourceRow {
  rowNumber: number;
  values: string[];
}

export interface ParsedBeerImportFile {
  fileName: string;
  sheetName: string;
  columns: BeerImportColumn[];
  rows: BeerImportSourceRow[];
}

export interface BeerImportMapping {
  entryCodeColumn: number | null;
  nameColumn: number | null;
  breweryColumn: number | null;
  bjcpSubcategoryCodeColumn: number | null;
  categoryRemarkColumn: number | null;
  descriptionColumns: number[];
}

export class BeerImportError extends Error {}

function readCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: unknown) {
  return readCell(value).replace(/\s+/g, " ");
}

function workbookRows(sheet: XLSX.WorkSheet) {
  const reference = sheet["!ref"];
  if (!reference) return [];
  const range = XLSX.utils.decode_range(reference);
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: true,
    defval: "",
    header: 1,
    range: {
      s: { c: 0, r: 0 },
      e: range.e,
    },
    raw: false,
  });
}

export function parseBeerImportWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName: string
): ParsedBeerImportFile {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    throw new BeerImportError("Excel 文件解析失败，请确认文件格式正确");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet) {
    throw new BeerImportError("Excel 中没有可读取的工作表");
  }

  const matrix = workbookRows(sheet);
  const headerRow = matrix[0] ?? [];
  const maxColumnCount = matrix.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const provisionalColumns: Array<Omit<BeerImportColumn, "label">> = [];

  for (let index = 0; index < maxColumnCount; index += 1) {
    const name = normalizeHeader(headerRow[index]);
    const hasData = matrix.slice(1).some((row) => readCell(row[index]) !== "");
    if (!name && !hasData) continue;

    const letter = XLSX.utils.encode_col(index);
    if (!name) {
      throw new BeerImportError(`${letter} 列存在数据，但第一行表头为空`);
    }
    provisionalColumns.push({ index, letter, name });
  }

  if (provisionalColumns.length < MIN_IMPORT_COLUMNS) {
    throw new BeerImportError(`Excel 至少需要 ${MIN_IMPORT_COLUMNS} 个有表头的有效列`);
  }

  const nameCounts = new Map<string, number>();
  for (const column of provisionalColumns) {
    nameCounts.set(column.name, (nameCounts.get(column.name) ?? 0) + 1);
  }
  const columns = provisionalColumns.map((column) => ({
    ...column,
    label:
      (nameCounts.get(column.name) ?? 0) > 1 ? `${column.name}（${column.letter}列）` : column.name,
  }));

  const rows = matrix.slice(1).flatMap<BeerImportSourceRow>((row, rowIndex) => {
    const hasData = columns.some((column) => readCell(row[column.index]) !== "");
    return hasData
      ? [
          {
            rowNumber: rowIndex + 2,
            values: Array.from({ length: maxColumnCount }, (_, index) => readCell(row[index])),
          },
        ]
      : [];
  });

  if (rows.length === 0) {
    throw new BeerImportError("Excel 中没有可导入的数据");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BeerImportError(`单次最多导入 ${MAX_IMPORT_ROWS} 条数据`);
  }

  return { columns, fileName, rows, sheetName };
}

export async function parseBeerImportFile(file: File) {
  return parseBeerImportWorkbook(await file.arrayBuffer(), file.name);
}

export function createEmptyBeerImportMapping(): BeerImportMapping {
  return {
    entryCodeColumn: null,
    nameColumn: null,
    breweryColumn: null,
    bjcpSubcategoryCodeColumn: null,
    categoryRemarkColumn: null,
    descriptionColumns: [],
  };
}

function selectedColumnIndexes(mapping: BeerImportMapping) {
  return [
    mapping.entryCodeColumn,
    mapping.nameColumn,
    mapping.breweryColumn,
    mapping.bjcpSubcategoryCodeColumn,
    mapping.categoryRemarkColumn,
    ...mapping.descriptionColumns,
  ].filter((value): value is number => value !== null);
}

export function isBeerImportMappingComplete(mapping: BeerImportMapping) {
  if (
    mapping.entryCodeColumn === null ||
    mapping.nameColumn === null ||
    mapping.breweryColumn === null ||
    mapping.bjcpSubcategoryCodeColumn === null ||
    mapping.categoryRemarkColumn === null ||
    mapping.descriptionColumns.length === 0
  ) {
    return false;
  }
  const selected = selectedColumnIndexes(mapping);
  return new Set(selected).size === selected.length;
}

function validateMapping(file: ParsedBeerImportFile, mapping: BeerImportMapping) {
  if (!isBeerImportMappingComplete(mapping)) {
    throw new BeerImportError("请完成全部字段映射，且同一个 Excel 列不能重复使用");
  }
  const available = new Set(file.columns.map((column) => column.index));
  if (selectedColumnIndexes(mapping).some((index) => !available.has(index))) {
    throw new BeerImportError("字段映射引用了不存在的 Excel 列，请重新选择");
  }
}

function escapeMarkdownText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}[\]()#+\-.!|])/g, "\\$1");
}

function buildDescription(
  file: ParsedBeerImportFile,
  row: BeerImportSourceRow,
  columnIndexes: number[]
) {
  const columnsByIndex = new Map(file.columns.map((column) => [column.index, column]));
  return columnIndexes
    .map((index) => {
      const column = columnsByIndex.get(index);
      if (!column) throw new BeerImportError("裁判可见介绍映射列不存在");
      const content = row.values[index]?.trim() || "-";
      return `#### ${escapeMarkdownText(column.name)}\n\n${escapeMarkdownText(content)}`;
    })
    .join("\n\n");
}

function rowError(rowNumber: number, message: string): never {
  throw new BeerImportError(`第 ${rowNumber} 行：${message}`);
}

export function buildImportBeerRows(
  file: ParsedBeerImportFile,
  mapping: BeerImportMapping
): ImportBeerRow[] {
  validateMapping(file, mapping);
  const firstRowByEntryCode = new Map<string, number>();
  const result: ImportBeerRow[] = [];

  for (const row of file.rows) {
    const rawEntryCode = row.values[mapping.entryCodeColumn!]?.trim() ?? "";
    let entryCode: string;
    try {
      entryCode = normalizeEntryCode(rawEntryCode);
    } catch {
      rowError(row.rowNumber, "参赛ID必须为 2 个字母加 4 个数字，例如 SA1234");
    }

    const firstRow = firstRowByEntryCode.get(entryCode);
    if (firstRow !== undefined) {
      rowError(row.rowNumber, `参赛ID ${entryCode} 重复，首次出现在第 ${firstRow} 行`);
    }
    firstRowByEntryCode.set(entryCode, row.rowNumber);

    const name = row.values[mapping.nameColumn!]?.trim() ?? "";
    if (!name) rowError(row.rowNumber, "参赛酒名不能为空");
    if (name.length > 160) rowError(row.rowNumber, "参赛酒名不能超过 160 个字符");

    const brewery = row.values[mapping.breweryColumn!]?.trim() ?? "";
    if (!brewery) rowError(row.rowNumber, "参赛酒厂不能为空");
    if (brewery.length > 160) rowError(row.rowNumber, "参赛酒厂不能超过 160 个字符");

    const bjcpCode = row.values[mapping.bjcpSubcategoryCodeColumn!]?.trim().toUpperCase() ?? "";
    const style = findBjcpSubcategory(bjcpCode);
    if (!style) rowError(row.rowNumber, `BJCP类型 ${bjcpCode || "（空）"} 不合法`);

    const categoryRemark = row.values[mapping.categoryRemarkColumn!]?.trim() ?? "";
    if (categoryRemark.length > 500) {
      rowError(row.rowNumber, "分类备注不能超过 500 个字符");
    }

    const description = buildDescription(file, row, mapping.descriptionColumns);
    if (description.length > 5000) {
      rowError(row.rowNumber, "裁判可见介绍拼接后不能超过 5000 个字符");
    }

    const parsed = importBeerRowSchema.safeParse({
      bjcpSubcategoryCode: style.subcategoryCode,
      brewery,
      categoryRemark,
      description,
      entryCode,
      name,
      rowNumber: row.rowNumber,
    });
    if (!parsed.success) rowError(row.rowNumber, "字段内容不符合导入要求");
    result.push(parsed.data);
  }

  return result;
}
