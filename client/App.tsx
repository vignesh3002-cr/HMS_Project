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
import Appointments from "./pages/Appointments";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Patients from "./pages/Patients";
import ProtectedRoute from "./routes/ProtectedRoute";
import Doctor from "./pages/Doctor";
import Staff from "./pages/Staff";


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
  { path: "/appointments", element: <Appointments /> },
  { path: "/departments", element: <Departments /> },
  


   { path: "/Staff", element: <Staff /> },

  { path: "/branches/add", element: <AddBranch /> },
  { path: "/staff/add", element: <AddEmployee /> },
  { path: "/patients/add", element: <PatientRegistrationForm /> },

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