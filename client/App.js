"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./global.css");
var toaster_1 = require("@/components/ui/toaster");
var client_1 = require("react-dom/client");
var sonner_1 = require("@/components/ui/sonner");
var tooltip_1 = require("@/components/ui/tooltip");
var react_query_1 = require("@tanstack/react-query");
var react_router_dom_1 = require("react-router-dom");
var AppLayout_1 = require("@/components/layout/AppLayout");
var AddBranch_1 = require("@/components/Forms/AddBranch");
var Addemployee_1 = require("@/components/Forms/Addemployee");
var PatientRegistrationForm_1 = require("@/components/Forms/PatientRegistrationForm");
var EditPatientForm_1 = require("@/components/Forms/edit/EditPatientForm");
var EditDoctorForm_1 = require("@/components/Forms/edit/EditDoctorForm");
var AddAppointment_1 = require("@/components/Forms/AddAppointment");
var patientProfile_1 = require("@/components/Forms/view/patientProfile");
var Appointments_1 = require("./pages/Appointments");
var Dashboard_1 = require("./pages/Dashboard");
var Departments_1 = require("./pages/Departments");
var Login_1 = require("./pages/Login");
var NotFound_1 = require("./pages/NotFound");
var Patients_1 = require("./pages/Patients");
var ProtectedRoute_1 = require("./routes/ProtectedRoute");
var Doctor_1 = require("./pages/Doctor");
var DoctorDetails_1 = require("./pages/DoctorDetails");
var Staff_1 = require("./pages/Staff");
var Scheduled_1 = require("./pages/Scheduled");
var queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
// Define protected routes for better maintainability
var protectedRoutes = [
    { path: "/dashboard", element: <Dashboard_1.default /> },
    { path: "/patients", element: <Patients_1.default /> },
    { path: "/doctor", element: <Doctor_1.default /> },
    { path: "/doctor/view/:id", element: <Scheduled_1.default /> },
    { path: "/doctor-details", element: <DoctorDetails_1.default /> },
    { path: "/appointments", element: <Appointments_1.default /> },
    { path: "/departments", element: <Departments_1.default /> },
    { path: "/Staff", element: <Staff_1.default /> },
    { path: "/branches/add", element: <AddBranch_1.default /> },
    { path: "/staff/add", element: <Addemployee_1.default /> },
    { path: "/patients/add", element: <PatientRegistrationForm_1.default /> },
    { path: "/patients/view/:id", element: <patientProfile_1.default /> },
    { path: "/doctor/view/:id", element: <DoctorDetails_1.default /> },
    { path: "/patients/edit/:id", element: <EditPatientForm_1.default /> },
    { path: "/doctor/edit/:id", element: <EditDoctorForm_1.default /> },
    { path: "/appointments/add", element: <AddAppointment_1.default /> },
];
var App = function () { return (<react_query_1.QueryClientProvider client={queryClient}>
    <tooltip_1.TooltipProvider>
      <toaster_1.Toaster />
      <sonner_1.Toaster />
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          {/* Public Routes */}
          <react_router_dom_1.Route path="/" element={<Login_1.default />}/>
          
          {/* Protected Routes with Layout */}
          <react_router_dom_1.Route element={<AppLayout_1.AppLayout />}>
            {protectedRoutes.map(function (_a) {
        var path = _a.path, element = _a.element;
        return (<react_router_dom_1.Route key={path} path={path} element={<ProtectedRoute_1.default>{element}</ProtectedRoute_1.default>}/>);
    })}
          </react_router_dom_1.Route>
          
          {/* 404 Route */}
          <react_router_dom_1.Route path="*" element={<NotFound_1.default />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
    </tooltip_1.TooltipProvider>
  </react_query_1.QueryClientProvider>); };
(0, client_1.createRoot)(document.getElementById("root")).render(<App />);
