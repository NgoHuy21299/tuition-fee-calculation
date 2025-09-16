import { useEffect, useRef, useState } from "react";
import BackNavigation from "../../components/commons/BackNavigation";
import { Card } from "../../components/ui/card";
import { useToast } from "../../components/commons/Toast";
import {
  studentService,
  type CreateStudentInput,
} from "../../services/studentService";

// Reuses the same field behaviors as modal StudentForm but in a page layout
export default function StudentNew() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  type Relationship = "father" | "mother" | "grandfather" | "grandmother";
  const REL_LABEL: Record<Relationship, string> = {
    father: "Bố",
    mother: "Mẹ",
    grandfather: "Ông",
    grandmother: "Bà",
  };

  const [showParent, setShowParent] = useState(false);
  const [rel, setRel] = useState<Relationship>("father");
  const [parentName, setParentName] = useState<string | null>(null);
  const [parentPhone, setParentPhone] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string | null>(null);
  const [parentNote, setParentNote] = useState<string | null>(null);
  const nameEditedManuallyRef = useRef(false);

  const DRAFT_KEY = "students.form.draft";

  // Restore draft on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const ok = window.confirm("Khôi phục bản nháp trước đó?");
        if (ok) {
          const d = JSON.parse(raw) as CreateStudentInput;
          setName(d.name ?? "");
          setEmail(d.email ?? null);
          setPhone(d.phone ?? null);
          setNote(d.note ?? null);
          if (d.parentInline) {
            setShowParent(true);
            setRel(d.parentInline.relationship as Relationship);
            setParentName(d.parentInline.name ?? null);
            setParentPhone(d.parentInline.phone ?? null);
            setParentEmail(d.parentInline.email ?? null);
            setParentNote(d.parentInline.note ?? null);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function saveDraft() {
    try {
      const payload: CreateStudentInput = {
        name,
        email,
        phone,
        note,
        parentInline: showParent
          ? {
              relationship: rel,
              name: parentName,
              phone: parentPhone,
              email: parentEmail,
              note: parentNote,
            }
          : undefined,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      console.log(e);
    }
  }

  async function onSubmit() {
    if (!name.trim()) {
      toast({
        variant: "warning",
        title: "Thiếu dữ liệu",
        description: "Tên học sinh là bắt buộc",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateStudentInput = {
        name: name.trim(),
        email,
        phone,
        note,
        parentInline: showParent
          ? {
              relationship: rel,
              name: parentName,
              phone: parentPhone,
              email: parentEmail,
              note: parentNote,
            }
          : undefined,
      };
      await studentService.createStudent(payload);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        console.log(e);
      }
      toast({
        variant: "success",
        title: "Đã tạo",
        description: "Tạo học sinh thành công",
      });
      // navigate back to list
      window.location.assign("/dashboard/students");
    } catch {
      toast({ variant: "error", title: "Lỗi", description: "Tạo thất bại" });
      // keep draft
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-fill parent name when relationship or student name changes (only if not manually edited)
  function onChangeRel(v: Relationship) {
    setRel(v);
    if (showParent && !nameEditedManuallyRef.current && name.trim()) {
      setParentName(`${REL_LABEL[v]} ${name.trim()}`);
    }
  }
  function onChangeStudentName(v: string) {
    setName(v);
    if (showParent && !nameEditedManuallyRef.current && v.trim()) {
      setParentName(`${REL_LABEL[rel]} ${v.trim()}`);
    }
  }

  return (
    <div className="space-y-4">
      <BackNavigation to="/dashboard/students" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tạo học sinh mới</h1>
          <p className="text-sm text-gray-400">
            Nhập thông tin học sinh. Bạn có thể chỉnh sửa sau.
          </p>
        </div>
      </div>
      <Card>
        <div className="p-4 grid grid-cols-1 gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Tên học sinh</label>
            <input
              className="bg-gray-900 border border-gray-800 rounded-md p-2"
              value={name}
              onChange={(e) => onChangeStudentName(e.target.value)}
              onBlur={saveDraft}
              placeholder="Nhập tên học sinh"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Email</label>
              <input
                className="bg-gray-900 border border-gray-800 rounded-md p-2"
                value={email ?? ""}
                onChange={(e) => setEmail(e.target.value || null)}
                onBlur={saveDraft}
                placeholder="email@example.com"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Phone</label>
              <input
                className="bg-gray-900 border border-gray-800 rounded-md p-2"
                value={phone ?? ""}
                onChange={(e) => setPhone(e.target.value || null)}
                onBlur={saveDraft}
                placeholder="Số điện thoại"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Ghi chú</label>
            <textarea
              className="bg-gray-900 border border-gray-800 rounded-md p-2"
              value={note ?? ""}
              onChange={(e) => setNote(e.target.value || null)}
              onBlur={saveDraft}
              placeholder="Ghi chú thêm"
            />
          </div>

          <div className="border-t border-gray-800 pt-3">
            <button
              className="text-sm text-blue-400 hover:text-blue-300"
              onClick={() => setShowParent(!showParent)}
              type="button"
            >
              {showParent ? "Ẩn thông tin phụ huynh" : "+ Thêm phụ huynh"}
            </button>

            {showParent && (
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-400">Mối quan hệ</label>
                    <select
                      className="bg-gray-900 border border-gray-800 rounded-md p-2"
                      value={rel}
                      onChange={(e) =>
                        onChangeRel(e.target.value as Relationship)
                      }
                      onBlur={saveDraft}
                    >
                      {Object.entries(REL_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-400">
                      Tên phụ huynh
                    </label>
                    <input
                      className="bg-gray-900 border border-gray-800 rounded-md p-2"
                      value={parentName ?? ""}
                      onChange={(e) => {
                        setParentName(e.target.value || null);
                        nameEditedManuallyRef.current = true;
                      }}
                      onBlur={saveDraft}
                      placeholder={`${REL_LABEL[rel]} ${name || "..."}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-400">
                      Parent Email
                    </label>
                    <input
                      className="bg-gray-900 border border-gray-800 rounded-md p-2"
                      value={parentEmail ?? ""}
                      onChange={(e) => setParentEmail(e.target.value || null)}
                      onBlur={saveDraft}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-400">
                      Parent Phone
                    </label>
                    <input
                      className="bg-gray-900 border border-gray-800 rounded-md p-2"
                      value={parentPhone ?? ""}
                      onChange={(e) => setParentPhone(e.target.value || null)}
                      onBlur={saveDraft}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-400">Parent Note</label>
                  <textarea
                    className="bg-gray-900 border border-gray-800 rounded-md p-2"
                    value={parentNote ?? ""}
                    onChange={(e) => setParentNote(e.target.value || null)}
                    onBlur={saveDraft}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700"
              onClick={() => window.history.back()}
              disabled={submitting}
            >
              Huỷ
            </button>
            <button
              className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Đang lưu..." : "Tạo học sinh"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
