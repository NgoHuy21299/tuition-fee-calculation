import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface ParentInfo {
  id: string;
  relationship: "father" | "mother" | "grandfather" | "grandmother";
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
}

interface ParentFormProps {
  parent: ParentInfo;
  index: number;
  name: string;
  nameEditedManuallyRef: React.MutableRefObject<boolean>;
  REL_LABEL: Record<"father" | "mother" | "grandfather" | "grandmother", string>;
  onUpdate: (updatedParent: ParentInfo) => void;
  onDelete?: () => void;
  onBlur?: () => void;
}

export default function ParentForm({
  parent,
  index,
  name,
  nameEditedManuallyRef,
  REL_LABEL,
  onUpdate,
  onDelete,
  onBlur,
}: ParentFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border border-gray-700 rounded-md p-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Phụ huynh {index + 1}</h3>
        {onDelete && (
          <Button
            variant="ghost"
            className="text-xs text-red-400 hover:text-red-300 p-1 h-auto"
            onClick={onDelete}
          >
            Xóa
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`parentRelationship-${parent.id}`}>Mối quan hệ</Label>
          <select
            id={`parentRelationship-${parent.id}`}
            className="flex h-9 w-full min-w-0 rounded-md border px-3 py-2 text-sm outline-none transition-colors bg-gray-800 border-gray-700 text-white"
            value={parent.relationship}
            onChange={(e) => {
              const newRelationship = e.target.value as "father" | "mother" | "grandfather" | "grandmother";
              onUpdate({
                ...parent,
                relationship: newRelationship
              });
              
              // Auto-generate parent name if not manually edited
              // Chỉ áp dụng khi tạo mới (name chưa được nhập thủ công và tên học sinh có giá trị)
              // Không áp dụng khi edit (name đã có giá trị từ database)
              if (!nameEditedManuallyRef.current && name.trim() && !parent.name) {
                onUpdate({
                  ...parent,
                  relationship: newRelationship,
                  name: `${REL_LABEL[newRelationship]} ${name.trim()}`
                });
              }
            }}
            onBlur={onBlur}
          >
            {Object.entries(REL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`parentName-${parent.id}`}>Tên phụ huynh</Label>
          <Input
            id={`parentName-${parent.id}`}
            value={parent.name ?? ""}
            onChange={(e) => {
              onUpdate({
                ...parent,
                name: e.target.value || null
              });
              nameEditedManuallyRef.current = true;
            }}
            onBlur={onBlur}
            placeholder={`${REL_LABEL[parent.relationship]} ${name || "..."}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`parentEmail-${parent.id}`}>Parent Email</Label>
          <Input
            id={`parentEmail-${parent.id}`}
            value={parent.email ?? ""}
            onChange={(e) => {
              onUpdate({
                ...parent,
                email: e.target.value || null
              });
            }}
            onBlur={onBlur}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`parentPhone-${parent.id}`}>Parent Phone</Label>
          <Input
            id={`parentPhone-${parent.id}`}
            value={parent.phone ?? ""}
            onChange={(e) => {
              onUpdate({
                ...parent,
                phone: e.target.value || null
              });
            }}
            onBlur={onBlur}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`parentNote-${parent.id}`}>Parent Note</Label>
        <Input
          id={`parentNote-${parent.id}`}
          value={parent.note ?? ""}
          onChange={(e) => {
            onUpdate({
              ...parent,
              note: e.target.value || null
            });
          }}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}
