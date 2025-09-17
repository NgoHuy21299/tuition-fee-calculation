import { useEffect, useRef, useState } from "react";
import {
  studentService,
  type CreateStudentInput,
  type StudentDetailDTO,
  type UpdateStudentInput,
} from "../../services/studentService";
import { useToast } from "../commons/Toast";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import LoadingSpinner from "../commons/LoadingSpinner";

export type StudentFormProps = {
  open: boolean;
  editingId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
};

const DRAFT_KEY = "students.form.draft"; // could be extended with userId if needed

type Relationship = "father" | "mother" | "grandfather" | "grandmother";

const REL_LABEL: Record<Relationship, string> = {
  father: "Bố",
  mother: "Mẹ",
  grandfather: "Ông",
  grandmother: "Bà",
};

export default function StudentForm({
  open,
  editingId,
  onOpenChange,
  onSaved,
}: StudentFormProps) {
  const { toast } = useToast();
  const isEdit = !!editingId;

  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [showParent, setShowParent] = useState(false);
  const [rel, setRel] = useState<Relationship>("father");
  const [parentName, setParentName] = useState<string | null>(null);
  const [parentPhone, setParentPhone] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string | null>(null);
  const [parentNote, setParentNote] = useState<string | null>(null);

  const nameEditedManuallyRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  function resetForm() {
    setName("");
    setEmail(null);
    setPhone(null);
    setNote(null);
    setShowParent(false);
    setRel("father");
    setParentName(null);
    setParentPhone(null);
    setParentEmail(null);
    setParentNote(null);
    nameEditedManuallyRef.current = false;
  }

  // Auto-generate parent name on relationship change if parentName not manually edited
  useEffect(() => {
    if (showParent && !nameEditedManuallyRef.current) {
      if (name.trim()) setParentName(`${REL_LABEL[rel]} ${name.trim()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel]);

  // When student name changes and parent name not manually edited, update suggestion
  useEffect(() => {
    if (showParent && !nameEditedManuallyRef.current && name.trim()) {
      setParentName(`${REL_LABEL[rel]} ${name.trim()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Load for edit
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (open && editingId) {
        try {
          const detail: StudentDetailDTO = await studentService.getStudent(
            editingId
          );
          if (!mounted) return;
          setName(detail.student.name);
          setEmail(detail.student.email);
          setPhone(detail.student.phone);
          setNote(detail.student.note);
          // parent (first if any)
          if (detail.parents && detail.parents.length > 0) {
            setShowParent(true);
            setParentName(detail.parents[0].name);
            setParentPhone(detail.parents[0].phone);
            setParentEmail(detail.parents[0].email);
            setParentNote(detail.parents[0].note);
          } else {
            setShowParent(false);
          }
        } catch {
          toast({
            variant: "error",
            title: "Lỗi",
            description: "Không tải được dữ liệu học sinh",
          });
        }
      } else if (open && !editingId) {
        // Creating: offer to restore draft
        // Use a flag to prevent showing the confirm dialog twice in development mode
        const hasShownDraftPrompt = sessionStorage.getItem('studentFormDraftPromptShown');
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw && !hasShownDraftPrompt) {
            sessionStorage.setItem('studentFormDraftPromptShown', 'true');
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
      } else if (!open) {
        // closed
        resetForm();
        // Clear the flag when the form is closed
        sessionStorage.removeItem('studentFormDraftPromptShown');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, editingId, toast]);

  // Autosave draft on blur with small debounce
  const saveDraftDebounced = () => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
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
      } catch {
        // ignore storage errors
      }
    }, 300);
  };

  const onSubmit = async () => {
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
      if (isEdit && editingId) {
        const patch: UpdateStudentInput = {
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
        await studentService.updateStudent(editingId, patch);
        toast({
          variant: "success",
          title: "Đã lưu",
          description: "Cập nhật học sinh thành công",
        });
      } else {
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
        // clear draft after successful create
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (err) {
          console.log("error: ", err);
        }
        toast({
          variant: "success",
          title: "Đã tạo",
          description: "Tạo học sinh thành công",
        });
      }
      if (onSaved) await onSaved();
    } catch (e) {
      toast({
        variant: "error",
        title: "Lỗi",
        description: isEdit ? "Cập nhật thất bại" : "Tạo thất bại",
      });
      console.log("error: ", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label htmlFor="studentName">Tên học sinh</Label>
          <Input
            id="studentName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveDraftDebounced}
            placeholder="Nhập tên học sinh"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="studentEmail">Email</Label>
            <Input
              id="studentEmail"
              value={email ?? ""}
              onChange={(e) => setEmail(e.target.value || null)}
              onBlur={saveDraftDebounced}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="studentPhone">Phone</Label>
            <Input
              id="studentPhone"
              value={phone ?? ""}
              onChange={(e) => setPhone(e.target.value || null)}
              onBlur={saveDraftDebounced}
              placeholder="Số điện thoại"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="studentNote">Ghi chú</Label>
          <Input
            id="studentNote"
            value={note ?? ""}
            onChange={(e) => setNote(e.target.value || null)}
            onBlur={saveDraftDebounced}
            placeholder="Ghi chú thêm"
          />
        </div>

        <div className="border-t border-gray-800 pt-3">
          <Button
            variant="ghost"
            className="text-sm text-blue-400 hover:text-blue-300 p-0 h-auto"
            onClick={() => setShowParent(!showParent)}
          >
            {showParent ? "Ẩn thông tin phụ huynh" : "+ Thêm phụ huynh"}
          </Button>

          {showParent && (
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="parentRelationship">Mối quan hệ</Label>
                  <select
                    id="parentRelationship"
                    className="flex h-9 w-full min-w-0 rounded-md border px-3 py-2 text-sm outline-none transition-colors bg-white/5 border-gray-800"
                    value={rel}
                    onChange={(e) => setRel(e.target.value as Relationship)}
                    onBlur={saveDraftDebounced}
                  >
                    {Object.entries(REL_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parentName">Tên phụ huynh</Label>
                  <Input
                    id="parentName"
                    value={parentName ?? ""}
                    onChange={(e) => {
                      setParentName(e.target.value || null);
                      nameEditedManuallyRef.current = true;
                    }}
                    onBlur={saveDraftDebounced}
                    placeholder={`${REL_LABEL[rel]} ${name || "..."}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input
                    id="parentEmail"
                    value={parentEmail ?? ""}
                    onChange={(e) => setParentEmail(e.target.value || null)}
                    onBlur={saveDraftDebounced}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parentPhone">Parent Phone</Label>
                  <Input
                    id="parentPhone"
                    value={parentPhone ?? ""}
                    onChange={(e) => setParentPhone(e.target.value || null)}
                    onBlur={saveDraftDebounced}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="parentNote">Parent Note</Label>
                <Input
                  id="parentNote"
                  value={parentNote ?? ""}
                  onChange={(e) => setParentNote(e.target.value || null)}
                  onBlur={saveDraftDebounced}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Huỷ
        </Button>
        <Button variant="success" onClick={onSubmit} disabled={submitting}>
          {submitting ? (
            <LoadingSpinner size={18} padding={3} />
          ) : isEdit ? (
            "Lưu"
          ) : (
            "Tạo"
          )}
        </Button>
      </div>
    </>
  );
}
