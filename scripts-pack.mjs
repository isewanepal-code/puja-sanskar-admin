// Packs a built Next app into one folder (and zip) the host can run: node server.js
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [name] = process.argv.slice(2);
const out = `deploy/${name}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('.next/standalone', out, { recursive: true });
cpSync('.next/static', `${out}/.next/static`, { recursive: true });
if (existsSync('public')) cpSync('public', `${out}/public`, { recursive: true });
// The host's Passenger starts this file; Next's server reads PORT from it.
writeFileSync(`${out}/app.js`, "process.env.HOSTNAME ??= '0.0.0.0';\nrequire('./server.js');\n");
execFileSync('zip', ['-qr', `../${name}.zip`, '.'], { cwd: out });
console.log(`deploy/${name}.zip`);
