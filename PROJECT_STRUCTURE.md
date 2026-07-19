# HMS_Project — Structure Overview

A Hospital Management System (HMS). React frontend + Node/Express/Prisma backend, deployed with the backend on Render and the database on Supabase (PostgreSQL).

## Two separate git repositories live inside this one folder

| Path | What it is | Git remote |
|---|---|---|
| `HMS_Project/` (this folder, root) | Frontend (Vite + React + TypeScript) | `https://github.com/vignesh3002-cr/HMS_Project.git` |
| `Backend/HMS_Backend/` | **Real backend source** — its own nested git repo | `https://github.com/vignesh3002-cr/HMS_Backend.git` |

⚠️ `hms-backend/` (lowercase, top-level) is **not** the real backend — it's an empty/near-empty decoy folder (just stray `.env`/`.gitignore`/`package-lock.json`), not a git repo. Ignore it. The actual backend lives at `Backend/HMS_Backend/`.

The backend deploys to Render at `https://hms-backend-qjmr.onrender.com`, auto-deploying from `HMS_Backend`'s `main` branch. The frontend's `VITE_BACKEND_URL` points at `https://hms-backend-qjmr.onrender.com/api`. **A local backend edit has no effect until it's committed, pushed to `main`, and Render finishes redeploying.**

---

## Frontend (`client/`)

Vite + React + TypeScript. Routing via `react-router-dom` (see `client/App.tsx` for the route table).

```
client/
├── App.tsx                  # Route definitions, ProtectedRoute wiring
├── api/                     # Axios-based API clients, one per backend module
│   ├── axios.ts             #   shared axios instance: attaches Bearer token,
│   │                        #   cache-busts GET requests, handles global 401
│   ├── auth.api.ts          #   login
│   ├── employee.api.ts      #   employees (Staff/Doctor/Dashboard pages depend on this)
│   ├── branch.api.ts        #   branches (has branch_area)
│   └── department.api.ts    #   department master
├── pages/                   # One file per route/screen
│   ├── Dashboard.tsx        #   overview: doctors/staff/appointments tabs
│   ├── Staff.tsx            #   staff list (Medical/Administrative/Support/All tabs)
│   ├── Doctor.tsx           #   doctor list (list + grid view)
│   ├── Patients.tsx, Appointments.tsx, Departments.tsx, Login.tsx, ...
├── components/
│   ├── Forms/                #   Addemployee.tsx, AddBranch.tsx
│   ├── hms/                  #   domain widgets: BranchSelector, DashboardTable, Calender, ...
│   ├── ui/                    #   generic/reusable UI kit (shadcn-style): FormDropdown,
│   │                          #   MultiSelectDropdown, dialog, table, toast, etc.
│   ├── layout/AppLayout.tsx   #   shared shell (sidebar/nav) for protected routes
│   └── Filter/                #   reusable filter-panel system used by list pages
├── context/AuthContext.tsx
├── routes/ProtectedRoute.tsx  # redirects to "/" (Login) if no token in localStorage
├── utils/token.ts             # localStorage token/user get/save/remove
├── hooks/, lib/                # misc hooks + utils
└── vite-env.d.ts
```

**Auth flow:** `Login.tsx` → `auth.api.ts login()` → token saved via `utils/token.ts` → `ProtectedRoute` checks token presence → `axios.ts` interceptor attaches `Authorization: Bearer <token>` to every request → on any `401`, token is cleared and the user is redirected to `/`. Token expiry is `JWT_EXPIRES_IN=1h` server-side; there is currently **no silent refresh-token flow** implemented on the frontend even though the backend issues a longer-lived refresh token.

**Employee data flow (Staff/Doctor/Dashboard pages):** each page calls `employeeApi.getAll()` once on mount, shows a loading spinner while in flight, and falls back to hardcoded dummy/sample arrays only if the real fetch returns null/empty/errors — real data always takes priority when present.

---

## Backend (`Backend/HMS_Backend/`)

Express + TypeScript + Prisma (PostgreSQL via Supabase).

```
Backend/HMS_Backend/
├── src/
│   ├── server.ts             # app entrypoint
│   ├── app.ts
│   ├── config/               # prisma client, jwt config
│   ├── middleware/            # authenticate, authorize, error handling
│   ├── routes/index.ts        # mounts all module routers
│   ├── modules/
│   │   ├── auth/              #   login, user
│   │   │   └── user/
│   │   ├── employee/           #   employee.{controller,service,repository,routes,types}.ts
│   │   ├── doctor/, doctor-schedule/
│   │   ├── branch/            #   includes branch_area field
│   │   ├── department/        #   department_master
│   │   ├── appointment/
│   │   └── patient/
│   ├── types/express.d.ts
│   └── utils/                 # bcrypt, jwt, idGenerator, response helpers
├── prisma/schema.prisma       # full DB schema (see model list below)
├── prisma.config.ts
├── dist/                       # compiled output
└── .env                        # DATABASE_URL, JWT_SECRET, etc. — never share/commit this
```

**Layering convention per module:** `*.routes.ts` (Express router, wraps handlers with `authenticate` middleware) → `*.controller.ts` (parses req/res, calls service, shapes JSON response) → `*.service.ts` (business logic) → `*.repository.ts` (Prisma queries).

**Prisma models** (`prisma/schema.prisma`): `appointment_history`, `branch`, `chemotherapy_master`, `department_master`, `doctor_profile`, `doctor_schedule`, `employees`, `encounter`, `hospital`, `id_sequences`, `lab_history`, `lab_order`, `lab_result`, `lab_tech_profile`, `patient_bio_data`, `patient_history`, `prescription`, `prescription_item`, `role_id_config`, `user_branch_mapping`, `user_log`, `user_table`, `pharmacy`, `pharmacy_master`.

**Key relations relevant to the frontend:** `employees.department_id → department_master`, `employees.branch_id → branch`, `employees.user_id → user_table` (carries `role_type`, e.g. `DOCTOR`/`NURSE`/`PHARMACIST`/`STAFF`/`RECEPTIONIST`). `branch` has both `branch_name` and `branch_area` (distinct fields).

**Employee list endpoint (`GET /api/employees`):** routes to `EmployeeController.getAllEmployees`, which builds a query object from `req.query` and calls `EmployeeService.getEmployees(query)` → `EmployeeRepository.getEmployees(query)`, which does a paginated `findMany` with `include: { user_table, branch: { branch_name, branch_area }, department_master: { department_name } }`. Response shape: `{ success, message, data: { total, page, limit, totalPages, employees } }`. (There's also an older, unused `getAllEmployees()` repository method — a bare `findMany()` with no includes/pagination — kept for reference but not wired to any route.)

---

## Deployment / environments

- Frontend dev: `npm run dev` (Vite, default port 5173).
- Frontend env: root `.env` → `VITE_BACKEND_URL=https://hms-backend-qjmr.onrender.com/api`.
- Backend: deployed on Render, connected to `HMS_Backend` GitHub repo's `main` branch (auto-deploy on push).
- Database: Supabase-hosted PostgreSQL (see `Backend/HMS_Backend/.env` `DATABASE_URL` — never share this value).
- `postman/` and `.postman/` at the project root hold Postman collections/environments for manually testing the API.

---

## Known gotchas (worth telling another AI model up front)

1. Two look-alike "backend" folders exist in this tree; only `Backend/HMS_Backend/` is real (see table above).
2. The frontend's HTTP client used to be vulnerable to serving stale cached `GET` responses (browser 304 reuse) — fixed by appending a cache-busting timestamp param to every GET request in `client/api/axios.ts`.
3. No refresh-token flow on the frontend yet, despite the backend issuing one — sessions simply expire after `JWT_EXPIRES_IN` (1h) and require a fresh login.
4. `prisma/schema.prisma` in the backend repo currently has uncommitted local changes (new `pharmacy`/`pharmacy_master` models) unrelated to the employee/department/branch work — don't assume they're deployed.
