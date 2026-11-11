# JANASEVA — Hospital Grievance Monitoring System

**Every Concern Matters. Every Voice Deserves Action.**

A working full-stack prototype for **SOLVATHON 2026 — Problem Statement 1**: a public grievance
reporting and monitoring platform for government hospitals, built for citizens who may not own a
smartphone. Complaints can be registered online, by voice/IVR, or by a help-desk operator, and are
tracked through a real, role-based resolution workflow at the hospital.

This is **not** a hospital management system and **not** a medical emergency channel. Every public
screen states that emergencies must go to hospital staff or emergency services.

---

## 1. What is implemented

| Module | Status |
| --- | --- |
| Public landing page (hero, how it works, categories, voice, accessibility, transparency, footer) | Done |
| Online complaint registration with validation, consent, real backend reference ID | Done |
| Public complaint tracking (status, department, timeline; no private data) | Done |
| Voice/IVR journey: language choice, session, transcript edit, confirm, submit, acknowledgement | Done (simulation mode, IVR webhook adapter) |
| Assisted registration for help-desk operators | Done |
| Staff login, JWT auth, role-based routing | Done |
| Admin dashboard: KPIs, trends, category/department/status charts, recent/overdue/activity | Live backend data |
| Complaint management: search, filters, sort, pagination, detail, assign/reassign, status, notes | Done |
| Officer workspace scoped to department/assignment | Done |
| Follow-up and escalation queue with configurable thresholds, reminders/escalations | Done |
| Notifications: in-app + SMS abstraction, test send, honest simulation labels | Done |
| Settings: thresholds, departments, categories, staff accounts, audit log | Done |
| Reports and analytics + CSV export | Done |
| English/Kannada interface (separate locale files, form data preserved on switch) | Done |

All dashboard figures come from the API; there are no hardcoded production metrics. Seed records are
synthetic and clearly labelled in the README and audit entries.

### Honest limitations

* **Telephony, speech-to-text/text-to-speech and SMS providers are not configured**, so those
  channels run in a clearly labelled **simulation mode**. A simulated SMS is stored as `simulated`,
  never `sent`. Live mode activates only when the matching environment variables are set.
* Browser microphone recognition depends on `SpeechRecognition` support; the UI offers text entry
  and assisted registration when it is unavailable.
* Local demo uses SQLite. PostgreSQL is the production target and is supported by setting
  `DATABASE_URL`; the schema is created with SQLAlchemy `create_all()` on startup. **No Alembic
  migration history is included** — add a migration tool before evolving the schema in production.
* SMS/IVR demonstration numbers are placeholders (`1800-000-000`, `1800-000-111`).

---

## 2. Technology

**Frontend** — React 18, Vite 6, TypeScript, Tailwind CSS v4, React Router, Recharts, Lucide, Axios.

**Backend** — Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, PyJWT, bcrypt, Uvicorn.

**Database** — SQLite for the local demo; PostgreSQL (`postgresql+psycopg://…`) for deployment.

---

## 3. Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/            auth, public, complaints, dashboard, followups,
│   │   │                   notifications, voice, admin routers
│   │   ├── core/           settings, security (JWT, bcrypt), dependencies/RBAC
│   │   ├── database/       engine, session, Base
│   │   ├── integrations/   telephony, speech, SMS adapters (simulation fallbacks)
│   │   ├── models/         11 tables: users, hospitals, departments, categories,
│   │   │                   complaints, history, notifications, escalations, audit,
│   │   │                   reference counter, voice sessions
│   │   ├── schemas/        Pydantic request/response models
│   │   ├── services/       complaint lifecycle, follow-ups, notifications,
│   │   │                   categorisation, audit
│   │   ├── main.py         app wiring, CORS, error handling, health
│   │   └── seed.py         synthetic hospital, staff and complaints
│   ├── scripts/smoke_test.py   48-check end-to-end API harness
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          15 screens (public + staff)
│   │   ├── components/     design-system components
│   │   ├── layouts/        public shell, staff shell, role guards
│   │   ├── i18n/locales/   en.json, kn.json
│   │   ├── services/api.ts typed API client
│   │   └── types/          shared DTOs
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 4. Run locally (Windows, Git Bash)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
cp .env.example .env          # optional for the demo; defaults work
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `python3 -m venv .venv` and `.venv/bin/python`.

* API: <http://127.0.0.1:8000>
* Interactive docs: <http://127.0.0.1:8000/docs>
* Health: <http://127.0.0.1:8000/api/health>

On first start the app creates the schema, seeds **Chinnaswamy Government General Hospital (CGGH)**,
six staff accounts, seven categories, five departments and 18 synthetic complaints.

**Reset the demo:** stop the backend, delete `backend/janaseva.db`, start again.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173
```

Vite proxies `/api` to `http://127.0.0.1:8000`, so both servers must be running.

### Demo accounts

Password for every seeded account: **`Janaseva@123`**

| Role | Email | Sees |
| --- | --- | --- |
| Administrator | `admin@janaseva.gov.in` | All complaints, settings, reports, audit |
| Pharmacy officer | `pharmacy.officer@janaseva.gov.in` | Pharmacy / assigned complaints |
| Housekeeping officer | `housekeeping.officer@janaseva.gov.in` | Housekeeping / assigned |
| Facilities officer | `facilities.officer@janaseva.gov.in` | Facilities / assigned |
| Nursing officer | `nursing.officer@janaseva.gov.in` | General Medicine / assigned |
| Registration operator | `helpdesk@janaseva.gov.in` | Only registrations created by that operator |

The login page has one-click demo buttons to fill credentials.

---

## 5. Roles and permissions (enforced in FastAPI)

* **Administrator** — full hospital visibility, assign/reassign, close, escalate, configure
  thresholds/departments/categories/staff, analytics and audit.
* **Department officer** — acknowledges, moves to in-progress, resolves, adds action notes, flags for
  review; cannot assign, close or escalate.
* **Registration operator** — registers grievances for visitors and sees only their own
  registrations; cannot change status.

Status transitions are validated server-side. Complaint lifecycle:
`submitted → acknowledged → assigned → in_progress → resolved → closed`, plus `needs_review` and
`reopened`. Every change is written to complaint history and the audit log. Private notes never
appear on public tracking.

---

## 6. API overview

All routes are under `/api`. Protected routes require `Authorization: Bearer <JWT>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Staff login (JWT) |
| GET | `/auth/me` | Current staff profile |
| POST | `/auth/change-password` | Change own password |
| GET | `/public/meta` | Hospitals, categories, languages, demo flags |
| GET | `/public/complaints/{reference}` | Public tracking (safe fields only) |
| POST | `/complaints` | Register a grievance (web or assisted) |
| GET | `/complaints` | Search, filter, sort, paginate |
| GET | `/complaints/{reference}` | Full staff detail with history |
| PATCH | `/complaints/{reference}/status` | Status change + action note |
| PATCH | `/complaints/{reference}/assign` | Assign / reassign (admin) |
| POST | `/complaints/{reference}/notes` | Internal or public action note |
| GET | `/dashboard`, `/dashboard/summary`, `/dashboard/trends` | Live metrics |
| GET | `/follow-ups` | Pending/overdue queues |
| POST | `/follow-ups/{reference}/remind` | Record a reminder |
| POST | `/follow-ups/{reference}/escalate` | Record an escalation (admin) |
| GET | `/notifications` | In-app notifications |
| POST | `/notifications/{id}/read` | Mark read |
| POST | `/notifications/test` | Test channel (reports simulation honestly) |
| GET | `/voice/status` | Channel configuration and demo mode |
| POST | `/voice/sessions` | Start IVR/browser session |
| POST | `/voice/sessions/{id}/transcript` | Save transcript + category suggestion |
| POST | `/voice/sessions/{id}/submit` | Create complaint with reference ID |
| POST | `/voice/webhook` | Telephony provider webhook (signature verified when secret set) |
| GET/POST/PATCH | `/admin/users`, `/admin/departments`, `/admin/categories` | Administration |
| GET/PUT | `/admin/settings` | Follow-up thresholds |
| GET | `/admin/audit-logs` | Audit history |

Validation errors return `422` with field-level messages that the UI attaches to inputs. Unauthorised
requests return `401`; wrong-role actions return `403`; invalid lifecycle transitions return `409`.

---

## 7. Testing

With the backend running:

```bash
cd backend
.venv/Scripts/python.exe scripts/smoke_test.py
```

The harness performs 48 checks: registration (English + Kannada), reference format, public privacy,
validation failures, login and wrong password, dashboard data, search, assignment, officer workflow,
invalid transitions, private notes, reminders/escalations, simulated SMS honesty, voice
session/transcript/submit/webhook failure handling, operator scope, and persistence.

Frontend checks:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

The browser flows were also exercised manually: admin login, dashboard, complaint detail status
update, assisted registration, public tracking, officer scoping, follow-up reminder, settings
(thresholds, departments, categories, staff, audit, notifications), reports and CSV, voice journey,
and Kannada switching with form-data retention.

---

## 8. Deployment

The repository is hosted at <https://github.com/NamrathaMedaragutta/Janaseva>. A live deployment
needs **two** services because GitHub Pages cannot run Python:

* **Backend + PostgreSQL** on any Docker/Python host. `backend/Dockerfile` and `render.yaml` are
  included for [Render](https://render.com).
* **Frontend** on any static host. `frontend/vercel.json` is included for [Vercel](https://vercel.com).

Or run the backend as a normal process behind a reverse proxy:

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Render (backend + database)

1. Push this repository to GitHub and sign in to Render.
2. **New → Blueprint**, select the repository. Render reads `render.yaml`, creates the
   `janaseva-api` web service and `janaseva-db` PostgreSQL database, and injects `DATABASE_URL`
   (both `postgres://` and `postgresql://` forms are normalised automatically).
3. When prompted, enter your frontend origin for `CORS_ORIGINS` and `FRONTEND_URL`
   (for example `https://janaseva.vercel.app`, no trailing slash).
4. Deploy. Tables are created and demo data seeded on first boot; check
   `https://<service>.onrender.com/api/health`.

Notes: the free PostgreSQL tier is time-limited and not for production data. Set
`SEED_DEMO_DATA=false` to start without synthetic records, and replace `generateValue` with a
managed secret if you rotate keys. The schema is created with SQLAlchemy `create_all()`; add a
migration workflow (e.g. Alembic) before changing it in production.

### Vercel (frontend)

1. **Add New → Project**, import the repository, and set **Root Directory** to `frontend`.
   `vercel.json` supplies the Vite build, `dist` output and SPA rewrites for client-side routes.
2. Add the environment variable `VITE_API_BASE_URL=https://<backend>.onrender.com/api` for
   Production (and Preview, if you use it), then deploy.
3. Go back to Render and make sure `CORS_ORIGINS` contains the exact Vercel origin — including any
   custom domain — otherwise the browser blocks API calls.

### Docker anywhere

```bash
cd backend
docker build -t janaseva-api .
docker run -p 8000:8000 -e DATABASE_URL=postgresql://user:pass@host:5432/janaseva \
  -e JWT_SECRET_KEY=<strong-secret> -e CORS_ORIGINS=https://your-frontend.example janaseva-api
```

### Voice / SMS

Add provider credentials from `backend/.env.example` in the host's environment settings. The UI and
`/api/health` switch from `simulation` to `live` automatically, and provider webhooks are verified
with `VOICE_WEBHOOK_SECRET`.

---

## 9. Design and accessibility

Palette: `#081F26` (primary teal), `#E8E9EA` (surface), `#92989B` (muted), `#5F6464` (secondary
text), `#ADBCCB` (border), background `#F7F9FA`, semantic success/warning/danger/info. Typography is
Inter with Noto Sans Kannada fallback.

Layouts are responsive from mobile to desktop, primary actions use comfortable 44 px touch targets,
forms use labels and inline errors, status chips pair colour with text, charts have accessible
summaries, and language selection is a labelled toggle that preserves entered form data.
