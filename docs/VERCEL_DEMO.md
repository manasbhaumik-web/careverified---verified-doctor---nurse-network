# The Vercel demo

Vercel runs the app as short-lived functions with a **temporary, per-instance data folder**, so a fresh deployment starts with an empty database and an empty packages and directory. (Read [DEPLOY.md](DEPLOY.md) for why a real deployment needs a persistent disk.) To make the Vercel site worth showing, the repository ships a ready-made demo database and the app copies it into place when an instance starts.

## What you get

- Packages, hospitals and clinics, pharmacies, promotions, 37 doctors and nurses, demo jobs, and the demo accounts, all synthetic.
- The same content on every cold start, because the copy is made from `demo-data/careverified.db`.

## What it is not

- **Not persistent.** Anything people do on the site (sign-ups, bookings, edits) lives in that function instance's temporary folder and is gone when the instance restarts. Different instances can also show different data. Never put real people's data on it.
- No uploads (they need `FILE_ENCRYPTION_KEY`, which is not set), no real email, and payments are test mode only.

## How it works

- `scripts/make-demo-snapshot.ts` starts a throwaway server on an empty folder, runs the normal demo seed, removes sessions and other activity, folds the database into one file and writes it to `demo-data/careverified.db`.
- `server/db.ts` copies that file into the temporary data folder **only when `VERCEL` is set and `DATA_DIR` is not, and never over an existing database**. Off Vercel nothing changes.
- `vercel.json` lists the file under `functions > includeFiles` so it is packaged with the function.
- `tests/demo-snapshot.test.ts` checks the file holds the demo content, has no sessions and only synthetic accounts, and that the copy logic behaves as described.

## Set up on Vercel

In the Vercel project, *Settings > Environment Variables*, add:

| Variable | Why |
| --- | --- |
| `SESSION_SECRET` | Signs sign-in sessions. Without it every cold start signs everyone out. Make one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `BADGE_SECRET` | Signs QR badge links, so they keep working after a restart. Same way to make one. |

Do not set `ALLOW_DEMO`. The demo accounts already exist in the snapshot, so they can sign in without it.

## Accounts

- **Demo accounts** (patient, doctor, pharmacy, facility, nurse, caregiver) are `demo.<role>@careverified.test` with the public demo password `DemoPass123`. The data behind them is synthetic, so this is acceptable for a demo, but anyone with the link can use them.
- **Board admin** (`admin@careverified.local`) has a random password made when the snapshot was built. It is in `demo-data/ADMIN_PASSWORD.txt` on the machine that built it. That file is not committed. If you lose it, build the snapshot again, which makes a new password.

## Refresh the snapshot

Do this whenever the demo seed or the database tables change:

```
node node_modules/tsx/dist/cli.mjs scripts/make-demo-snapshot.ts
```

Commit the new `demo-data/careverified.db`. (Run it with `node` directly: `npm run` breaks on the `&` in this folder's path.)

## Try it locally the way Vercel runs it

Bundle the server, then start it with `VERCEL=1`, `NODE_ENV=production`, a `SESSION_SECRET`, and `TEMP` pointing at an empty folder. Requests to `/api/packages`, `/api/tourism/facilities` and `/api/pharmacies/directory` should return the demo content, the demo patient should sign in, and the admin should refuse `DemoPass123`. This was done once when the snapshot was added: 5 packages, 6 facilities, 2 pharmacies, 37 professionals and 3 promotions came back.

## If the site is still empty after you deploy

- Check the deployment's function logs for an error on start.
- Confirm `demo-data/careverified.db` is in the repository (it is committed; only `ADMIN_PASSWORD.txt` is ignored) and that `vercel.json` still has the `includeFiles` entry.
- Remember each function instance copies its own database, so refresh the page once if one instance had a problem.