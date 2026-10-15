# MedCred – Verified Doctor & Nurse Network

A credential-verified registry connecting licensed doctors and nurses with patients and healthcare institutions.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the first admin account is created on first start)
3. Run the app: `npm run dev`

The app is served at http://localhost:3000.

## Accounts & data

- Sign-in uses server-side sessions (httpOnly cookie), scrypt password hashing and account lockout.
- Roles: patient, practitioner, admin. Practitioners are listed publicly only after an admin verifies their uploaded credentials.
- Data lives in `data/careverified.db` (SQLite) and private uploads in `data/uploads/`; both are git-ignored. Back them up.
- The first start after the pharmacy-workspace update rebuilds the `users` table once (SQLite cannot widen a CHECK constraint) and saves a copy first as `data/careverified.before-pharmacy-role-<timestamp>.db`. Delete that backup once you have confirmed everything works.
- Every sensitive action is written to an audit log (admin: `GET /api/admin/audit-log`).
- `GET /api/me/export` and `POST /api/me/deletion-request` cover data export and deletion requests.

## Before you go live: demo mode

Sign-in has its own page, `/login` (`/login?role=practitioner&register=1` opens the practitioner sign-up).

**Demo mode** creates well-known demo accounts (password `DemoPass123`) on every start and offers one-click demo sign-in on the login page. It is on in development and **off when `NODE_ENV=production`**. Override with `ALLOW_DEMO=true` or `ALLOW_DEMO=false`. Demo sign-in never covers the admin account.

- Always set `NODE_ENV=production` and a strong `ADMIN_PASSWORD` on a real deployment. If `ADMIN_PASSWORD` is missing in production, a random admin password is generated and printed once in the server log.
- A database that was ever started with demo mode on already contains the demo accounts (`*@careverified.test`) and two demo pharmacies. Remove them before launch.
- An earlier version let anyone sign in as the admin through `POST /api/auth/demo`. If a copy of that version was ever deployed, treat the admin password and every session as compromised: change the password, clear the `sessions` table, and review the audit log for `auth.login.demo` entries.

## Demo data (development only)

With the app running (`npm run dev`), create demo accounts and sample records in a second terminal:

```
npm run seed:demo
```

It prints the sign-in details, is safe to run repeatedly, uses test-mode payments only, and refuses to run against anything but a local server.
