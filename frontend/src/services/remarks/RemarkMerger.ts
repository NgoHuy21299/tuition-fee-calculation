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

      // Skip the meta row headers like "Tốt/Chưa tốt" labels; they are not headers row 1. Here we only react to real sections.
      // For normal sections with sub-options on meta row (e.g., Tốt/Chưa tốt), detect mutually exclusive selection
      // meta row may carry labels like "Tốt", "Chưa tốt"; we will detect contiguous window below

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
        const content = fillPlaceholders(template, {
          "Tên học sinh": studentName,
          "tên học sinh": studentName,
          "Tên bài thi": examName,
          "tên bài thi": examName,
          "Các dạng bài làm chưa tốt": list,
          "các dạng bài làm chưa tốt": list,
        });
        if (content.trim()) parts.push(ensurePeriodEnding(content));
        continue;
      }

      // General sections: check within a small window to the right for mutually exclusive picks based on meta row (e.g., Tốt/Chưa tốt)
      // Heuristic: collect contiguous non-empty meta labels starting at c until next empty or new section encountered.
      let windowEnd = c;
      for (let cc = c; cc < headers.length; cc++) {
        const sameSection = norm(String(headers[cc] ?? "")) === headerNorm;
        if (!sameSection) break;
        const meta = String(matrix[structure.metaRowIndex]?.[cc] ?? "");
        if (!meta) break;
        windowEnd = cc;
      }

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
        // advance c to windowEnd in the for-loop by relying on outer increment; here we just continue
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
