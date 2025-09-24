import { useState } from "react";
import type { MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "../../services/remarks/RemarkTypes";
import { Button } from "../ui/button";

export default function PreviewPanel({
  matrix,
  structure,
  result,
  issues,
  onRemarkUpdate,
}: {
  matrix: SheetMatrix | null;
  structure: RemarkStructure | null;
  result: MergeResultSummary | null;
  issues: ValidationIssue[];
  onRemarkUpdate?: (index: number, newRemark: string) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const startEdit = (index: number, currentRemark: string) => {
    setEditingIndex(index);
    setEditingText(currentRemark);
  };

  const saveEdit = () => {
    if (editingIndex !== null && onRemarkUpdate) {
      onRemarkUpdate(editingIndex, editingText);
    }
    setEditingIndex(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  if (!matrix) return null;

  // If there are structural issues, only show errors
  if (issues.length > 0) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-red-400">
          <h3 className="text-sm font-semibold text-red-300 mb-2">Lỗi cấu trúc</h3>
          {issues.map((issue, i) => (
            <div key={i} className="mb-1">• {issue.message}</div>
          ))}
          <p className="mt-3 text-gray-400">Vui lòng sửa lỗi trên trước khi tiếp tục.</p>
        </div>
      </div>
    );
  }
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
                <th className="py-2 pr-3 font-medium">Điểm</th>
                <th className="py-2 pr-3 font-medium">Nhận xét</th>
                <th className="py-2 pr-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(result?.rows || []).map((r, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3 text-gray-300">{r.studentName}</td>
                  <td className="py-2 pr-3 text-gray-300">{r.score || "-"}</td>
                  <td className="py-2 pr-3 text-gray-200">
                    {editingIndex === i ? (
                      <div className="flex items-center gap-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 min-h-[60px] px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded resize-none"
                          rows={3}
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            className="text-xs px-2 py-1"
                          >
                            Lưu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="text-xs px-2 py-1"
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      r.remark || "(trống)"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.issues.length > 0 ? (
                      <div className="text-red-400 text-xs mb-1">
                        {r.issues.map((e) => e.message).join("; ")}
                      </div>
                    ) : null}
                    {editingIndex !== i && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(i, r.remark)}
                        className="text-xs px-2 py-1"
                      >
                        Sửa
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
