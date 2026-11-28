import "./global.css";
import "react-international-phone/style.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import DoctorLayout from "@/components/layout/DoctorLayout";
import { AuthProvider } from "@/context/AuthContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { FollowUpAlertProvider } from "@/context/FollowUpAlertContext";
import { LabNotificationProvider } from "@/context/LabNotificationContext";
import { getToken, getUser } from "@/utils/token";

// ============================================================
// FORMS
// ============================================================

import AddBranch from "@/components/Forms/AddBranch";
import AddEmployee from "@/components/Forms/Addemployee";
import AddAppointment from "@/components/Forms/AddAppointment";
import PatientRegistrationForm from "@/components/Forms/PatientRegistrationForm";
import EditPatientForm from "@/components/Forms/edit/EditPatientForm";

// ============================================================
// VIEW FORMS
// ============================================================

import PatientProfile from "@/components/Forms/view/patientProfile";
import PatientDetailView from "@/components/Forms/view/viewpatient";
import ViewAppointmentScheduled from "@/components/Forms/view/View Appointment Scheduled";
import AdmissionDetails from "@/components/Forms/view/Admission Details";
import SettingsPage from "@/pages/Settings";

// ============================================================
// MAIN PAGES
// ============================================================

import Appointments from "./pages/Appointments";
import InpatientAdmissions from "./pages/InpatientAdmissions";
import InpatientDutyRoster from "./pages/InpatientDutyRoster";
import BedMaster from "./pages/BedMaster";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import Authenticate from "./pages/Authenticate";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Patients from "./pages/Patients";
import ProtocolMaster from "./pages/ProtocolMaster";
import OrderMaster from "./pages/OrderMaster";
import PharmacySlip from "./pages/PharmacySlip";
import Chat from "./pages/Chat";
import CreateProtocol from "@/components/Forms/CreateProtocol";
import ProtectedRoute from "./routes/ProtectedRoute";

// ============================================================
// DOCTOR MANAGEMENT
// ============================================================

import Doctor from "./pages/Doctor";
import DoctorDetails from "./pages/Viewmoredoctor";
import Staff from "./pages/Staff";
import Scheduled from "./pages/Scheduled";
import DayView from "./pages/Day view";
import TransferDoctor from "./pages/TransferDoctor";
import RescheduleQueue from "./pages/RescheduleQueue";
import PendingBookings from "./pages/PendingBookings";
import WeekView from "./pages/Week view";
import ComponentShowcase from "./pages/ComponentShowcase";

// ============================================================
// ADMIN
// ============================================================

import PermissionMatrix from "./pages/admin/PermissionMatrix";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RoleManagement from "./pages/admin/RoleManagement";
import AccessDenied from "./pages/AccessDenied";

// ============================================================
// SYSTEM OWNER
// ============================================================

import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";

// ============================================================
// SUPER ADMIN
// ============================================================

import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Hospitals from "./pages/Hospitals";
import UsersPage from "./pages/Users";
import Branches from "./pages/Branches";

// ============================================================
// DOCTOR PORTAL
// ============================================================

import DoctorAppointments from "./pages/doctor/AppointmentPage";
import DashboardRedirect from "./pages/DashboardRedirect";
import DoctorLeave from "./pages/doctor/LeavePage";
import DoctorSchedule from "./pages/doctor/MySchedulePage";
import DoctorReviews from "./pages/doctor/ReviewPage";
import DoctorProfile from "./pages/doctor/Profile";
import DoctorNotifications from "./pages/doctor/DoctorNotifications";
import Consultation from "./pages/doctor/Patientconsut";
import DoctorPatientProfile from "./pages/doctor/notes and doc";
import PatientDetails from "./pages/doctor/patient-details";
import LabDashboard from "./pages/doctor/lab/labdashboard";
import LabOrders from "./pages/doctor/lab/LabOrders";
import SampleVerification from "./pages/doctor/lab/sampleverification";
import TestingSamples from "./pages/doctor/lab/testingsamples";
import ReportGeneration from "./pages/doctor/lab/reportgeneration";
import ReportTransfer from "./pages/doctor/lab/reporttransfer";
import LabProfile from "./pages/doctor/lab/labprofile";
import LabMaster from "./pages/doctor/lab/labmaster";

// ============================================================
// PATIENT PORTAL
// ============================================================

import { PatientPortalLayout } from "@/components/patient-portal/PatientPortalLayout";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientLabReports from "./pages/patient/PatientLabReports";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import PatientHealthHistory from "./pages/patient/PatientHealthHistory";
import PatientChemotherapy from "./pages/patient/PatientChemotherapy";

// ============================================================
// HOOKS / AUTH
// ============================================================

import { useEffect } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { LoadingScreen } from "./components/skeletons/LoadingScreen";

// ============================================================
// QUERY CLIENT
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================
// DOCTOR PORTAL ROUTES
// ============================================================

const doctorRoutes = [
  {
    path: "/doctor/appointments",
    element: <DoctorAppointments />,
  },
  {
    path: "/doctor/appointments/add",
    element: <AddAppointment />,
  },
  {
    path: "/doctor/appointments/edit/:id",
    element: <AddAppointment />,
  },
  {
    path: "/doctor/schedule",
    element: <DoctorSchedule />,
  },
  {
    path: "/doctor/leave",
    element: <DoctorLeave />,
  },
  {
    path: "/doctor/reviews",
    element: <DoctorReviews />,
  },
  {
    path: "/doctor/profile",
    element: <DoctorProfile />,
  },
  {
    path: "/doctor/notifications",
    element: <DoctorNotifications />,
  },
];

// ============================================================
// MAIN HMS / ADMIN ROUTES
// ============================================================

const protectedRoutes = [
  // ----------------------------------------------------------
  // Temporary Component Showcase
  // ----------------------------------------------------------
  {
    path: "/component-showcase",
    element: <ComponentShowcase />,
  },

  // ----------------------------------------------------------
  // Profile & Security
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // Settings (unified hub — profile, security, notifications,
  // appearance, integrations, billing)
  // ----------------------------------------------------------

  {
    path: "/settings",
    element: <SettingsPage />,
  },

  // Legacy standalone routes — redirect into the settings hub
  // so old bookmarks and AI-chat nav links still land correctly.
  {
    path: "/profile",
    element: <Navigate to="/settings" replace />,
  },

  {
    path: "/security",
    element: <Navigate to="/settings?tab=security" replace />,
  },

  // ----------------------------------------------------------
  // Notifications (system-wide change log)
  // ----------------------------------------------------------

  {
    path: "/notifications",
    element: <Notifications />,
  },

  // ----------------------------------------------------------
  // Patients
  // ----------------------------------------------------------

  {
    path: "/patients",
    element: <Patients />,
    permission: "patient.read",
  },

  {
    path: "/patients/add",
    element: <PatientRegistrationForm />,
    permission: "patient.create",
  },

  {
    path: "/patients/view/:id",
    element: <PatientProfile />,
    permission: "patient.read",
  },
  {
    path: "/patients/full-record/:id",
    element: <PatientDetailView />,
    permission: "patient.read",
  },

  {
    path: "/patients/edit/:id",
    element: <EditPatientForm />,
    permission: "patient.update",
  },

  // ----------------------------------------------------------
  // Doctor Management
  // ----------------------------------------------------------

  {
    path: "/doctor",
    element: <Doctor />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/view/:id",
    element: <DoctorDetails />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/view/:id/schedule",
    element: <Scheduled />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/view",
    element: <Scheduled />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/day-view/:id",
    element: <Scheduled />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/day-view",
    element: <Scheduled />,
    permission: "doctor.read",
  },

  {
    path: "/doctor/edit/:id",
    element: <AddEmployee />,
    permission: "employee.update",
  },

  {
    path: "/doctor/transfer/:id",
    element: <TransferDoctor />,
    permission: "doctor.transfer",
  },

  // ----------------------------------------------------------
  // Appointments
  // ----------------------------------------------------------

  {
    path: "/appointments",
    element: <Appointments />,
    permission: "appointment.read",
  },

  {
    path: "/appointments/day-view",
    element: <DayView />,
    permission: "appointment.read",
  },

  {
    path: "/appointments/week-view",
    element: <WeekView />,
    permission: "appointment.read",
  },

  {
    path: "/appointments/reschedule-queue",
    element: <RescheduleQueue />,
    permission: "doctor.transfer",
  },

  {
    path: "/appointments/pending",
    element: <PendingBookings />,
    permission: "appointment.read",
  },

  {
    path: "/appointments/pending-bookings",
    element: <PendingBookings />,
    permission: "appointment.read",
  },

  {
    path: "/appointments/add",
    element: <AddAppointment />,
    permission: "appointment.create",
  },

  {
    path: "/appointments/book",
    element: <AddAppointment />,
    permission: "appointment.create",
  },

  {
    path: "/appointments/edit/:id",
    element: <AddAppointment />,
    permission: "appointment.update",
  },

  {
    path: "/appointments/view/:id",
    element: <ViewAppointmentScheduled />,
    permission: "appointment.read",
  },

  // ----------------------------------------------------------
  // Inpatient (IPD)
  // ----------------------------------------------------------

  {
    path: "/inpatient/admissions",
    element: <InpatientAdmissions />,
    permission: "admission.read",
  },

  {
    path: "/inpatient/duty-roster",
    element: <InpatientDutyRoster />,
    permission: "admission.read",
  },

  // Legacy IPD roster URL -- kept so old bookmarks/links that point at /ipd
  // still land on the dedicated admissions route.
  {
    path: "/ipd",
    element: <Navigate to="/inpatient/admissions" replace />,
    permission: "admission.read",
  },

  {
    path: "/ipd/beds",
    element: <BedMaster />,
    permission: "admission.read",
  },

  {
    path: "/admissions/view/:ipNumber",
    element: <AdmissionDetails />,
    permission: "admission.read",
  },

  // ----------------------------------------------------------
  // Departments
  // ----------------------------------------------------------

  {
    path: "/departments",
    element: <Departments />,
    permission: "department.read",
  },

  // ----------------------------------------------------------
  // Admin
  // ----------------------------------------------------------

  {
    path: "/admin",
    element: <AdminDashboard />,
    permission: "permission.manage",
  },

  {
    path: "/admin/permissions",
    element: <PermissionMatrix />,
    permission: "permission.manage",
  },

  {
    path: "/admin/roles",
    element: <RoleManagement />,
    permission: "permission.manage",
  },

  // ----------------------------------------------------------
  // System Owner
  // ----------------------------------------------------------

  {
    path: "/owner-dashboard",
    element: <OwnerDashboard />,
    permission: "hospital.read",
  },

  // ----------------------------------------------------------
  // Super Admin
  // ----------------------------------------------------------

  {
    path: "/super-admin",
    element: <SuperAdminDashboard />,
    permission: "hospital.read",
  },

  {
    path: "/hospitals",
    element: <Hospitals />,
    permission: "hospital.read",
  },

  {
    path: "/users",
    element: <UsersPage />,
    permission: "employee.read",
  },

  {
    path: "/branches",
    element: <Branches />,
    permission: "branch.read",
  },

  // ----------------------------------------------------------
  // Staff
  // ----------------------------------------------------------

  {
    path: "/Staff",
    element: <Staff />,
    permission: "employee.read",
  },

  {
    path: "/staff/add",
    element: <AddEmployee />,
    permission: "employee.create",
  },

  {
    path: "/staff/view/:id",
    element: <DoctorDetails />,
    permission: "employee.read",
  },

  {
    path: "/staff/edit/:id",
    element: <AddEmployee />,
    permission: "employee.update",
  },

  // ----------------------------------------------------------
  // Branches
  // ----------------------------------------------------------

  {
    path: "/branches/add",
    element: <AddBranch />,
    permission: "branch.create",
  },

  {
    path: "/branches/edit/:id",
    element: <AddBranch />,
    permission: "branch.update",
  },

  // ----------------------------------------------------------
  // Chemotherapy Protocols
  // ----------------------------------------------------------

  {
    path: "/protocol",
    element: <ProtocolMaster />,
  },

  {
    path: "/protocol/cancer",
    element: <ProtocolMaster />,  
  },
  {
    path: "/protocol/create",
    element: <CreateProtocol />,
  },
  {
    path: "/protocol/view/:protocolId",
    element: <CreateProtocol />,
  },
  {
    path: "/protocol/edit/:protocolId",
    element: <CreateProtocol />,
  },

  // ----------------------------------------------------------
  // Chemotherapy Orders
  // ----------------------------------------------------------

  {
    path: "/orders",
    element: <OrderMaster />,
    permission: "chemo.plan.read",
  },
  {
    path: "/orders/:planId/pharmacy-slip",
    element: <PharmacySlip />,
    permission: "chemo.plan.read",
  },

  // ----------------------------------------------------------
  // AI Chat
  // ----------------------------------------------------------

  {
    path: "/chat",
    element: <Chat />,
  },

];

// ============================================================
// REMEMBER ME CHECK
// ============================================================

const RememberMeCheck = () => {
  const location = useLocation();

  // This gate only concerns the login route.
  if (location.pathname !== "/") return null;

  // Synchronous session check (sessionStorage/localStorage) - no async wait,
  // so the decision happens during render instead of after first paint.
  const user = getUser();
  if (!getToken() || !user) return null; // token without a usable session -> Login handles cleanup

  const roleType = String(user.role_type ?? "").trim().toUpperCase();
  const targetDashboard =
    roleType === "PATIENT"
      ? "/patient/dashboard"
      : roleType === "LAB_TECHNICIAN"
      ? "/lab/dashboard"
      : "/dashboard";

  // Logged-in user landed on the login route: NEVER paint the Login form.
  // It used to render fully for one frame before the redirect effect fired,
  // which glitched the login page on every visit while logged in. Show the
  // branded loading screen for that single frame until target dashboard commits.
  return (
    <>
      <LoadingScreen message="Preparing your workspace..." />
      <Navigate to={targetDashboard} replace />
    </>
  );
};

// ============================================================
// APP
// ============================================================

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>

      <Toaster />
      <Sonner />

      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <PermissionProvider>
            <NotificationProvider employeeId={getUser()?.employee_id ?? null}>
            <FollowUpAlertProvider>

              <RememberMeCheck />

          <Routes>

            {/* ==================================================
                PUBLIC ROUTE
            ================================================== */}

            <Route
              path="/"
              element={<Login />}
            />

            <Route
              path="/owner-login"
              element={<OwnerLogin />}
            />

            <Route
              path="/authenticate"
              element={<Authenticate />}
            />

            {/* ==================================================
                ROLE-AWARE DASHBOARD

                Renders the doctor dashboard (inside DoctorLayout)
                for DOCTOR role and the admin dashboard (inside
                AppLayout) for every other role.
            ================================================== */}

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                LEGACY DOCTOR DASHBOARD URL

                Kept so old bookmarks/links that point to
                /doctor-dashboard still land on the right page.
            ================================================== */}

            <Route
              path="/doctor-dashboard"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                LABORATORY INFORMATION SYSTEM (LIS)
            ================================================== */}

            <Route
              element={
                <LabNotificationProvider>
                  <Outlet />
                </LabNotificationProvider>
              }
            >
              <Route
                path="/lab/dashboard"
                element={
                  <ProtectedRoute>
                    <LabOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/sample-registration"
                element={
                  <ProtectedRoute>
                    <LabDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/orders"
                element={
                  <ProtectedRoute>
                    <LabOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/sample-verification"
                element={
                  <ProtectedRoute>
                    <SampleVerification />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/testing-samples"
                element={
                  <ProtectedRoute>
                    <TestingSamples />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/report-generation"
                element={
                  <ProtectedRoute>
                    <ReportGeneration />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/report-transfer"
                element={
                  <ProtectedRoute>
                    <ReportTransfer />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/profile"
                element={
                  <ProtectedRoute>
                    <LabProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/lab/master"
                element={
                  <ProtectedRoute>
                    <LabMaster />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* ==================================================
                PATIENT PORTAL
            ================================================== */}

            <Route element={<PatientPortalLayout />}>
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/appointments"
                element={
                  <ProtectedRoute>
                    <PatientAppointments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/chemotherapy"
                element={
                  <ProtectedRoute>
                    <PatientChemotherapy />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/reports"
                element={
                  <ProtectedRoute>
                    <PatientLabReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/prescriptions"
                element={
                  <ProtectedRoute>
                    <PatientPrescriptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/history"
                element={
                  <ProtectedRoute>
                    <PatientHealthHistory />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* ==================================================
                DOCTOR PORTAL

                DoctorLayout contains:
                - DoctorSidebar
                - Doctor page content

                AppLayout is NOT used here.
            ================================================== */}

            <Route element={<DoctorLayout />}>

              {doctorRoutes.map(
                ({ path, element }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute>
                        {element}
                      </ProtectedRoute>
                    }
                  />
                )
              )}

            </Route>

            {/* ==================================================
                DOCTOR PORTAL - PATIENT CONSULTATION

                Full-screen page WITHOUT the DoctorSidebar
                nav (renders edge to edge, no nav bar).
            ================================================== */}

            <Route
              path="/doctor/patient-consultation"
              element={
                <ProtectedRoute>
                  <Consultation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/profile-patient"
              element={
                <ProtectedRoute>
                  <DoctorPatientProfile />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                DOCTOR PORTAL - PATIENT FULL PROFILE

                Opens the HMSPatientPortal (Order Summary tab by
                default) for the patient passed via location.state.
            ================================================== */}

            <Route
              path="/doctor/patient-details"
              element={
                <ProtectedRoute>
                  <PatientDetails />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                MAIN HMS / ADMIN PORTAL

                AppLayout is used only for the normal
                HMS/admin pages.
            ================================================== */}

            <Route element={<AppLayout />}>

              {protectedRoutes.map(
                ({
                  path,
                  element,
                  permission,
                }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute
                        permission={permission}
                      >
                        {element}
                      </ProtectedRoute>
                    }
                  />
                )
              )}

            </Route>

            {/* ==================================================
                ACCESS DENIED
            ================================================== */}

            <Route
              path="/403"
              element={<AccessDenied />}
            />

            {/* ==================================================
                404
            ================================================== */}

            <Route
              path="*"
              element={<NotFound />}
            />

          </Routes>

          </FollowUpAlertProvider>
        </NotificationProvider>
      </PermissionProvider>
          </ThemeProvider>
        </AuthProvider>

      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

// ============================================================
// RENDER
// ============================================================

createRoot(
  document.getElementById("root")!
).render(<App />);