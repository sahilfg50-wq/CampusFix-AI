import { useState } from 'react';

import { isFirebaseConfigured } from './lib/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';

import useComplaints from './hooks/useComplaints';

import { createComplaint, updateComplaint } from './services/complaints';
import { processComplaintWithAgent } from './services/agent';
import { simulateTriage } from './utils/triage';

import Header from './components/layout/Header';
import SideNav from './components/layout/SideNav';

import Loading from './components/ui/Loading';
import ErrorCard from './components/ui/ErrorCard';
import ConfirmDialog from './components/ui/ConfirmDialog';

import AuthPage from './pages/auth/AuthPage';
import SetupNeeded from './pages/SetupNeeded';

import StudentDashboard from './pages/student/StudentDashboard';
import SubmitComplaint from './pages/student/SubmitComplaint';
import MyComplaints from './pages/student/MyComplaints';
import ComplaintTracking from './pages/student/ComplaintTracking';
import StudentProfile from './pages/student/StudentProfile';

import MessMenu from './pages/student/MessMenu';

import AdminOverview from './pages/admin/AdminOverview';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import AdminComplaintDetails from './pages/admin/AdminComplaintDetails';
import AdminAnalytics from './pages/admin/AdminAnalytics';

import MessManagement from './pages/admin/MessManagement';
import AiInbox from './pages/admin/AiInbox';

import FoodWasteDashboard from './pages/admin/FoodWasteDashboard';


function Portal() {
  const {
    user,
    profile,
    loading,
    profileError,
    logout,
    saveProfile,
  } = useAuth();

  if (loading) {
    return <Loading text="Checking your account..." />;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (profileError) {
    return (
      <ErrorCard
        title="Could not load your profile"
        error={profileError}
        onSecondary={logout}
        secondaryLabel="Sign out"
      />
    );
  }

  if (!profile) {
    return <Loading text="Loading your profile..." />;
  }

  return (
    <AuthenticatedPortal
      user={user}
      profile={profile}
      logout={logout}
      saveProfile={saveProfile}
    />
  );
}


function AuthenticatedPortal({
  user,
  profile,
  logout,
  saveProfile,
}) {
  const role = profile.role === 'admin' ? 'admin' : 'student';

  const student = {
    ...profile,
    id: user.uid,
  };

  const {
    complaints,
    loading,
    error,
    retry,
  } = useComplaints(user.uid, role);

  const [view, setView] = useState(
    role === 'admin' ? 'ov' : 'dash'
  );

  const [selectedId, setSelectedId] = useState('');
  const [confirm, setConfirm] = useState(null);

  const onNavigate = (nextView, id) => {
    setView(nextView);

    if (nextView === 'track' || nextView === 'det') {
      setSelectedId(id || '');
    } else {
      setSelectedId('');
    }
  };

  const askConfirm = (details) => {
    setConfirm(details);
  };

  const closeConfirm = () => {
    setConfirm(null);
  };

  // `classification` comes from the automatic classifier (rules, optionally merged with AI).
  // The built-in rules are the fallback, so a complaint can always be submitted.
  const submitComplaint = async (form, classification) => {
    const complaint = await createComplaint(
      user,
      profile,
      form,
      classification || simulateTriage(form)
    );

    // Start autonomous processing in the background.
    processComplaintWithAgent(complaint.id).catch((error) => {
      console.error(
        'Autonomous agent processing failed:',
        error
      );
    });

    return complaint;
  };

  const selectedComplaint = complaints.find(
    (c) => c.id === selectedId
  );

  if (loading) {
    return <Loading text="Loading complaints..." />;
  }

  if (error) {
    return (
      <ErrorCard
        title="Could not load complaints"
        error={error}
        onRetry={retry}
        onSecondary={logout}
        secondaryLabel="Sign out"
      />
    );
  }

  let page;

  if (role === 'student') {
    switch (view) {
      case 'submit':
        page = (
          <SubmitComplaint
            onSubmit={submitComplaint}
            onNavigate={onNavigate}
            askConfirm={askConfirm}
          />
        );
        break;

      case 'mine':
        page = (
          <MyComplaints
            student={student}
            complaints={complaints}
            onNavigate={onNavigate}
          />
        );
        break;

      case 'track':
        page = (
          <ComplaintTracking
            complaints={complaints}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        );
        break;

      case 'prof':
        page = (
          <StudentProfile
            student={student}
            onSave={saveProfile}
          />
        );
        break;
      case 'menu':
        page = <MessMenu />;
        break;
      case 'dash':
      default:
        page = (
          <StudentDashboard
            student={student}
            complaints={complaints}
            onNavigate={onNavigate}
          />
        );
        break;
    }
  } else {
    switch (view) {
      case 'all':
        page = (
          <ComplaintManagement
            complaints={complaints}
            onNavigate={onNavigate}
          />
        );
        break;

      case 'det':
        page = (
          <AdminComplaintDetails
            complaint={selectedComplaint}
            onNavigate={onNavigate}
            onUpdate={updateComplaint}
            askConfirm={askConfirm}
          />
        );
        break;

      case 'ana':
        page = (
          <AdminAnalytics complaints={complaints} />
        );
        break;

      case 'inbox':
        page = <AiInbox complaints={complaints} onNavigate={onNavigate} />;
        break;

      case 'mess':
        page = <MessManagement />;
        break;

      case 'food':
        page = <FoodWasteDashboard />;
        break;
      case 'ov':
      default:
        page = (
          <AdminOverview
            complaints={complaints}
            onNavigate={onNavigate}
          />
        );
        break;
    }
  }

  return (
    <div className="min-h-screen bg-bg text-tx">
      <Header
        portal={role}
        name={profile.name}
        onSignOut={logout}
      />

      <div className="mx-auto flex max-w-[1440px] flex-col md:flex-row">
        <SideNav
          portal={role}
          view={view}
          onNavigate={onNavigate}
        />

        <main className="min-w-0 flex-1 p-3 md:p-5">
          {page}
        </main>
      </div>

      <ConfirmDialog
        confirm={confirm}
        onClose={closeConfirm}
      />
    </div>
  );
}


export default function App() {
  if (!isFirebaseConfigured) {
    return <SetupNeeded />;
  }

  return (
    <AuthProvider>
      <Portal />
    </AuthProvider>
  );
}