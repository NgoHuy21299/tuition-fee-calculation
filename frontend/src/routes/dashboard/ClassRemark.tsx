import { useState } from "react";
import { Card } from "../../components/ui/card";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import UploadBox from "../../components/remarks/UploadBox";
import PreviewPanel from "../../components/remarks/PreviewPanel";
import ErrorsPanel from "../../components/remarks/ErrorsPanel";
import ActionsBar from "../../components/remarks/ActionsBar";
import { readFileToMatrix } from "../../services/remarks/CsvXlsxReader";
import { parseRemarkStructure } from "../../services/remarks/RemarkParser";
import { mergeRemarks } from "../../services/remarks/RemarkMerger";
import type { MergeResultSummary, RemarkStructure, SheetMatrix, ValidationIssue } from "../../services/remarks/RemarkTypes";

export default function ClassRemark() {
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [matrix, setMatrix] = useState<SheetMatrix | null>(null);
  const [structure, setStructure] = useState<RemarkStructure | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [result, setResult] = useState<MergeResultSummary | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setMatrix(null);
    setStructure(null);
    setIssues([]);
    setResult(null);
    try {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Class Remark</h1>
          <p className="text-sm text-gray-400">Ghép câu nhận xét từ bảng tính theo yêu cầu.</p>
        </div>
        <div>{loading && <LoadingSpinner size={18} padding={3} />}</div>
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
              <ActionsBar result={result} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
