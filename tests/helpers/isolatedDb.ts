// Import this FIRST in a test that imports server modules directly. Those modules open a database when they load, and without this they
// would open the developer's own data folder. It points them at a throwaway folder instead.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medcred-unit-'));
process.env.DATA_DIR = dir;
process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });
