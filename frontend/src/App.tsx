import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useParentAuth, ParentAuthProvider } from "./context/ParentAuthContext";
import { ConfigProvider } from "./context/ConfigContext";
import { Spinner } from "./components/ui";
import Layout from "./components/Layout";
import ParentLayout from "./components/ParentLayout";

// Public pages
import HomePage from "./pages/public/HomePage";
import PricingPage from "./pages/public/PricingPage";
import FeaturesPage from "./pages/public/FeaturesPage";
import HelpPage from "./pages/public/HelpPage";

// Auth pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Signup from "./pages/Signup";
import CreateSchool from "./pages/CreateSchool";

// Admin pages
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Staff from "./pages/Staff";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Exams from "./pages/Exams";
import ReportCard from "./pages/ReportCard";
import AcademicYears from "./pages/AcademicYears";
import Settings from "./pages/Settings";
import Guardians from "./pages/Guardians";
import PaymentSettings from "./pages/PaymentSettings";

// Parent portal pages
import ParentLogin from "./pages/parent/ParentLogin";
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentFees from "./pages/parent/ParentFees";
import ParentExams from "./pages/parent/ParentExams";

// ── Admin guard ──────────────────────────────────────────────
function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── School guard — redirect to create-school if no school yet ─
function SchoolRequired({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.schoolId) return <Navigate to="/create-school" replace />;
  return children;
}

// ── Parent guard ─────────────────────────────────────────────
function ParentProtected({ children }: { children: JSX.Element }) {
  const { guardian, loading } = useParentAuth();
  if (loading) return <Spinner />;
  if (!guardian) return <Navigate to="/parent/login" replace />;
  return children;
}

export default function App() {
  return (
    <ParentAuthProvider>
      <Routes>
        {/* ── Public marketing pages ──────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/help" element={<HelpPage />} />

        {/* ── Auth ────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-school" element={
          <Protected>
            <ConfigProvider>
              <CreateSchool />
            </ConfigProvider>
          </Protected>
        } />
        <Route path="/parent/login" element={<ParentLogin />} />

        {/* ── Admin / Teacher routes ───────────────────────── */}
        <Route
          path="/app"
          element={
            <SchoolRequired>
              <ConfigProvider>
                <Layout />
              </ConfigProvider>
            </SchoolRequired>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="staff" element={<Staff />} />
          <Route path="classes" element={<Classes />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="fees" element={<Fees />} />
          <Route path="exams" element={<Exams />} />
          <Route path="report-cards" element={<ReportCard />} />
          <Route path="academic-years" element={<AcademicYears />} />
          <Route path="guardians" element={<Guardians />} />
          <Route path="payment-settings" element={<PaymentSettings />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── Parent Portal routes ─────────────────────────── */}
        <Route
          element={
            <ParentProtected>
              <ParentLayout />
            </ParentProtected>
          }
        >
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/attendance" element={<ParentAttendance />} />
          <Route path="/parent/fees" element={<ParentFees />} />
          <Route path="/parent/exams" element={<ParentExams />} />
        </Route>

        {/* Old /dashboard etc → redirect to /app */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ParentAuthProvider>
  );
}
