# CareVerified – Verified Doctor & Nurse Network

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
- Every sensitive action is written to an audit log (admin: `GET /api/admin/audit-log`).
- `GET /api/me/export` and `POST /api/me/deletion-request` cover data export and deletion requests.
