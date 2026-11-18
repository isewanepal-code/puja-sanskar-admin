// The dependency audit gate: fails on a high or critical finding in what ships, except advisories listed
// here by hand, each with why it is safe and when to look again. Run: node scripts/audit-gate.mjs
import { execFileSync } from 'node:child_process';

const ALLOWED = {
  // picomatch ReDoS through repeated extglobs. No patched version exists yet (every release is listed).
  // It is a glob matcher inside the file watcher that next-intl uses while building; no pattern from a
  // visitor ever reaches it. Look again when picomatch publishes a fix, and remove this line then.
  'GHSA-fc5q-39xc-vjpf': 'picomatch ReDoS, no fix published, build-time only',
};
const LEVELS = ['high', 'critical'];

let raw;
try {
  raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch (error) {
  // npm audit exits 1 when it finds anything; the report is still on stdout.
  raw = error.stdout?.toString() ?? '';
}
const report = JSON.parse(raw);
const found = report.vulnerabilities ?? {};

const excused = new Map();
function isExcused(name, trail = new Set()) {
  if (excused.has(name)) return excused.get(name);
  if (trail.has(name)) return true;
  trail.add(name);
  const vuln = found[name];
  const ok =
    !!vuln &&
    vuln.via.every((via) =>
      typeof via === 'string'
        ? isExcused(via, trail)
        : Object.keys(ALLOWED).some((id) => (via.url ?? '').endsWith(id)),
    );
  excused.set(name, ok);
  return ok;
}

const blocking = Object.values(found).filter(
  (v) => LEVELS.includes(v.severity) && !isExcused(v.name),
);
if (blocking.length > 0) {
  for (const v of blocking) {
    console.error(`${v.severity.toUpperCase()}  ${v.name}  ${v.range}`);
    for (const via of v.via)
      console.error(`  ${typeof via === 'string' ? `via ${via}` : `${via.title} ${via.url}`}`);
  }
  console.error(
    `\n${blocking.length} high or critical finding(s) in what ships. Fix them or list the advisory with a reason.`,
  );
  process.exit(1);
}
const skipped = Object.values(found).filter((v) => LEVELS.includes(v.severity));
console.log(
  skipped.length > 0
    ? `Audit passed. Allowed by hand: ${skipped.map((v) => v.name).join(', ')} (see scripts/audit-gate.mjs).`
    : 'Audit passed: no high or critical findings.',
);
