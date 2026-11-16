# Deploying MediCred with persistent data

MediCred keeps its data in SQLite plus a folder of private uploads. It also runs background timers (the daily credential expiry job and webhook retries).
That fits one long-running container with a **persistent disk**, and it does not fit Vercel functions, where the data folder is temporary and every
instance would have its own copy. Run it on a host that can mount a volume (Fly.io, Railway, Render, a VPS), using the `Dockerfile` in the repo root.

## What to run

```
docker build -t medicred .
docker run -p 3000:3000 -v medicred-data:/data --env-file .env medicred
```

- One instance only. SQLite is a single file, so do not scale to several instances.
- Mount a persistent volume at `/data` (`DATA_DIR`). It holds `careverified.db`, `uploads/` and the key files.
- Put the app behind HTTPS (every host above does this for you). In production the server trusts one proxy hop and sets secure cookies.
- Health check: `GET /api/on-call/status` answers 200 when the app is up (the image already uses it).

## Environment checklist

Set these before the first start. Without them production either refuses the feature or signs people out on restart.

| Variable | Why | How to make one |
| --- | --- | --- |
| `NODE_ENV=production` | Turns demo mode off, secure cookies on. Already set in the image. | |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, created on first start. A random password is printed once in the log if omitted. | a long unique password |
| `SESSION_SECRET` | Signs session tokens. | `openssl rand -hex 32` |
| `FILE_ENCRYPTION_KEY` | Encrypts uploaded documents, patient files and facility photos. **Uploads are refused without it.** | `openssl rand -hex 32` |
| `PAYOUT_ENCRYPTION_KEY` | Encrypts payout bank numbers. Bank details are refused without it. | `openssl rand -hex 32` |
| `BADGE_SECRET` | Signs QR badge links. Without it printed QR codes break if the data is ever reset. | `openssl rand -hex 32` |
| `MEDCRED_WEBHOOK_SECRET` | Signs webhooks to hospital systems. Without it none are sent. | `openssl rand -hex 32` |
| `APP_URL` | The public address, used in emails and QR codes. | `https://your-domain` |
| `SMTP_HOST`, `MAIL_FROM` (+ port, user, password) | Email, including password reset. See [EMAIL.md](EMAIL.md). | |

**Keep the keys safe and separate from the volume.** `FILE_ENCRYPTION_KEY` and `PAYOUT_ENCRYPTION_KEY` cannot be recovered: lose them and the encrypted
files and bank numbers are unreadable. Store them in your host's secret manager and in a password manager.

Do not set `ALLOW_DEMO=true` on a real deployment. Demo mode creates well-known accounts with a public password.

## First start

1. Start the container. Check the log for `listening on http://0.0.0.0:3000` and for any `[badge]` or `[auth]` warning (each names a missing variable).
2. Sign in as the admin at `/login?role=admin` and change nothing else yet.
3. Smoke test: register a facility at `/register-facility`, approve it (record its licence check first), register a caregiver and a practitioner, and look both up on `/verify`.
4. Restart the container and confirm the same accounts, uploads and `/verify` results are still there. This is the check that data really persists.

## Backups

- Back up the whole `/data` volume on a schedule (the host's volume snapshots are enough to start with). The database and `uploads/` must be backed up together.
- For a consistent copy of a running database use SQLite's backup (`sqlite3 careverified.db ".backup 'copy.db'"`) rather than copying the file while it is being written.
- Test a restore at least once before launch.

## Moving from the Vercel site

Data on the Vercel deployment is in a temporary folder and cannot be exported reliably. Treat the Vercel site as a demo: start fresh on the new host, and
re-create real accounts there. Point the domain at the new host only after the smoke test passes.

## Known limits

- Single instance and a single disk: an outage of that machine is an outage of the app. Add monitoring and an alert on the health check.
- Registry checks and e-KYC are still mock or manual (see [phase-1.md](phase-1.md)).
- **What has and has not been checked.** The production bundle (`node dist/server.cjs` with `NODE_ENV=production` and the variables above) was started twice on the same data folder: accounts, facility profiles and encrypted uploads were all still there after the restart, and demo accounts were absent. The `Dockerfile` itself has **not been built or run** (Docker was not running when this was written), and nothing has been deployed to a real host. Build the image and repeat the first-start steps above before relying on it.
