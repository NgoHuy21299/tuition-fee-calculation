import * as XLSX from "xlsx";
import type { MergeResultSummary } from "../../services/remarks/RemarkTypes";
import { useToast } from "../commons/Toast";
import { Button } from "../ui/button";
import type { RemarkStructure } from "../../services/remarks/RemarkTypes";

export default function ActionsBar({
  result,
  onRerun,
  loading = false,
  uploadedFile,
  structure,
}: {
  result: MergeResultSummary | null;
  onRerun: () => void | Promise<void>;
  loading?: boolean;
  uploadedFile: File | null;
  structure: RemarkStructure | null;
}) {
  const { toast } = useToast();
  const buildFileName = (base: string, ext: string) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return `${base}-${yyyy}-${mm}-${dd}-${rand}.${ext}`;
  };
  const handleCopyAll = async () => {
    const text = (result?.rows || []).map((r) => r.remark).join("\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép nhận xét", variant: "success" });
  };

  const handleDownloadXlsx = async () => {
    try {
      if (!uploadedFile) {
        toast({ title: "Chưa có tệp Excel để cập nhật", variant: "warning" });
        return;
      }
      if (!result || !structure) {
        toast({ title: "Chưa có dữ liệu nhận xét để ghi", variant: "warning" });
        return;
      }

      // Read original workbook
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // Convert to matrix (AOA)
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as (string | number | boolean | null | undefined)[][];

      // Ensure header row exists
      if (!matrix[0]) matrix[0] = [];
      // Find or create 'Nhận xét' column in header row (row 0)
      const headerRow = matrix[0].map((c) => String(c ?? ""));
      let remarkCol = headerRow.findIndex((h) => String(h).trim().toLowerCase() === "nhận xét");
      if (remarkCol < 0) {
        remarkCol = headerRow.length;
        headerRow[remarkCol] = "Nhận xét";
        matrix[0] = headerRow;
      }

      // Write remarks for each student row sequentially starting at studentRecordsStartRowIndex
      const start = structure.studentRecordsStartRowIndex;
      for (let i = 0; i < result.rows.length; i++) {
        const rIdx = start + i;
        if (!matrix[rIdx]) matrix[rIdx] = [];
        matrix[rIdx][remarkCol] = result.rows[i].remark ?? "";
      }

      // Write back to sheet and download
      const newWs = XLSX.utils.aoa_to_sheet(matrix);
      wb.Sheets[sheetName] = newWs;
      XLSX.writeFile(wb, buildFileName("class-remarks", "xlsx"));
      toast({ title: "Đã cập nhật và tải xuống Excel", variant: "success" });
    } catch (err) {
      console.error(err);
      toast({ title: "Lỗi", description: "Không thể ghi nhận xét vào tệp Excel", variant: "error" });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => void onRerun()} disabled={loading}>
        Thực hiện lại
      </Button>
      <Button variant="outline" onClick={handleCopyAll} disabled={loading}>
        Copy tất cả nhận xét
      </Button>
      <Button variant="outline" onClick={handleDownloadXlsx} disabled={loading}>
        Tải Excel
      </Button>
    </div>
  );
}
