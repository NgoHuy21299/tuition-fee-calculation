import type { MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "../../services/remarks/RemarkTypes";

export default function PreviewPanel({
  matrix,
  structure,
  result,
  issues,
}: {
  matrix: SheetMatrix | null;
  structure: RemarkStructure | null;
  result: MergeResultSummary | null;
  issues: ValidationIssue[];
}) {
  if (!matrix) return null;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Nhận diện cấu trúc</h3>
        <div className="text-xs text-gray-400">
          <div>Headers: {structure?.headers.length ?? 0}</div>
          <div>Dòng meta: {structure?.metaRowIndex ?? "-"}</div>
          <div>Dòng bắt đầu học sinh: {structure?.studentRecordsStartRowIndex ?? "-"}</div>
          <div>Exam: {structure?.examName ?? "-"}</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-200">Preview (5 hàng)</h3>
        <div className="text-xs text-gray-400">
          {result?.rows.slice(0, 5).map((r, i) => (
            <div key={i} className="py-1">
              <div className="text-gray-300"><span className="font-medium">{r.studentName}</span>: {r.remark || "(trống)"}</div>
              {r.issues.length > 0 && (
                <div className="text-red-400">Lỗi: {r.issues.map((e) => e.message).join("; ")}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="text-xs text-red-400">
          Cảnh báo cấu trúc: {issues.map((e) => e.message).join("; ")}
        </div>
      )}
    </div>
  );
}
