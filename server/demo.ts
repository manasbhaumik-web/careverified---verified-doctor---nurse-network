/**
 * Demo mode: well-known demo accounts (password "DemoPass123") and one-click demo sign-in.
 *
 * This is for development and showcases only. It is OFF in production (NODE_ENV=production) unless ALLOW_DEMO=true,
 * and can be switched off anywhere with ALLOW_DEMO=false. Demo sign-in never covers the admin account.
 *
 * Make sure production deployments set NODE_ENV=production. A database that was ever run with demo mode on already
 * contains the demo accounts: delete users ending in @careverified.test and the demo pharmacies before going live.
 */
export function demoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ALLOW_DEMO === "true") return true;
  if (env.ALLOW_DEMO === "false") return false;
  return env.NODE_ENV !== "production";
}

/** Roles one-click demo sign-in may use. Admin is deliberately absent: it must sign in with its real password. */
export const DEMO_ROLES = ["patient", "practitioner", "pharmacy", "facility"] as const;
