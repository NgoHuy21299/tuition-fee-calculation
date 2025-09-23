import * as XLSX from "xlsx";
import type { MergeResultSummary } from "../../services/remarks/RemarkTypes";
import { useToast } from "../commons/Toast";
import { Button } from "../ui/button";

export default function ActionsBar({
  result,
  onRerun,
  loading = false,
}: {
  result: MergeResultSummary | null;
  onRerun: () => void | Promise<void>;
  loading?: boolean;
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

  const handleDownloadCsv = () => {
    const rows = [["Tên học sinh", "Nhận xét"], ...(result?.rows || []).map((r) => [r.studentName, r.remark])];
    const csvContent = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildFileName("class-remarks", "csv");
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Đã tải xuống CSV", variant: "success" });
  };

  const handleDownloadXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Tên học sinh", "Nhận xét"], ...(result?.rows || []).map((r) => [r.studentName, r.remark])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Remarks");
    XLSX.writeFile(wb, buildFileName("class-remarks", "xlsx"));
    toast({ title: "Đã tải xuống Excel", variant: "success" });
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => void onRerun()} disabled={loading}>
        Thực hiện lại
      </Button>
      <Button variant="outline" onClick={handleCopyAll} disabled={loading}>
        Copy tất cả nhận xét
      </Button>
      <Button variant="outline" onClick={handleDownloadCsv} disabled={loading}>
        Tải CSV
      </Button>
      <Button variant="outline" onClick={handleDownloadXlsx} disabled={loading}>
        Tải Excel
      </Button>
    </div>
  );
}
