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
  // Summary info
  const totalStudents = result?.rows.length ?? 0;
  const totalTemplateRows = structure?.templateRowsIndices?.length ?? (structure ? 1 : 0);
  const sectionsAll = (structure?.headers || [])
    .map((h) => String(h || "").trim())
    .filter((h) => !!h);
  const sections = sectionsAll.slice();
  if (sections.length > 0 && sections[sections.length - 1].toLowerCase() === "nhận xét") {
    sections.pop();
  }

  return (
    <div className="space-y-4">
      {/* Summary table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Tóm tắt thông tin</h3>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-3 font-medium">Chỉ số</th>
                <th className="py-2 pr-3 font-medium">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-800">
                <td className="py-2 pr-3 text-gray-300">Tổng số học sinh</td>
                <td className="py-2 pr-3">{totalStudents}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 pr-3 text-gray-300">Tổng số mẫu câu</td>
                <td className="py-2 pr-3">{totalTemplateRows}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 pr-3 text-gray-300">Tổng số phần nhận xét</td>
                <td className="py-2 pr-3">{sections.length} ({sections.join(", ") || "-"})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Xem trước</h3>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Tên học sinh</th>
                <th className="py-2 pr-3 font-medium">Nhận xét</th>
                <th className="py-2 pr-3 font-medium">Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {(result?.rows.slice(0, 10) || []).map((r, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3 text-gray-300">{r.studentName}</td>
                  <td className="py-2 pr-3 text-gray-200">{r.remark || "(trống)"}</td>
                  <td className="py-2 pr-3">
                    {r.issues.length > 0 ? (
                      <span className="text-red-400 text-xs">{r.issues.map((e) => e.message).join("; ")}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
