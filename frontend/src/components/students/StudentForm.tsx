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
import ParentForm from "./ParentForm";
import MultipleSelector from "../ui/multiple-selector";
import type { Option } from "../ui/multiple-selector";
import { classStudentService } from "../../services/classStudentService";

export type StudentFormProps = {
  editingId: string | null;
  onSaved?: () => void | Promise<void>;
  classOptions?: Option[]; // Provided by parent page when creating new student
  preselectSelectedClasses?: Option[]; // Optional: preselect classes (e.g., current class from ClassDetail)
  onLoadingChange?: (loading: boolean) => void;
};

const DRAFT_KEY = "students.form.draft"; // could be extended with userId if needed
const SESSION_STATUS_KEY = "studentFormDraftPromptShown";

export type Relationship = "father" | "mother" | "grandfather" | "grandmother";

const REL_LABEL: Record<Relationship, string> = {
  father: "Bố",
  mother: "Mẹ",
  grandfather: "Ông",
  grandmother: "Bà",
};

type ParentInfo = {
  id: string; // ID tạm thời để quản lý trong form
  relationship: Relationship;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export default function StudentForm({
  editingId,
  onSaved,
  classOptions = [],
  preselectSelectedClasses,
  onLoadingChange,
}: StudentFormProps) {
  const { toast } = useToast();
  const isEdit = !!editingId;

  // Local loading state to control fetch status; parent may be informed via onLoadingChange
  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [showParent, setShowParent] = useState(false);
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Option[]>([]);
  const [initialSelectedClasses, setInitialSelectedClasses] = useState<Option[]>([]);
  // Map classId -> classStudentId for active memberships at load time (used to leave when removed)
  const [initialMembershipByClass, setInitialMembershipByClass] = useState<Record<string, string>>({});

  const nameEditedManuallyRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  function resetForm() {
    setName("");
    setEmail(null);
    setPhone(null);
    setNote(null);
    setShowParent(false);
    setParents([]);
    setSelectedClasses([]);
    setInitialSelectedClasses([]);
    nameEditedManuallyRef.current = false;
  }

  // Removed: previously auto-generated parent name on student name change.

  // Load for edit / create
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (editingId) {
        setLoading(true);
        if (typeof onLoadingChange === "function") onLoadingChange(true);
        const start = Date.now();
        try {
          const detail: StudentDetailDTO = await studentService.getStudent(
            editingId
          );
          if (!mounted) { /* component unmounted, skip applying state */ }
          // populate fields
          setName(detail.student.name);
          setEmail(detail.student.email);
          setPhone(detail.student.phone);
          setNote(detail.student.note);
          // parents
          if (detail.parents && detail.parents.length > 0) {
            // Keep parents hidden initially to avoid layout shift; populate data but do not expand
            setShowParent(false);
            const parentInfos: ParentInfo[] = detail.parents.map((parent) => ({
              id: parent.id,
              relationship: parent.relationship as Relationship,
              name: parent.name, // Sử dụng tên phụ huynh từ database khi edit
              phone: parent.phone,
              email: parent.email,
              note: parent.note,
            }));
            setParents(parentInfos);
          } else {
            setShowParent(false);
          }
          
          // Map classes đã chọn (chỉ lấy membership đang active: leftAt == null)
          if (detail.classes && detail.classes.length > 0) {
            const activeMemberships = detail.classes.filter((cls) => cls.leftAt == null);
            const selectedClassOptions: Option[] = activeMemberships.map((cls) => ({
              label: cls.name,
              value: cls.id,
            }));
            setSelectedClasses(selectedClassOptions);
            setInitialSelectedClasses(selectedClassOptions);
            // Build map classId -> classStudentId for active ones
            const m: Record<string, string> = {};
            for (const cls of activeMemberships) {
              m[cls.id] = cls.classStudentId;
            }
            setInitialMembershipByClass(m);
          }
        } catch {
            toast({
              variant: "error",
              title: "Lỗi",
              description: "Không tải được dữ liệu học sinh",
            });
        } finally {
          // Ensure spinner is visible at least 300ms to avoid flicker
          const elapsed = Date.now() - start;
          const MIN_MS = 300;
          if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
          if (!mounted) { /* component unmounted, skip applying state */ } else {
            setLoading(false);
            if (typeof onLoadingChange === "function") onLoadingChange(false);
          }
        }
      } else if (!editingId) {
        // Creating: offer to restore draft
        // Use a flag to prevent showing the confirm dialog twice in development mode
        const hasShownDraftPrompt = sessionStorage.getItem(SESSION_STATUS_KEY);
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw && !hasShownDraftPrompt) {
            sessionStorage.setItem(SESSION_STATUS_KEY, "true");
            const ok = window.confirm("Khôi phục bản nháp trước đó?");
            if (ok) {
              const d = JSON.parse(raw) as CreateStudentInput;
              setName(d.name ?? "");
              setEmail(d.email ?? null);
              setPhone(d.phone ?? null);
              setNote(d.note ?? null);
              if (d.parents && d.parents.length > 0) {
                  // Keep parents hidden initially to avoid layout shift; populate data but do not expand
                  setShowParent(false);
                const parentInfos: ParentInfo[] = d.parents.map(
                  (parent, index) => ({
                    id: `${index}`,
                    relationship: parent.relationship as Relationship,
                    name: parent.name ?? null,
                    phone: parent.phone ?? null,
                    email: parent.email ?? null,
                    note: parent.note ?? null,
                  })
                );
                setParents(parentInfos);
              }
            }
          }
        } catch {
          // ignore
        }
        // Preselect classes if provided from parent (e.g., when creating from ClassDetail)
        if (preselectSelectedClasses && preselectSelectedClasses.length > 0) {
          setSelectedClasses(preselectSelectedClasses);
          setInitialSelectedClasses(preselectSelectedClasses);
        }
      } else if (!open) {
        // closed
        resetForm();
        // Clear the flag when the form is closed
        sessionStorage.removeItem(SESSION_STATUS_KEY);
      }
    })();
    return () => { mounted = false; };
  }, [editingId, toast, preselectSelectedClasses, onLoadingChange]);

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
          // Save the full parents array for new drafts
          parents: showParent
            ? parents.map((p) => ({
                relationship: p.relationship,
                name: p.name,
                phone: p.phone,
                email: p.email,
                note: p.note,
              }))
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
          parents: parents,
        };
        await studentService.updateStudent(editingId, patch);
        
        // Xử lý cập nhật classes khi edit
        try {
          // Lấy danh sách classes hiện tại của học sinh từ state
          const currentClassIds = selectedClasses.map(opt => opt.value);
          const initialClassIds = initialSelectedClasses.map(opt => opt.value);
          
          // Tìm các classes cần thêm mới (có trong selectedClasses nhưng không có trong initialSelectedClasses)
          const classesToAdd = selectedClasses.filter(
            opt => !initialClassIds.includes(opt.value)
          );
          
          // Tìm các classes cần xóa (có trong initialSelectedClasses nhưng không có trong selectedClasses)
          const classesToRemove = initialSelectedClasses.filter(
            opt => !currentClassIds.includes(opt.value)
          );
          
          // Thêm học sinh vào các classes mới
          if (classesToAdd.length > 0) {
            await Promise.all(
              classesToAdd.map((opt) =>
                classStudentService.addStudentToClass(opt.value, {
                  studentId: editingId,
                })
              )
            );
          }
          
          // Xử lý xóa học sinh khỏi các classes (leave membership bằng PUT /api/classes/:id/students/:classStudentId)
          if (classesToRemove.length > 0) {
            await Promise.all(
              classesToRemove.map(async (opt) => {
                const classId = opt.value; // class id
                const classStudentId = initialMembershipByClass[classId];
                if (classStudentId) {
                  const nowIso = new Date().toISOString();
                  await classStudentService.leaveStudentFromClass(classId, classStudentId, nowIso);
                }
              })
            );
          }
          
        } catch (err) {
          console.log("Failed to update student classes: ", err);
          toast({
            variant: "warning",
            title: "Chú ý",
            description:
              "Đã cập nhật học sinh nhưng cập nhật lớp thất bại. Bạn có thể thử lại sau.",
          });
        }
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
          parents: parents,
        };
        const created = await studentService.createStudent(payload);
        // After creating student successfully, add to selected classes
        if (selectedClasses.length > 0) {
          try {
            await Promise.all(
              selectedClasses.map((opt) =>
                classStudentService.addStudentToClass(opt.value, {
                  studentId: created.id,
                })
              )
            );
          } catch (err) {
            console.log("Failed to add student to classes: ", err);
            toast({
              variant: "warning",
              title: "Chú ý",
              description:
                "Đã tạo học sinh nhưng thêm vào một số lớp thất bại. Bạn có thể thử lại sau.",
            });
          }
        }
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
      <div className="relative mt-4 grid grid-cols-1 gap-3">
        {/* Loading overlay: blur + spinner */}
        <div
          aria-hidden={!loading}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${loading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>

        <div className={`space-y-1 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
        
        <div className="space-y-1">
          <Label>Lớp theo học</Label>
          <MultipleSelector
            value={selectedClasses}
            options={classOptions}
            placeholder="Chọn lớp..."
            emptyIndicator={
              <p className="text-center text-sm leading-10 text-gray-600 dark:text-gray-400">
                Không có lớp phù hợp.
              </p>
            }
            onChange={(opts) => setSelectedClasses(opts)}
          />
        </div>

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
            {showParent ? "Ẩn thông tin phụ huynh" : "Hiện thông tin phụ huynh"}
          </Button>

          {/* Parent section: do not occupy layout when hidden */}
          <div className={`${showParent ? "block" : "hidden"} mt-3 space-y-4 transition-opacity duration-200`} aria-hidden={!showParent}>
            {parents.map((parent, index) => (
              <ParentForm
                key={parent.id}
                parent={parent}
                index={index}
                name={name}
                nameEditedManuallyRef={nameEditedManuallyRef}
                REL_LABEL={REL_LABEL}
                autoNameEnabled={!isEdit}
                onUpdate={(updatedParent) => {
                  setParents((prev) =>
                    prev.map((p, i) => (i === index ? updatedParent : p))
                  );
                }}
                onDelete={() => {
                  setParents((prev) => prev.filter((_, i) => i !== index));
                  saveDraftDebounced();
                }}
                onBlur={saveDraftDebounced}
              />
            ))}

            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => {
                const newParent: ParentInfo = {
                  id: Date.now().toString() + Math.random(),
                  relationship: "father",
                  name: null,
                  phone: null,
                  email: null,
                  note: null,
                };
                setParents((prev) => [...prev, newParent]);
                saveDraftDebounced();
              }}
            >
              + Thêm phụ huynh
            </Button>
          </div>
        </div>
      </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            try {
              resetForm();
              localStorage.removeItem(DRAFT_KEY);
              sessionStorage.removeItem(SESSION_STATUS_KEY);
            } catch {
              // ignore
            }
          }}
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
