import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { RequireAuth, roleHome } from "./layouts/RequireAuth";
import { StaffLayout } from "./layouts/StaffLayout";
import { useAuth } from "./hooks/useAuth";
import { AssistedRegistrationPage } from "./pages/AssistedRegistration";
import { ComplaintDetailPage } from "./pages/ComplaintDetail";
import { ComplaintsPage } from "./pages/Complaints";
import { DashboardPage } from "./pages/Dashboard";
import { FollowUpsPage } from "./pages/FollowUps";
import { LandingPage } from "./pages/Landing";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { OfficerPage } from "./pages/Officer";
import { PublicRegisterPage } from "./pages/PublicRegister";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { TrackPage } from "./pages/Track";
import { VoicePage } from "./pages/Voice";

function PublicShell() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

function StaffIndex() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={roleHome(user.role)} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicShell />}>
          <Route index element={<LandingPage />} />
          <Route path="register" element={<PublicRegisterPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="voice" element={<VoicePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/staff"
          element={
            <RequireAuth>
              <StaffLayout />
            </RequireAuth>
          }
        >
          <Route index element={<StaffIndex />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth roles={["admin"]}>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="officer"
            element={
              <RequireAuth roles={["admin", "officer"]}>
                <OfficerPage />
              </RequireAuth>
            }
          />
          <Route
            path="complaints"
            element={
              <RequireAuth roles={["admin", "officer", "operator"]}>
                <ComplaintsPage />
              </RequireAuth>
            }
          />
          <Route
            path="complaints/:referenceId"
            element={
              <RequireAuth roles={["admin", "officer", "operator"]}>
                <ComplaintDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="register"
            element={
              <RequireAuth roles={["admin", "operator"]}>
                <AssistedRegistrationPage />
              </RequireAuth>
            }
          />
          <Route
            path="follow-ups"
            element={
              <RequireAuth roles={["admin", "officer"]}>
                <FollowUpsPage />
              </RequireAuth>
            }
          />
          <Route
            path="reports"
            element={
              <RequireAuth roles={["admin"]}>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAuth roles={["admin"]}>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
