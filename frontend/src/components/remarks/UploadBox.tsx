import { useRef } from "react";

export default function UploadBox({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center bg-gray-900/30">
      <p className="text-gray-300 mb-2">Chọn tệp CSV hoặc Excel (xlsx/xls)</p>
      <button
        type="button"
        onClick={handleClick}
        className="px-3 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-white transition"
      >
        Chọn tệp
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
