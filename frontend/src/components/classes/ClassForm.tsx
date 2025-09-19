import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

export type ClassFormValues = {
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: boolean;
};

export type ClassFormProps = {
  initialValues?: Partial<ClassFormValues>;
  submitText?: string;
  disabled?: boolean;
  onSubmit: (values: ClassFormValues) => Promise<void> | void;
};

export default function ClassForm({
  initialValues,
  onSubmit,
  submitText = "Lưu",
  disabled = false,
}: ClassFormProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<string | "">("");
  const [description, setDescription] = useState<string | "">("");
  const [defaultFeePerSession, setDefaultFeePerSession] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    defaultFeePerSession?: string;
  }>({});
  // Keep a normalized snapshot of the initial values to detect dirty state reliably
  const initialSnapshotRef = useRef<{
    name: string;
    subject: string | null;
    description: string | null;
    defaultFeePerSession: number | null;
    isActive: boolean;
  } | null>(null);

  useEffect(() => {
    if (!initialValues) return;
    setName(initialValues.name ?? "");
    setSubject(initialValues.subject ?? "");
    setDescription(initialValues.description ?? "");
    setDefaultFeePerSession(
      initialValues.defaultFeePerSession === null ||
        initialValues.defaultFeePerSession === undefined
        ? ""
        : Number(initialValues.defaultFeePerSession).toLocaleString("vi-VN")
    );
    setIsActive(initialValues.isActive ?? true);
    // Store normalized snapshot to compare
    initialSnapshotRef.current = {
      name: (initialValues.name ?? "").trim(),
      subject:
        (initialValues.subject ?? "").trim() === ""
          ? null
          : (initialValues.subject as string),
      description:
        (initialValues.description ?? "").trim() === ""
          ? null
          : (initialValues.description as string),
      defaultFeePerSession:
        initialValues.defaultFeePerSession === null ||
        initialValues.defaultFeePerSession === undefined
          ? null
          : Number(initialValues.defaultFeePerSession),
      isActive: initialValues.isActive ?? true,
    };
  }, [initialValues]);

  const normalizedCurrent = useMemo(() => {
    return {
      name: name.trim(),
      subject: subject.trim() === "" ? null : subject,
      description: description.trim() === "" ? null : description,
      defaultFeePerSession:
        defaultFeePerSession === ""
          ? null
          : Number(defaultFeePerSession.replace(/[^0-9]/g, "")),
      isActive,
    };
  }, [name, subject, description, defaultFeePerSession, isActive]);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return true; // If no initial snapshot, treat as dirty to allow creating
    const a = initialSnapshotRef.current;
    const b = normalizedCurrent;
    return (
      a.name !== b.name ||
      a.subject !== b.subject ||
      a.description !== b.description ||
      a.defaultFeePerSession !== b.defaultFeePerSession ||
      a.isActive !== b.isActive
    );
  }, [normalizedCurrent]);

  function validate() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Tên lớp là bắt buộc";
    if (defaultFeePerSession !== "") {
      const n = Number(defaultFeePerSession.replace(/[^0-9]/g, ""));
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        next.defaultFeePerSession =
          "Giá mặc định phải là số nguyên không âm hoặc để trống";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: ClassFormValues = {
        name: name.trim(),
        subject: subject.trim() === "" ? null : subject,
        description: description.trim() === "" ? null : description,
        defaultFeePerSession:
          defaultFeePerSession === ""
            ? null
            : Number(defaultFeePerSession.replace(/[^0-9]/g, "")),
        isActive,
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="name">Tên lớp</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || submitting}
            autoComplete="given-name"
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="subject">Môn học</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={disabled || submitting}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="description">Mô tả</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled || submitting}
          />
          <p className="text-xs text-gray-400 mt-1">
            Giới thiệu ngắn gọn về lớp học.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultFeePerSession">Học phí mặc định</Label>
          <Input
            id="defaultFeePerSession"
            inputMode="numeric"
            value={defaultFeePerSession}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/[^0-9]/g, "");
              if (onlyDigits === "") {
                setDefaultFeePerSession("");
              } else {
                const n = Number(onlyDigits);
                setDefaultFeePerSession(n.toLocaleString("vi-VN"));
              }
            }}
            disabled={disabled || submitting}
            placeholder="vd: 150000"
          />
          <p className="text-xs text-gray-400">
            Học phí mặc định để điền sẵn khi tạo buổi học. Có thể thay đổi từng
            buổi.
          </p>
          {errors.defaultFeePerSession && (
            <p className="text-sm text-red-500">
              {errors.defaultFeePerSession}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="is-active">Trạng thái</Label>
          <div className="flex items-center gap-2 text-sm text-gray-300 select-none pt-2.5">
            <Checkbox
              id="is-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(!!v)}
              disabled={disabled || submitting}
            />
            <label htmlFor="is-active">Đang hoạt động</label>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="success"
          disabled={disabled || submitting || !isDirty}
          aria-busy={submitting}
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
}
