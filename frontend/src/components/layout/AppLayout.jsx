import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { AuthContext } from '../../context/AuthContext';
import SettingsModal from '../common/SettingsModal';
import MentorReviewQueue from '../learning_path/MentorReviewQueue';
import EvidenceDrawer from '../learning_path/EvidenceDrawer';

export default function AppLayout() {
  const { user, logout } = useContext(AuthContext);

  // Layout & Modal UI States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mentorQueueOpen, setMentorQueueOpen] = useState(false);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  
  // Default fallback evidence target for general proof-of-work submission from Sidebar #8
  const [evidenceTarget, setEvidenceTarget] = useState({
    task_type: 'skill_step',
    skill_identifier: 'general_evidence',
    canonical_skill: 'Practical Evidence Submission',
    title: 'Independent Project / Proof of Work'
  });

  const handleOpenEvidence = (customTarget = null) => {
    if (customTarget) {
      setEvidenceTarget(customTarget);
    }
    setEvidenceDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-text-main transition-colors duration-200 overflow-x-hidden">
      {/* 260px Fixed Sidebar for Desktop + Mobile Off-Canvas Drawer */}
      <Sidebar
        user={user}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenEvidence={() => handleOpenEvidence()}
        onOpenMentorReviews={() => setMentorQueueOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Viewport Container (Offset by 260px on Desktop) */}
      <div className="lg:pl-[260px] flex flex-col flex-1 min-w-0 transition-all">
        {/* Sticky Top Header */}
        <TopHeader
          user={user}
          logout={logout}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Content Outlet for Protected Page Routes */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ onOpenEvidence: handleOpenEvidence, onOpenMentorReviews: () => setMentorQueueOpen(true) }} />
        </main>
      </div>

      {/* Shared Modals / Drawers for Sidebar Items 8, 9, 10 */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        logout={logout}
      />

      <MentorReviewQueue
        isOpen={mentorQueueOpen}
        onClose={() => setMentorQueueOpen(false)}
        onReviewComplete={() => {}}
      />

      <EvidenceDrawer
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        targetItem={evidenceTarget}
        onSuccess={() => {}}
      />
    </div>
  );
}
