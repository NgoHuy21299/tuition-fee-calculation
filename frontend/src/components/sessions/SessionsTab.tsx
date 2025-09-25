import { useState } from 'react';
import { SessionList } from './SessionList';
import { SessionForm } from './SessionForm';
import { SessionSeriesForm } from './SessionSeriesForm';
import type { SessionDto } from '../../services/sessionService';

interface SessionsTabProps {
  classId: string;
  defaultFeePerSession?: number;
}

export function SessionsTab({ classId, defaultFeePerSession }: SessionsTabProps) {
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionDto | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSession = () => {
    setEditingSession(undefined);
    setShowSessionForm(true);
  };

  const handleCreateSeries = () => {
    setShowSeriesForm(true);
  };

  const handleEditSession = (session: SessionDto) => {
    setEditingSession(session);
    setShowSessionForm(true);
  };

  const handleFormSuccess = () => {
    // Trigger refresh of session list
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseSessionForm = () => {
    setShowSessionForm(false);
    setEditingSession(undefined);
  };

  const handleCloseSeriesForm = () => {
    setShowSeriesForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Lịch học</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các buổi học của lớp
          </p>
        </div>
      </div>

      <SessionList
        key={refreshKey}
        classId={classId}
        onCreateSession={handleCreateSession}
        onCreateSeries={handleCreateSeries}
        onEditSession={handleEditSession}
      />

      <SessionForm
        open={showSessionForm}
        onClose={handleCloseSessionForm}
        onSuccess={handleFormSuccess}
        classId={classId}
        editingSession={editingSession}
        defaultFeePerSession={defaultFeePerSession}
      />

      <SessionSeriesForm
        open={showSeriesForm}
        onClose={handleCloseSeriesForm}
        onSuccess={handleFormSuccess}
        classId={classId}
        defaultFeePerSession={defaultFeePerSession}
      />
    </div>
  );
}