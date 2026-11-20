// Used by tests/demo-snapshot.test.ts: opens the app's database the way the server does and prints what is in it.
import { db, dataDir } from '../../server/db';
// A table that does not exist yet (a plain empty database) counts as 0.
const n = (sql: string) => { try { return (db.prepare(sql).get() as { n: number }).n; } catch { return 0; } };
console.log(JSON.stringify({
  dataDir,
  facilities: n('SELECT COUNT(*) AS n FROM tourism_facilities'),
  packages: n("SELECT COUNT(*) AS n FROM medical_packages WHERE status = 'published'"),
  pharmacies: n('SELECT COUNT(*) AS n FROM pharmacies'),
  users: n('SELECT COUNT(*) AS n FROM users'),
}));