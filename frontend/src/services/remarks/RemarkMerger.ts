import type { MergeResultRow, MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "./RemarkTypes";

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function ensurePeriodEnding(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

function fillPlaceholders(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => ctx[key] ?? ctx[norm(key)] ?? "");
}

export function mergeRemarks(matrix: SheetMatrix, structure: RemarkStructure): MergeResultSummary {
  const rows: MergeResultRow[] = [];
  const headers = structure.headers;
  const templates = structure.templates;

  const idxExamName = 0; // A column for exam name placeholder source per requirement
  const examName = structure.examName ?? String(matrix[1]?.[idxExamName] ?? "").trim();

  for (let r = structure.studentRecordsStartRowIndex; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const studentName = String(row[structure.nameColumnIndex] ?? "").trim();
    const issues: ValidationIssue[] = [];
    if (!studentName) {
      // Stop at the first empty student row as requested; XLSX may contain trailing blank rows
      break;
    }

    // Build remark parts in the order of headers row
    const parts: string[] = [];

    // Problem types range
    const goodRange = structure.goodRange;
    const problemTypes: string[] = [];
    if (goodRange) {
      for (let c = goodRange.startCol; c < goodRange.endColExclusive; c++) {
        const label = String(matrix[structure.metaRowIndex]?.[c] ?? "").trim();
        if (!label) continue;
        problemTypes.push(label);
      }
    }

    // Determine selections in problem types
    const selectedGood: string[] = [];
    const selectedGoodSet = new Set<number>();
    if (goodRange) {
      for (let c = goodRange.startCol; c < goodRange.endColExclusive; c++) {
        const v = String(row[c] ?? "");
        if (norm(v) === "x") {
          selectedGood.push(String(matrix[structure.metaRowIndex]?.[c] ?? ""));
          selectedGoodSet.add(c);
        }
      }
    }

    const selectedNotGood: string[] = [];
    if (goodRange) {
      for (let c = goodRange.startCol; c < goodRange.endColExclusive; c++) {
        if (!selectedGoodSet.has(c)) {
          const label = String(matrix[structure.metaRowIndex]?.[c] ?? "");
          if (label) selectedNotGood.push(label);
        }
      }
    }

    // Iterate sections by headers row 1
    for (let c = 0; c < headers.length; c++) {
      const header = String(headers[c] ?? "").trim();
      if (!header) continue;
      const headerNorm = norm(header);
      const template = String(templates[c] ?? "");

      // Determine contiguous window for this section, including subsequent columns that belong to the same section
      // Some sheets only fill the header cell on the first column (others are blank) but still contain templates/meta labels
      let windowEnd = c;
      for (let cc = c + 1; cc < headers.length; cc++) {
        const h = String(headers[cc] ?? "").trim();
        const tmpl = String(templates[cc] ?? "");
        const metaAt = String(matrix[structure.metaRowIndex]?.[cc] ?? "").trim();
        if (h && norm(h) !== headerNorm) break; // reached next section
        if (!h && !tmpl && !metaAt) break; // truly empty column => end window
        windowEnd = cc; // part of current section
      }

      // Special-case: problem types sections
      if (headerNorm === norm("Câu dạng bài làm tốt")) {
        if (!template) continue;
        const list = selectedGood.map((s) => s.toLowerCase()).join(", ");
        const content = fillPlaceholders(template, {
          "Tên học sinh": studentName,
          "tên học sinh": studentName,
          "Tên bài thi": examName,
          "tên bài thi": examName,
          "Các dạng bài làm tốt": list,
          "các dạng bài làm tốt": list,
        });
        if (content.trim()) parts.push(ensurePeriodEnding(content));
        continue;
      }
      if (headerNorm === norm("Câu dạng bài chưa làm tốt")) {
        if (!template) continue;
        const list = selectedNotGood.map((s) => s.toLowerCase()).join(", ");
        if (!list.trim()) {
          // no not-good items => skip rendering this sentence
          // advance c to windowEnd and continue
          c = windowEnd;
          continue;
        }
        const content = fillPlaceholders(template, {
          "Tên học sinh": studentName,
          "tên học sinh": studentName,
          "Tên bài thi": examName,
          "tên bài thi": examName,
          "Các dạng bài làm chưa tốt": list,
          "các dạng bài làm chưa tốt": list,
        });
        if (content.trim()) parts.push(ensurePeriodEnding(content));
        // advance and continue
        c = windowEnd;
        continue;
      }

      // General sections with sub-options within [c..windowEnd]
      if (windowEnd > c) {
        // count Xs in [c..windowEnd]
        let pickedIdx: number | null = null;
        let pickCount = 0;
        for (let cc = c; cc <= windowEnd; cc++) {
          if (norm(row[cc]) === "x") {
            pickedIdx = cc;
            pickCount++;
          }
        }
        if (pickCount > 1) {
          issues.push({ type: "conflict_selection", message: `Nhiều lựa chọn trong phần '${header}'`, rowIndex: r, sectionName: header, studentName });
        }
        if (pickCount >= 1 && pickedIdx !== null) {
          const content = fillPlaceholders(String(templates[pickedIdx] ?? template ?? ""), {
            "Tên học sinh": studentName,
            "tên học sinh": studentName,
            "Tên bài thi": examName,
            "tên bài thi": examName,
          });
          if (content.trim()) parts.push(ensurePeriodEnding(content));
        }
        // advance c to windowEnd to skip processed columns of this section
        c = windowEnd;
        continue;
      }

      // Single column section: if this cell is x, use its template
      if (norm(row[c]) === "x") {
        const content = fillPlaceholders(template, {
          "Tên học sinh": studentName,
          "tên học sinh": studentName,
          "Tên bài thi": examName,
          "tên bài thi": examName,
        });
        if (content.trim()) parts.push(ensurePeriodEnding(content));
      }
    }

    const remark = parts.join(" ").trim();
    rows.push({ studentName, remark, issues });
  }

  const errors = rows.reduce((acc, r) => acc + r.issues.length, 0);
  return { rows, total: rows.length, errors };
}
