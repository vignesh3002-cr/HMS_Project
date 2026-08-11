import "./global.css";
import "react-international-phone/style.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionProvider } from "@/context/PermissionContext";
import AddBranch from "@/components/Forms/AddBranch";
import AddEmployee from "@/components/Forms/Addemployee";
import PatientRegistrationForm from "@/components/Forms/PatientRegistrationForm";
import EditPatientForm from "@/components/Forms/edit/EditPatientForm";
import AddAppointment from "@/components/Forms/AddAppointment";
import EditAppointment from "@/components/Forms/edit/Edit Appointment";
import PatientProfile from "@/components/Forms/view/patientProfile";
import ViewAppointmentScheduled from "@/components/Forms/view/View Appointment Scheduled";
import DoctorDetailView from "@/components/Forms/view/viewemployee";
import Profile from "@/components/Forms/view/view profile ";
import Security from "@/components/Forms/view/Security";
import Appointments from "./pages/Appointments";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Patients from "./pages/Patients";
import ProtectedRoute from "./routes/ProtectedRoute";
import Doctor from "./pages/Doctor";
import DoctorDetails from "./pages/Viewmoredoctor";
import Staff from "./pages/Staff";
import Scheduled from "./pages/Scheduled";
import DayView from "./pages/Day view";
import TransferDoctor from "./pages/TransferDoctor";
import RescheduleQueue from "./pages/RescheduleQueue";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getToken } from "./utils/token";
import WeekView from "./pages/Week view";
import PermissionMatrix from "./pages/admin/PermissionMatrix";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RoleManagement from "./pages/admin/RoleManagement";
import AccessDenied from "./pages/AccessDenied";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Define protected routes for better maintainability
const protectedRoutes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/profile", element: <Profile /> },
  { path: "/security", element: <Security /> },
  { path: "/patients", element: <Patients />, permission: "patient.read" },
  { path: "/doctor", element: <Doctor />, permission: "doctor.read" },
  { path: "/doctor/view/:id", element: <Scheduled />, permission: "doctor.read" },
  { path: "/doctor/view/:id/details", element: <DoctorDetails />, permission: "doctor.read" },
  { path: "/doctor/view", element: <Scheduled />, permission: "doctor.read" },
  { path: "/doctor/day-view/:id", element: <Scheduled />, permission: "doctor.read" },
  { path: "/doctor/day-view", element: <Scheduled />, permission: "doctor.read" },
  { path: "/appointments", element: <Appointments />, permission: "appointment.read" },
  { path: "/appointments/day-view", element: <DayView />, permission: "appointment.read" },
  { path: "/appointments/week-view", element: <WeekView />, permission: "appointment.read" },
  { path: "/appointments/reschedule-queue", element: <RescheduleQueue />, permission: "doctor.transfer" },
  { path: "/departments", element: <Departments />, permission: "department.read" },
  { path: "/admin", element: <AdminDashboard />, permission: "permission.manage" },
  { path: "/admin/permissions", element: <PermissionMatrix />, permission: "permission.manage" },
  { path: "/admin/roles", element: <RoleManagement />, permission: "permission.manage" },
  
  { path: "/Staff", element: <Staff />, permission: "employee.read" },

  { path: "/branches/add", element: <AddBranch />, permission: "branch.create" },
  { path: "/staff/add", element: <AddEmployee />, permission: "employee.create" },
  { path: "/patients/add", element: <PatientRegistrationForm />, permission: "patient.create" },
  { path: "/patients/view/:id", element: <PatientProfile />, permission: "patient.read" },
  { path: "/doctor/view/:id", element: <DoctorDetails />, permission: "doctor.read" },
  // Staff.tsx's "View" action -- same role-adaptive detail component as
  // above (shows different fields depending on the employee's actual
  // role_type: Branch Admin/Staff Admin/Nurse/etc.), just under a route
  // name that isn't doctor-specific and gated by employee.read to match
  // what the View button itself already checks.
  { path: "/staff/view/:id", element: <DoctorDetails />, permission: "employee.read" },
  { path: "/patients/edit/:id", element: <EditPatientForm />, permission: "patient.update" },
  { path: "/branches/edit/:id", element: <AddBranch />, permission: "branch.update" },
  { path: "/staff/edit/:id", element: <AddEmployee />, permission: "employee.update" },
  { path: "/doctor/edit/:id", element: <AddEmployee />, permission: "employee.update" },
  { path: "/doctor/transfer/:id", element: <TransferDoctor />, permission: "doctor.transfer" },
  { path: "/appointments/add", element: <AddAppointment />, permission: "appointment.create" },
  { path: "/appointments/edit/:id", element: <EditAppointment />, permission: "appointment.update" },
  { path: "/appointments/book", element: <AddAppointment />, permission: "appointment.create" },
  { path: "/appointments/view/:id", element: <ViewAppointmentScheduled />, permission: "appointment.read" },

];
const RememberMeCheck = () => {

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {

    // Only skip the login screen when the user actually landed on it — this
    // check used to fire on ANY full page load (refresh, typed URL, link
    // opened in a new tab) and would redirect to /dashboard regardless of
    // which page was requested, hijacking navigation to every other route.
    if (location.pathname !== "/") return;

    const token = getToken();

    if (token) {
      navigate("/dashboard");
    }

  }, [navigate, location.pathname]);


  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PermissionProvider>
          <RememberMeCheck />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            
            
            {/* Protected Routes with Layout */}
            <Route element={<AppLayout />}>
              {protectedRoutes.map(({ path, element, permission }) => (
                <Route
                  key={path}
                  path={path}
                  element={<ProtectedRoute permission={permission}>{element}</ProtectedRoute>}
                />
              ))}
            </Route>
            
            {/* Access Denied */}
            <Route path="/403" element={<AccessDenied />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PermissionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);