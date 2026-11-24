import { useEffect, useState } from 'react';
import { subscribeAllComplaints, subscribeStudentComplaints } from '../services/complaints';

// Live list of complaints: all of them for admins, only your own for students.
export default function useComplaints(uid, role) {
  const [state, setState] = useState({ complaints: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState({ complaints: [], loading: true, error: null });
    const onData = (complaints) => setState({ complaints, loading: false, error: null });
    const onError = (error) => setState({ complaints: [], loading: false, error });
    return role === 'admin' ? subscribeAllComplaints(onData, onError) : subscribeStudentComplaints(uid, onData, onError);
  }, [uid, role, attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}
