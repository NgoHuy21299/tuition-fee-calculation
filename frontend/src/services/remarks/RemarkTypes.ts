export type Cell = string | number | boolean | null | undefined;
export type Row = Cell[];
export type SheetMatrix = Row[]; // 0-indexed [row][col]

export type HeaderIndexMap = Record<string, number>; // normalized header (lower-trim) -> col index

export interface RemarkStructure {
  headers: string[]; // row 1 values
  templates: string[]; // row 2 values
  metaRowIndex: number; // the row index that contains labels like "Tốt", "Chưa tốt", and the list of dạng bài (e.g., 2 for row3 visually)
  studentHeaderRowIndex: number; // row index where the cell with text "Tên học sinh" is found (e.g., 2 for row3 visually)
  studentRecordsStartRowIndex: number; // first row index after the student header row
  nameColumnIndex: number; // column index of student name (typically 0)
  examName: string | null; // from A2 per requirement
  goodHeaderIndex: number | null; // col index of header 'Câu dạng bài làm tốt'
  notGoodHeaderIndex: number | null; // col index of header 'Câu dạng bài chưa làm tốt'
  goodRange: { startCol: number; endColExclusive: number } | null; // columns for list of problem types under 'good'
}

export interface ValidationIssue {
  type:
    | "missing_header"
    | "missing_template"
    | "conflict_selection"
    | "range_detection_failed"
    | "missing_student_name"
    | "general";
  message: string;
  rowIndex?: number; // for student row index
  columnIndex?: number; // optional
  sectionName?: string; // e.g., 'Câu khen'
  studentName?: string;
}

export interface MergeResultRow {
  studentName: string;
  remark: string;
  issues: ValidationIssue[];
}

export interface MergeResultSummary {
  rows: MergeResultRow[];
  total: number;
  errors: number;
}
