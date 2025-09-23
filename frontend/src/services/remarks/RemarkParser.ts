import type { SheetMatrix, RemarkStructure, ValidationIssue } from "./RemarkTypes";

const normalize = (s: unknown) => (String(s ?? "").trim().toLowerCase());

export function parseRemarkStructure(matrix: SheetMatrix): { structure: RemarkStructure | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (!matrix || matrix.length === 0) {
    issues.push({ type: "general", message: "Bảng trống hoặc không đọc được dữ liệu." });
    return { structure: null, issues };
  }

  const headers = (matrix[0] || []).map((c) => String(c ?? ""));
  // templates rows may be multiple contiguous rows after header and before meta/student header row
  // temporary templates will be overwritten after we detect metaRowIndex below
  const templates: string[] = (matrix[1] || []).map((c) => String(c ?? ""));

  // find "Tên học sinh" row in column A (any row)
  let studentHeaderRowIndex = -1;
  const nameColumnIndex = 0;
  for (let r = 0; r < Math.min(matrix.length, 50); r++) {
    if (normalize(matrix[r]?.[nameColumnIndex]) === normalize("Tên học sinh")) {
      studentHeaderRowIndex = r;
      break;
    }
  }
  if (studentHeaderRowIndex < 0) {
    issues.push({ type: "missing_header", message: "Không tìm thấy ô 'Tên học sinh' ở cột A." });
    return { structure: null, issues };
  }

  const metaRowIndex = Math.max(0, studentHeaderRowIndex); // the row containing labels like Tốt/Chưa tốt, dạng bài
  const studentRecordsStartRowIndex = studentHeaderRowIndex + 1;

  // exam name from A2 (matrix[1][0]) - strip leading label 'Tên bài thi:' if present
  const rawExam = String(matrix[1]?.[0] ?? "");
  const cleaned = rawExam.replace(/^\s*tên\s*bài\s*thi\s*:\s*/i, "").trim();
  const examName = (cleaned || rawExam.trim()) || null;

  // detect columns for good/bad section headers by matching row-0 headers
  const goodHeaderIndex = headers.findIndex((h) => normalize(h) === normalize("Câu dạng bài làm tốt"));
  const notGoodHeaderIndex = headers.findIndex((h) => normalize(h) === normalize("Câu dạng bài chưa làm tốt"));

  let goodRange: RemarkStructure["goodRange"] = null;
  if (goodHeaderIndex >= 0 && notGoodHeaderIndex > goodHeaderIndex) {
    // problem types are on the metaRowIndex row, starting at goodHeaderIndex and ending before notGoodHeaderIndex
    goodRange = { startCol: goodHeaderIndex, endColExclusive: notGoodHeaderIndex };
  } else if (goodHeaderIndex >= 0 && notGoodHeaderIndex < 0) {
    // if there's no not-good header, assume list runs to the end of row
    goodRange = { startCol: goodHeaderIndex, endColExclusive: (matrix[metaRowIndex]?.length ?? headers.length) };
  } else if (goodHeaderIndex < 0) {
    issues.push({ type: "range_detection_failed", message: "Không tìm thấy header 'Câu dạng bài làm tốt'." });
  }

  const structure: RemarkStructure = {
    headers,
    templates, // will be replaced below once template rows are discovered
    templateRowsIndices: [],
    metaRowIndex,
    studentHeaderRowIndex,
    studentRecordsStartRowIndex,
    nameColumnIndex,
    examName,
    goodHeaderIndex: goodHeaderIndex >= 0 ? goodHeaderIndex : null,
    notGoodHeaderIndex: notGoodHeaderIndex >= 0 ? notGoodHeaderIndex : null,
    goodRange,
  };
  // Discover template rows: any non-empty row between header (row 0) and metaRowIndex (exclusive)
  const templateRows: number[] = [];
  for (let r = 1; r < metaRowIndex; r++) {
    const row = matrix[r] || [];
    const hasAny = row.some((cell) => String(cell ?? "").trim().length > 0);
    if (hasAny) templateRows.push(r);
  }
  if (templateRows.length === 0) {
    // fallback to row 1 if present
    if (matrix.length > 1) templateRows.push(1);
  }
  structure.templateRowsIndices = templateRows;
  // default templates = first template row
  if (templateRows.length > 0) {
    structure.templates = (matrix[templateRows[0]] || []).map((c) => String(c ?? ""));
  }
  return { structure, issues };
}
