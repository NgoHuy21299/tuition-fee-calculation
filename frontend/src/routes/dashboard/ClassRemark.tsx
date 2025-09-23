import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import UploadBox from "../../components/remarks/UploadBox";
import PreviewPanel from "../../components/remarks/PreviewPanel";
import ErrorsPanel from "../../components/remarks/ErrorsPanel";
import ActionsBar from "../../components/remarks/ActionsBar";
import { readFileToMatrix } from "../../services/remarks/CsvXlsxReader";
import { parseRemarkStructure } from "../../services/remarks/RemarkParser";
import { mergeRemarks } from "../../services/remarks/RemarkMerger";
import type { MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "../../services/remarks/RemarkTypes";
import { useToast } from "../../components/commons/Toast";

export default function ClassRemark() {
  const MIN_LOADING_MS = 500; // configurable delay for perceived loading
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [matrix, setMatrix] = useState<SheetMatrix | null>(null);
  const [structure, setStructure] = useState<RemarkStructure | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [result, setResult] = useState<MergeResultSummary | null>(null);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const handleFile = async (file: File) => {
    // Immediately show loading and clear previous states
    setLoading(true);
    setMatrix(null);
    setStructure(null);
    setIssues([]);
    setResult(null);
    setFileName("");
    try {
      // Keep loading visible for at least MIN_LOADING_MS to avoid flicker and ensure user perceives the reset
      await sleep(MIN_LOADING_MS);
      setFileName(file.name);
      const mx = await readFileToMatrix(file);
      const parsed = parseRemarkStructure(mx);
      setMatrix(mx);
      setStructure(parsed.structure);
      setIssues(parsed.issues);
      if (parsed.structure) {
        const merged = mergeRemarks(mx, parsed.structure);
        setResult(merged);
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = (e as { message?: string } | null)?.message ?? "Lỗi khi đọc/parse tệp.";
      setIssues([{ type: "general", message: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    // Re-run merge with the same parsed structure but allow random template row selection
    if (!matrix || !structure) return;
    setLoading(true);
    try {
      await sleep(MIN_LOADING_MS);
      const merged = mergeRemarks(matrix, structure);
      setResult(merged);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      const filename = `class-remark-${yyyy}-${mm}-${dd}-${rand}.xlsx`;

      const url = "/class-remark-template.xlsx"; // served from frontend/public
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không tìm thấy file mẫu trong public.");
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        // vẫn cho phép tải nhưng cảnh báo, tránh lưu 404 HTML thành .xlsx
        console.warn("Unexpected content-type for template:", ct);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Đã tải mẫu trang tính", variant: "success" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Tải mẫu thất bại",
        description: "Hãy đảm bảo đã đặt file public/class-remark-template.xlsx",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nhận xét lớp</h1>
          <p className="text-sm text-gray-400">Ghép câu nhận xét từ bảng tính theo yêu cầu.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="success" onClick={handleDownloadTemplate}>
            Tải về mẫu trang tính
          </Button>
          <div>{loading && <LoadingSpinner size={18} padding={3} />}</div>
        </div>
      </div>

      <Card variant="blur-animation">
        <div className="p-4 relative">
          {/* loading overlay giống StudentEdit */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${loading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg" />
            <div className="relative z-10">
              <LoadingSpinner size={36} padding={6} />
            </div>
          </div>

          <div className="space-y-4">
            <UploadBox onFileSelected={handleFile} />
            {fileName && (
              <div className="text-xs text-gray-400">Đã chọn tệp: <span className="text-gray-200">{fileName}</span></div>
            )}
            <PreviewPanel matrix={matrix} structure={structure} result={result} issues={issues} />
            <ErrorsPanel issues={issues.concat(result?.rows.flatMap(r => r.issues) || [])} />
            <div className="pt-2">
              <ActionsBar result={result} onRerun={handleRerun} loading={loading} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
