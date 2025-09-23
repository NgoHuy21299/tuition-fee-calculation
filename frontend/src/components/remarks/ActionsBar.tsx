import * as XLSX from "xlsx";
import type { MergeResultSummary } from "../../services/remarks/RemarkTypes";
import { useToast } from "../commons/Toast";

export default function ActionsBar({
  result,
}: {
  result: MergeResultSummary | null;
}) {
  const { toast } = useToast();
  const handleCopyAll = async () => {
    const text = (result?.rows || []).map((r) => r.remark).join("\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: "Đã sao chép nhận xét", variant: "success" });
  };

  const handleDownloadCsv = () => {
    const rows = [["Tên học sinh", "Nhận xét"], ...(result?.rows || []).map((r) => [r.studentName, r.remark])];
    const csvContent = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class-remarks.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Đã tải xuống CSV", variant: "success" });
  };

  const handleDownloadXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Tên học sinh", "Nhận xét"], ...(result?.rows || []).map((r) => [r.studentName, r.remark])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Remarks");
    XLSX.writeFile(wb, "class-remarks.xlsx");
    toast({ title: "Đã tải xuống Excel", variant: "success" });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopyAll}
        className="px-3 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-white transition cursor-pointer"
      >
        Copy tất cả nhận xét
      </button>
      <button
        type="button"
        onClick={handleDownloadCsv}
        className="px-3 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-white transition cursor-pointer"
      >
        Tải CSV
      </button>
      <button
        type="button"
        onClick={handleDownloadXlsx}
        className="px-3 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-white transition cursor-pointer"
      >
        Tải Excel
      </button>
    </div>
  );
}
