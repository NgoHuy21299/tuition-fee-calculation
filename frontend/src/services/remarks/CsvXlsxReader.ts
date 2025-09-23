import type { SheetMatrix } from "./RemarkTypes";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

function isCsv(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv");
}

function isExcel(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

export async function readFileToMatrix(file: File): Promise<SheetMatrix> {
  if (isCsv(file)) return readCsv(file);
  if (isExcel(file)) return readXlsx(file);
  throw new Error("Định dạng tệp không được hỗ trợ. Hãy dùng CSV hoặc XLSX/XLS.");
}

async function readCsv(file: File): Promise<SheetMatrix> {
  const text = await file.text();
  const result = Papa.parse<string[]>(text, { delimiter: ",", skipEmptyLines: false });
  if (result.errors?.length) {
    console.warn("CSV parse warnings: ", result.errors);
  }
  const rows: SheetMatrix = (result.data || []).map((r: string[]) =>
    r.map((c: string | undefined) => (c ?? "").toString())
  );
  return rows;
}

async function readXlsx(file: File): Promise<SheetMatrix> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown as (string | number | boolean | null | undefined)[][];
  return rows as SheetMatrix;
}
