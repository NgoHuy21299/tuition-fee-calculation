# Attendance Components

Các component để quản lý điểm danh học sinh theo UC-06 Attendance plan.

## Components

### 1. AttendanceService
Service để gọi API backend cho attendance operations.

```typescript
import { AttendanceService } from '../../services/attendanceService';

// Lấy danh sách điểm danh cho session
const attendance = await AttendanceService.getSessionAttendance(sessionId);

// Bulk mark attendance
const result = await AttendanceService.markAttendance(sessionId, {
  attendanceRecords: [
    { studentId: '1', status: 'present', note: 'Đúng giờ' },
    { studentId: '2', status: 'late', feeOverride: 50000 }
  ]
});

// Lấy lịch sử điểm danh của học sinh
const history = await AttendanceService.getStudentAttendance(studentId, {
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
});
```

### 2. AttendanceForm
Component chính để mark attendance cho một session.

```tsx
import { AttendanceForm } from '../components/attendance';

<AttendanceForm
  session={session}
  attendanceList={attendanceList}
  onSave={handleSave}
  onRefresh={handleRefresh}
  isLoading={isLoading}
  isSaving={isSaving}
/>
```

**Features:**
- Hiển thị thông tin session (ngày, giờ, học phí)
- Statistics (tổng số học sinh, có mặt, vắng, muộn, tổng phí)
- Bulk actions (Tất cả có mặt, Tất cả vắng mặt)
- Edit mode với auto-save
- Optimistic updates
- Error handling với detailed results

### 3. AttendanceRow
Component cho từng học sinh trong danh sách điểm danh.

```tsx
import { AttendanceRow } from '../components/attendance';

<AttendanceRow
  attendance={attendance}
  onStatusChange={handleStatusChange}
  onNoteChange={handleNoteChange}
  onFeeOverrideChange={handleFeeOverrideChange}
  isEditing={isEditing}
/>
```

**Features:**
- Status buttons (Present/Absent/Late) với visual indicators
- Expandable details (note, fee override, last modified)
- Student info display
- Fee calculation display
- Keyboard shortcuts support

### 4. AttendanceHistory
Component để hiển thị lịch sử điểm danh của học sinh.

```tsx
import { AttendanceHistory } from '../components/attendance';

<AttendanceHistory
  studentId={studentId}
  className="mt-6"
/>
```

**Features:**
- Statistics cards (tổng buổi, có mặt, tỷ lệ tham dự, tổng phí)
- Date range filters
- Table view với session details
- Class/subject information
- Fee information

### 5. AttendancePage
Page component cho route `/attendance/:sessionId`.

```tsx
// Tự động load khi navigate đến /dashboard/attendance/:sessionId
```

**Features:**
- Session validation
- Data loading với error handling
- Navigation back to class detail
- Integration với AttendanceForm

## Integration với SessionCard

SessionCard đã được cập nhật để thêm nút "Điểm danh":

```tsx
import { SessionCard } from '../components/sessions';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

<SessionCard
  session={session}
  onEdit={handleEdit}
  onCancel={handleCancel}
  onDelete={handleDelete}
  onAttendance={() => navigate(`/dashboard/attendance/${session.id}`)}
/>
```

## Routing

Route đã được thêm vào App.tsx:

```tsx
<Route path="attendance/:sessionId" element={<AttendancePage />} />
```

## Business Rules

1. **Teacher Ownership**: Chỉ teacher sở hữu session mới có thể mark attendance
2. **Session Status**: Không thể sửa attendance cho completed sessions
3. **Student Enrollment**: Validate student thuộc class (cho class sessions)
4. **Fee Calculation Hierarchy**: 
   - Attendance.feeOverride → ClassStudent.unitPriceOverride → Session.feePerSession
5. **Bulk Operations**: Partial success handling với detailed results

## Error Handling

- Network errors với retry functionality
- Validation errors với field-level messages
- Business rule violations với user-friendly messages
- Optimistic updates với rollback on failure

## UX Features

- **Visual Indicators**: Icons và colors cho attendance status
- **Bulk Actions**: Quick buttons cho common operations
- **Auto-save**: Changes được save automatically
- **Loading States**: Proper loading indicators
- **Mobile Responsive**: Works trên tablets/phones
- **Keyboard Shortcuts**: 1=Present, 2=Absent, 3=Late (planned)

## API Endpoints

- `GET /api/sessions/:sessionId/attendance` - Get attendance list
- `POST /api/sessions/:sessionId/attendance` - Bulk mark attendance
- `PUT /api/attendance/:id` - Update individual attendance
- `DELETE /api/attendance/:id` - Delete attendance
- `GET /api/students/:studentId/attendance` - Student attendance history
- `GET /api/sessions/:sessionId/fees` - Calculate session fees
