import { useState } from "react";
import type { MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "../../services/remarks/RemarkTypes";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chỉ số</TableHead>
                  <TableHead>Giá trị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-gray-300">Tổng số học sinh</TableCell>
                  <TableCell>{totalStudents}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-gray-300">Tổng số mẫu câu</TableCell>
                  <TableCell>{totalTemplateRows}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-gray-300">Tổng số phần nhận xét</TableCell>
                  <TableCell>{sections.length} ({sections.join(", ") || "-"})</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Preview table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Xem trước</h3>
        <div className="overflow-x-auto mt-2">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tên học sinh</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Nhận xét</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result?.rows || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="text-gray-300">{r.studentName}</TableCell>
                    <TableCell className="text-gray-300">{r.score || "-"}</TableCell>
                    <TableCell className="text-gray-200">
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
