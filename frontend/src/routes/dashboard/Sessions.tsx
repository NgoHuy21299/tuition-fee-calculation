import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionService, type SessionDto } from '../../services/sessionService';
import LoadingSpinner from '../../components/commons/LoadingSpinner';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <LoadingSpinner size={32} padding={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý buổi học</h1>
    </div>
  );
}
