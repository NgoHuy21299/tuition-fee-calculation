import type { ValidationIssue } from "../../services/remarks/RemarkTypes";

export default function ErrorsPanel({ issues }: { issues: ValidationIssue[] }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="mt-2 border border-red-800 bg-red-950/40 rounded-md p-3 text-sm text-red-300">
      <div className="font-semibold text-red-200 mb-1">Lỗi/ cảnh báo</div>
      <ul className="list-disc list-inside space-y-1">
        {issues.map((e, idx) => (
          <li key={idx}>
            {e.message}
            {e.studentName ? ` (HS: ${e.studentName})` : ""}
            {typeof e.rowIndex === "number" ? ` [row: ${e.rowIndex + 1}]` : ""}
            {e.sectionName ? ` [phần: ${e.sectionName}]` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
