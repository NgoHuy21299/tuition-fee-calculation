import { useState } from 'react';
import { TeacherSessionList, CreateSessionDialog } from '../../components/sessions';
import type { SessionDto } from '../../services/sessionService';

export default function SessionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"single" | "series">("single");
  const [editingSession, setEditingSession] = useState<SessionDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSession = () => {
    setDialogMode("single");
    setEditingSession(null);
    setDialogOpen(true);
  };

  const handleCreateSeries = () => {
    setDialogMode("series");
    setEditingSession(null);
    setDialogOpen(true);
  };

  const handleEditSession = (session: SessionDto) => {
    setDialogMode("single");
    setEditingSession(session);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setRefreshKey(prev => prev + 1); // Trigger refresh
    setDialogOpen(false);
    setEditingSession(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Quản lý buổi học</h1>
        <p className="text-gray-600">
          Quản lý tất cả buổi học của bạn từ tất cả các lớp
        </p>
      </div>

      <TeacherSessionList
        key={refreshKey}
        onCreateSession={handleCreateSession}
        onCreateSeries={handleCreateSeries}
        onEditSession={handleEditSession}
      />

      <CreateSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        classId={null} // No specific class for teacher's global view
        onSuccess={handleDialogSuccess}
        editingSession={editingSession}
      />
    </div>
  );
}
