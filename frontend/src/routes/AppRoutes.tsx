import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/components/ui/Feedback';
import { PublicOnlyRoute, ProtectedRoute } from '@/routes/guards';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';

// The landing page pulls in the three.js layer, so it is split out to keep
// authenticated pages (dashboard, records) light (TRD-14).
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));

// Heavier routes are code split to keep the public landing page fast (TRD-14).
const RecordsPage = lazy(() => import('@/pages/RecordsPage').then((m) => ({ default: m.RecordsPage })));
const RecordDetailPage = lazy(() =>
  import('@/pages/RecordDetailPage').then((m) => ({ default: m.RecordDetailPage })),
);
const AccessRequestsPage = lazy(() =>
  import('@/pages/AccessRequestsPage').then((m) => ({ default: m.AccessRequestsPage })),
);
const VerificationPage = lazy(() =>
  import('@/pages/VerificationPage').then((m) => ({ default: m.VerificationPage })),
);
const AuditPage = lazy(() => import('@/pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const SecurityCenterPage = lazy(() => import('@/pages/SecurityCenterPage').then((m) => ({ default: m.SecurityCenterPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const PrivacyDashboardPage = lazy(() => import('@/pages/PrivacyDashboardPage').then((m) => ({ default: m.PrivacyDashboardPage })));
const TimelinePage = lazy(() => import('@/pages/TimelinePage').then((m) => ({ default: m.TimelinePage })));
const EmergencyCardPage = lazy(() => import('@/pages/EmergencyCardPage').then((m) => ({ default: m.EmergencyCardPage })));
const EmergencyAccessPage = lazy(() => import('@/pages/EmergencyAccessPage').then((m) => ({ default: m.EmergencyAccessPage })));
const AiAssistantPage = lazy(() =>
  import('@/pages/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage })),
);
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const HospitalsPage = lazy(() => import('@/pages/HospitalsPage').then((m) => ({ default: m.HospitalsPage })));
const BlockchainExplorerPage = lazy(() => import('@/pages/BlockchainExplorerPage').then((m) => ({ default: m.BlockchainExplorerPage })));
const CaregiversPage = lazy(() => import('@/pages/CaregiversPage').then((m) => ({ default: m.CaregiversPage })));
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const PrescriptionsPage = lazy(() => import('@/pages/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));

export const AppRoutes = () => (
  <Suspense fallback={<LoadingState label="Loading view…" className="min-h-[60vh]" />}>
    <Routes>
      <Route path="/emergency/:token" element={<EmergencyAccessPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/hospitals" element={<HospitalsPage />} />
        <Route path="/explorer" element={<BlockchainExplorerPage />} />
        <Route path="/caregivers" element={<CaregiversPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/records/:recordId" element={<RecordDetailPage />} />
        <Route path="/access-requests" element={<AccessRequestsPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/security" element={<SecurityCenterPage />} />
        <Route path="/privacy" element={<PrivacyDashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai" element={<AiAssistantPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/emergency" element={<EmergencyCardPage />} />
        <Route path="/patient" element={<Navigate to="/dashboard" replace />} />
        <Route path="/doctor" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
