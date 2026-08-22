# Fusion Starter

A production-ready full-stack React application template with integrated Express server, featuring React Router 6 SPA mode, TypeScript, Vitest, Zod and modern tooling.

While the starter comes with a express server, only create endpoint when strictly neccesary, for example to encapsulate logic that must leave in the server, such as private keys handling, or certain DB operations, db...

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (spa) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Testing**: Vitest
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components (Index.tsx = home)
├── components/ui/        # Pre-built UI component library
├── App.tsx                # App entry point and with SPA routing setup
└── global.css            # TailwindCSS 3 theming and global styles

server/                   # Express API backend
├── index.ts              # Main server setup (express config + routes)
└── routes/               # API handlers

shared/                   # Types used by both client & server
└── api.ts                # Example of how to share api interfaces
```

## Key Features

## SPA Routing System

The routing system is powered by React Router 6:

- `client/pages/Index.tsx` represents the home page.
- Routes are defined in `client/App.tsx` using the `react-router-dom` import
- Route files are located in the `client/pages/` directory

For example, routes can be defined with:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Routes>
  <Route path="/" element={<Index />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>;
```

### Styling System

- **Primary**: TailwindCSS 3 utility classes
- **Theme and design tokens**: Configure in `client/global.css` 
- **UI components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

```typescript
// cn utility usage
className={cn(
  "base-classes",
  { "conditional-class": condition },
  props.className  // User overrides
)}
```

### Express Server Integration

- **Development**: Single port (8080) for both frontend/backend
- **Hot reload**: Both client and server code
- **API endpoints**: Prefixed with `/api/`

#### Example API Routes
- `GET /api/ping` - Simple ping api
- `GET /api/demo` - Demo endpoint  

### Shared Types
Import consistent types in both client and server:
```typescript
import { DemoResponse } from '@shared/api';
```

Path aliases:
- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev        # Start dev server (client + server)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test          # Run Vitest tests
```

## Adding Features

### Add new colors to the theme

Open `client/global.css` and `tailwind.config.ts` and add new tailwind colors.

### New API Route
1. **Optional**: Create a shared interface in `shared/api.ts`:
```typescript
export interface MyRouteResponse {
  message: string;
  // Add other response properties here
}
```

2. Create a new route handler in `server/routes/my-route.ts`:
```typescript
import { RequestHandler } from "express";
import { MyRouteResponse } from "@shared/api"; // Optional: for type safety

export const handleMyRoute: RequestHandler = (req, res) => {
  const response: MyRouteResponse = {
    message: 'Hello from my endpoint!'
  };
  res.json(response);
};
```

3. Register the route in `server/index.ts`:
```typescript
import { handleMyRoute } from "./routes/my-route";

// Add to the createServer function:
app.get("/api/my-endpoint", handleMyRoute);
```

4. Use in React components with type safety:
```typescript
import { MyRouteResponse } from '@shared/api'; // Optional: for type safety

const response = await fetch('/api/my-endpoint');
const data: MyRouteResponse = await response.json();
```

### New Page Route
1. Create component in `client/pages/MyPage.tsx`
2. Add route in `client/App.tsx`:
```typescript
<Route path="/my-page" element={<MyPage />} />
```

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables (Linux, macOS, Windows)
- **Cloud Deployment**: Use either Netlify or Vercel via their MCP integrations for easy deployment. Both providers work well with this starter template.

## Architecture Notes

- Single-port development with Vite + Express integration
- TypeScript throughout (client, server, shared)
- Full hot reload for rapid development
- Production-ready with multiple deployment options
- Comprehensive UI component library included
- Type-safe API communication via shared interfaces

## Project Layout (HMS-specific)

### Frontend (`HMS_Project/`) — React 18 + TS + Vite + TailwindCSS 3.4 + React Router 7 + TanStack Query 5
- **API layer**: `client/api/` — Axios instance at `axios.ts`, JWT interceptor, base URL from `VITE_BACKEND_URL`
- **Forms**: `client/components/Forms/` — `AddBranch`, `EditBranch`, `Addemployee`, `PatientRegistrationForm`, `EditPatientForm`, `EditDoctorForm`, `AddAppointment`, `AppointmentBooking`, `patientProfile`
- **UI components**: `client/components/ui/` (56 shadcn-style Radix components) + `client/components/hms/` (domain-specific)
- **Key custom components**: `FormDropdown` (searchable), `MultiSelectDropdown`, `AvatarUpload` (base64), `CountryStateCitySelect`, `BranchSelector`, `QuickAddFab`
- **Routing**: Protected routes in `AppLayout` (sidebar: Dashboard, Staff, Doctor, Patients, Appointment, Billing, Protocol)

### Backend (`HMS_Backend/`) — Express 5 + TS + Prisma ORM 7 + PostgreSQL (Supabase)
- **Architecture**: Routes → Controllers → Services → Repositories → Prisma
- **Auth**: JWT (8h expiry), bcrypt, role-based authorization
- **Modules**: auth, branch, employee, patient, appointment, encounter, department, chemotherapy
- **Database**: 34 models, hosted on Supabase
- **Note**: Doctor routes, prescription routes, and doctor-schedule routes are currently disabled/commented out

## Changes Made (Session Log)

### 1. EditBranch Wiring (BranchSelector.tsx)
- Changed edit button from inline dialog to navigation: `navigate("/branches/edit/:id")`
- Removed unused inline edit Dialog (state, handlers, JSX)
- Added `useNavigate` import

### 2. Addemployee.tsx — Specialization from Departments
- Removed hardcoded `specializations` arrays from all `ROLE_CONFIG` entries
- Specialization dropdown now populated from `departments` list (department names)
- When department selected, specialization auto-fills with department name

### 3. Addemployee.tsx — Time Format
- Changed `TIME_OPTIONS` label from `"9:00 AM"` → `"09:00 AM"` (leading zero for hours)

### 4. Addemployee.tsx — Branch Width
- Branch section changed from default grid column to `lg:col-span-2`

### 5. Addemployee.tsx — Photo URL
- `employee_photo_URL: formData.photoUrl || undefined` sent in create payload
- `photo?: string` added to `CreateEmployeePayload` in `employee.api.ts`

### 6. Addemployee.tsx — Dropdown Overflow
- Card wrapper changed from `overflow-hidden` to `overflow-clip` to prevent dropdown clipping

### 7. employee.api.ts — Type Alignment
- Added `"STAFF"` to `CreateEmployeePayload.role_type` union
- Renamed `GetEmployeesParams` fields: `role_type`→`roleType`, `branch_id`→`branchId`, `department_id`→`department` (matching backend camelCase params)

### 8. Addemployee.tsx — Admin Role (Replaces Receptionist)
- `toDisplayRole`: `"RECEPTIONIST"` → `"Admin"`
- `toBackendRole`: `"Admin"` → `"RECEPTIONIST"`
- `ROLE_CONFIG`: Renamed `Receptionist` → `Admin` with designations `["Branch Admin", "Staff Admin", "Receptionist"]`
- Department dropdown shows `[{ label: "All Departments", value: "__ALL__" }]` when Admin is selected
- Submit handles `__ALL__` by falling back to first department ID
- Added `ALL_DEPARTMENTS_VALUE = "__ALL__"` sentinel
### 8. Allow appointment booking on week-offs and leave days (unless CANCEL)
 - Backend (HMS_Backend-main/src/modules/appointment/appointment.service.ts): validateBookingContext now allows off-day/leave bookings when no CANCEL change exists; bookAppointment/updateAppointment skip pickScheduleForTime when isOffDayBooking=true; getAvailableSlots returns is_cancelled flag.
 - Frontend (HMS_Project/client): AddAppointment.tsx shows free-time input on week-off/leave days; doctor dropdown includes LEAVE doctors labeled (On Leave); Edit Appointment.tsx same handling. CANCEL changes remain absolute priority.
