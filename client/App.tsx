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
} from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import DoctorLayout from "@/components/layout/DoctorLayout";
import { PermissionProvider } from "@/context/PermissionContext";

// ============================================================
// FORMS
// ============================================================

import AddBranch from "@/components/Forms/AddBranch";
import AddEmployee from "@/components/Forms/Addemployee";
import PatientRegistrationForm from "@/components/Forms/PatientRegistrationForm";
import EditPatientForm from "@/components/Forms/edit/EditPatientForm";
import AddAppointment from "@/components/Forms/AddAppointment";
import EditAppointment from "@/components/Forms/edit/Edit Appointment";

// ============================================================
// VIEW FORMS
// ============================================================

import PatientProfile from "@/components/Forms/view/patientProfile";
import ViewAppointmentScheduled from "@/components/Forms/view/View Appointment Scheduled";
import Profile from "@/components/Forms/view/view profile ";
import Security from "@/components/Forms/view/Security";

// ============================================================
// MAIN PAGES
// ============================================================

import Appointments from "./pages/Appointments";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Patients from "./pages/Patients";
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
import WeekView from "./pages/Week view";

// ============================================================
// ADMIN
// ============================================================

import PermissionMatrix from "./pages/admin/PermissionMatrix";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RoleManagement from "./pages/admin/RoleManagement";
import AccessDenied from "./pages/AccessDenied";

// ============================================================
// DOCTOR PORTAL
// ============================================================

import DoctorAppointments from "./pages/doctor/AppointmentPage";
import DashboardRedirect from "./pages/DashboardRedirect";
import DoctorLeave from "./pages/doctor/LeavePage";
import DoctorSchedule from "./pages/doctor/MySchedulePage";
import DoctorReviews from "./pages/doctor/ReviewPage";
import Consultation from "./pages/doctor/Patientconsut";
import DoctorPatientProfile from "./pages/doctor/discharage  details"; 

// ============================================================
// HOOKS / AUTH
// ============================================================

import { useEffect } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { getToken, getUser } from "./utils/token";

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
];

// ============================================================
// MAIN HMS / ADMIN ROUTES
// ============================================================

const protectedRoutes = [
  // ----------------------------------------------------------
  // Profile & Security
  // ----------------------------------------------------------

  {
    path: "/profile",
    element: <Profile />,
  },

  {
    path: "/security",
    element: <Security />,
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
    element: <EditAppointment />,
    permission: "appointment.update",
  },

  {
    path: "/appointments/view/:id",
    element: <ViewAppointmentScheduled />,
    permission: "appointment.read",
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
];

// ============================================================
// REMEMBER ME CHECK
// ============================================================

const RememberMeCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only perform this check on the login page.
    if (location.pathname !== "/") {
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    // --------------------------------------------------------
    // Check the saved user's role
    // --------------------------------------------------------

    const user = getUser();

    const roleType = String(
      user?.role_type ?? ""
    )
      .trim()
      .toUpperCase();

    console.log(
      "RememberMeCheck - saved role:",
      roleType
    );

    // --------------------------------------------------------
    // Doctor
    // --------------------------------------------------------

    if (roleType === "DOCTOR") {
      navigate("/dashboard", {
        replace: true,
      });

      return;
    }

    // --------------------------------------------------------
    // Admin
    // --------------------------------------------------------

    if (
      roleType === "ADMIN" ||
      roleType === "SUPER_ADMIN" ||
      roleType === "SYSTEM_ADMIN"
    ) {
      navigate("/dashboard", {
        replace: true,
      });

      return;
    }

    // --------------------------------------------------------
    // Unknown role
    // --------------------------------------------------------

    navigate("/dashboard", {
      replace: true,
    });
  }, [navigate, location.pathname]);

  return null;
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

        <PermissionProvider>

          <RememberMeCheck />

          <Routes>

            {/* ==================================================
                PUBLIC ROUTE
            ================================================== */}

            <Route
              path="/"
              element={<Login />}
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

        </PermissionProvider>

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