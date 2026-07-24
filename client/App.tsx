import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import AddBranch from "@/components/Forms/AddBranch";
import AddEmployee from "@/components/Forms/Addemployee";
import PatientRegistrationForm from "@/components/Forms/PatientRegistrationForm";
import EditPatientForm from "@/components/Forms/edit/EditPatientForm";
import EditDoctorForm from "@/components/Forms/edit/EditDoctorForm";
import EditBranch from "@/components/Forms/edit/EditBranch";
import AddAppointment from "@/components/Forms/AddAppointment";
import EditAppointment from "@/components/Forms/edit/Edit Appointment";
import PatientProfile from "@/components/Forms/view/patientProfile";
import AppointmentBooking from "@/components/Forms/view/AppointmentBooking";
import ViewAppointmentScheduled from "@/components/Forms/view/View Appointment Scheduled";
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
import DayScheduled from "./pages/Day Scheduled";
import DayView from "./pages/Day view";
import WeekView from "./pages/Week view";


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
  { path: "/patients", element: <Patients /> },
  { path: "/doctor", element: <Doctor /> },
  { path: "/doctor/view/:id", element: <Scheduled /> },
  { path: "/doctor/view", element: <Scheduled /> },
  { path: "/doctor/day-view", element: <DayScheduled /> },
  { path: "/appointments", element: <Appointments /> },
  { path: "/appointments/day-view", element: <DayView /> },
  { path: "/appointments/week-view", element: <WeekView /> },
  { path: "/departments", element: <Departments /> },
  


   { path: "/Staff", element: <Staff /> },

  { path: "/branches/add", element: <AddBranch /> },
  { path: "/staff/add", element: <AddEmployee /> },
  { path: "/patients/add", element: <PatientRegistrationForm /> },
  { path: "/patients/view/:id", element: <PatientProfile /> },
  { path: "/doctor/view/:id", element: <DoctorDetails /> },
  { path: "/patients/edit/:id", element: <EditPatientForm /> },
  { path: "/branches/edit/:id", element: <EditBranch /> },
  { path: "/doctor/edit/:id", element: <EditDoctorForm /> },
  { path: "/appointments/add", element: <AddAppointment /> },
  { path: "/appointments/edit/:id", element: <EditAppointment /> },
  { path: "/appointments/book", element: <AppointmentBooking /> },
  { path: "/appointments/view/:id", element: <ViewAppointmentScheduled /> },

];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          
          {/* Protected Routes with Layout */}
          <Route element={<AppLayout />}>
            {protectedRoutes.map(({ path, element }) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute>{element}</ProtectedRoute>}
              />
            ))}
          </Route>
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);