import { useRef } from "react";
import { Button } from "../ui/button";

export default function UploadBox({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    // Clear current value so selecting the same file triggers onChange
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    // Reset value to allow selecting the same file again in subsequent attempts
    e.currentTarget.value = "";
  };

  return (
    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center bg-gray-900/30">
      <p className="text-gray-300 mb-2">Chọn tệp CSV hoặc Excel (xlsx/xls)</p>
      <Button onClick={handleClick}>
        Chọn tệp
      </Button>
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
