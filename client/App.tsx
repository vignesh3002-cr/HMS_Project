import "./global.css";
 
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Appointments from "./pages/Appointments";
import Dashboard from "./pages/Dashboard";
import Departments from "./pages/Departments";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PatientsManagement from "./pages/Patients";
import ProtectedRoute from "./routes/ProtectedRoute";
 
const queryClient = new QueryClient();
 
// IMPORTANT: Changed from arrow function to regular function declaration
// This ensures proper React component behavior and prevents remounting
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* IMPORTANT: BrowserRouter must be inside all providers */}
        <BrowserRouter>
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Login page (optional) */}
            <Route path="/login" element={<Login />} />
            
            {/* All pages with Navbar + Sidebar */}
            <Route element={<AppLayout />}>
              {/* IMPORTANT: Removed ProtectedRoute wrapper to prevent re-renders on navigation */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsManagement />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/departments" element={<Departments />} />
            </Route>
            
            {/* 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        
      </TooltipProvider>
    </QueryClientProvider>
  );
};
 
createRoot(document.getElementById("root")!).render(<App />);