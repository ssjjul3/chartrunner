/**
 * Die Gegenprobe zur Faehigkeitspruefung des Ownership-Workers.
 *
 *   node scripts/gegenprobe_ownership_health.mjs      (Node 22+, exit 1 bei FAIL)
 *
 * WARUM ES DIESE DATEI GIBT
 * -------------------------
 * `node scripts/check_ownership_worker.mjs` sagt: die Tests halten. Was es
 * NICHT sagt: ob auch nur einer davon die Zusicherung ERREICHT, um die es
 * geht. Ein Test, der danebengreift, ist von einem Test, der trifft, nicht zu
 * unterscheiden — beide sind gruen.
 *
 * CLAUDE.md §2 des privaten Repos, und sie gilt hier genauso: wer schreibt
 * „der Worker prueft X", schreibt im selben Commit den Test dazu UND die
 * Gegenprobe, die X ausbaut und den Test rot macht. Ohne die zweite Haelfte
 * steht auf dem Papier ein Pruefer, den nie jemand beim Pruefen gesehen hat.
 *
 * Gearbeitet wird in einer WEGWERFKOPIE des Baums; der Original-Quelltext
 * wird nicht angefasst. Jede Mutation ist EIN Weg, auf dem jemand die
 * Zusicherung ausbauen koennte, ohne dass es nach einem Fehler aussieht.
 * `edits` sind exakte Textersetzungen: kommt eine Fundstelle nicht GENAU
 * EINMAL vor, hat sich der Code bewegt und diese Datei prueft etwas anderes,
 * als sie behauptet. Auch das ist ein FEHLSCHLAG und kein Hinweis.
 *
 * Eine Mutation, die den Code KAPUTT macht (CRASH statt FAIL), zaehlt
 * ebenfalls als bestanden: auch dann ist gezeigt, dass an dieser Zeile etwas
 * haengt. Was NICHT zaehlt, ist Gruen.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const WORK = join(ROOT, '.gegenprobe-ownership');

const SRC = 'workers/ownership/src/index.js';

const TARGETS = [
  {
    zusicherung: 'git_sha steht GANZ OBEN in der Antwort (CLAUDE.md §4)',
    edits: [{
      from: "    git_sha: build.git_sha,\n    build,",
      to: "    build,",
    }],
  },
  {
    zusicherung: 'ein Wert, der kein Commit-SHA IST, wird nicht als einer ausgegeben',
    edits: [{
      from: "  const ok = GIT_SHA_RE.test(raw.toLowerCase());",
      to: "  const ok = raw !== '';",
    }],
  },
  {
    zusicherung: 'ein LEERER Katalog ist pending — nicht gruen',
    /* Die teuerste Zeile dieses Commits: genau so sah /health am 21.09.2026
     * aus, als `OWNERSHIP_CATALOG_JSON = "{}"` gemessen wurde. */
    edits: [{
      from: "  if (!keys.length) {\n    return {\n      check: {\n        ok: false,\n        kind: 'pending',",
      to: "  if (!keys.length) {\n    return {\n      check: {\n        ok: true,\n        kind: 'ok',",
    }],
  },
  {
    zusicherung: 'eine FEHLENDE Treasury ist pending — nicht gruen',
    edits: [{
      from: "  if (treasury === '') {\n    return {\n      check: {\n        ok: false,\n        kind: 'pending',",
      to: "  if (treasury === '') {\n    return {\n      check: {\n        ok: true,\n        kind: 'ok',",
    }],
  },
  {
    zusicherung: 'eine GESETZTE, aber ungueltige Treasury ist broken — nicht pending',
    edits: [{
      from: "  if (!isWalletAddress(treasury)) {\n    return {\n      check: {\n        ok: false,\n        kind: 'broken',",
      to: "  if (!isWalletAddress(treasury)) {\n    return {\n      check: {\n        ok: false,\n        kind: 'pending',",
    }],
  },
  {
    zusicherung: 'ein Katalogeintrag ohne brauchbaren Preis wird NICHT stillschweigend weggelassen',
    edits: [{
      from: "  if (unpriced.length) {\n    return {\n      check: {\n        ok: false,\n        kind: 'broken',",
      to: "  if (false) {\n    return {\n      check: {\n        ok: false,\n        kind: 'broken',",
    }],
  },
  {
    zusicherung: 'ein einziges broken schlaegt jede Zahl von pending',
    edits: [{
      from: "  const v = { ok, status: broken.length ? 'broken' : pending.length ? 'pending' : 'ok', pending, broken };",
      to: "  const v = { ok, status: pending.length ? 'pending' : broken.length ? 'broken' : 'ok', pending, broken };",
    }],
  },
  {
    zusicherung: 'health sagt, dass dieser Worker NICHT der einzige Schreiber verifizierter Zeilen ist',
    edits: [{
      from: "const GRANT_NOTE =\n  'Dieser Worker ist NICHT der einzige Schreiber verifizierter Zeilen in cr_ownership: der Geld-Worker ' +",
      to: "const GRANT_NOTE =\n  'Dieser Worker schreibt verifizierte Zeilen in cr_ownership: der Geld-Worker ' +",
    }],
  },
  {
    zusicherung: 'blocked_by entsteht aus den Pruefungen selbst und ist nicht nebenher gepflegt',
    edits: [{
      from: "    for (const c of v.pending) blocked.pending.push(`${name}.${c}`);",
      to: "    for (const c of v.pending) { if (name !== 'grant_onchain') blocked.pending.push(`${name}.${c}`); }",
    }],
  },
];

/** Den Baum, den check_ownership_worker.mjs braucht, in die Wegwerfkopie. */
function seedWorktree() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(join(WORK, 'scripts'), { recursive: true });
  mkdirSync(join(WORK, 'workers'), { recursive: true });
  mkdirSync(join(WORK, '.github', 'workflows'), { recursive: true });
  cpSync(join(ROOT, 'workers', 'ownership'), join(WORK, 'workers', 'ownership'), { recursive: true });
  cpSync(join(ROOT, 'scripts', 'check_ownership_worker.mjs'), join(WORK, 'scripts', 'check_ownership_worker.mjs'));
  cpSync(
    join(ROOT, '.github', 'workflows', 'deploy-workers.yml'),
    join(WORK, '.github', 'workflows', 'deploy-workers.yml')
  );
}

function runSuite() {
  const r = spawnSync(process.execPath, [join(WORK, 'scripts', 'check_ownership_worker.mjs')], {
    cwd: WORK,
    encoding: 'utf8',
  });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

let failures = 0;
const lines = [];

/* Erst der Beweis, dass die Wegwerfkopie UNVERAENDERT gruen ist. Ohne ihn
 * koennte jede Mutation aus einem kaputten Aufbau rot sein, und die ganze
 * Datei wuerde nichts zeigen. */
seedWorktree();
const baseline = runSuite();
if (baseline.code !== 0) {
  console.error('Die unveraenderte Kopie ist bereits ROT — die Gegenprobe kann nichts zeigen.\n');
  console.error(baseline.out);
  process.exit(1);
}
if (!/0 UNGETESTET/.test(baseline.out)) {
  console.error('Die unveraenderte Kopie meldet kein „0 UNGETESTET" — Abbruch.\n');
  console.error(baseline.out);
  process.exit(1);
}
lines.push(['ok', 'Ausgangslage: die unveraenderte Kopie ist gruen', '']);

for (const target of TARGETS) {
  seedWorktree();
  const file = join(WORK, SRC);
  let text = readFileSync(file, 'utf8');
  let ok = true;
  for (const e of target.edits) {
    const n = text.split(e.from).length - 1;
    if (n !== 1) {
      failures++;
      lines.push(['FAIL', target.zusicherung, `Fundstelle kommt ${n}x vor (erwartet: genau 1) — der Code hat sich bewegt`]);
      ok = false;
      break;
    }
    text = text.replace(e.from, e.to);
  }
  if (!ok) continue;
  writeFileSync(file, text);
  const res = runSuite();
  if (res.code === 0) {
    failures++;
    lines.push(['FAIL', target.zusicherung, 'die Mutation blieb GRUEN — diese Zusicherung wird von keinem Test erreicht']);
  } else {
    lines.push(['ok', target.zusicherung, '']);
  }
}

rmSync(WORK, { recursive: true, force: true });

for (const [state, name, msg] of lines) {
  if (state === 'ok') console.log('  rot wie erwartet   ' + name);
  else console.error('  FAIL               ' + name + '\n                     ' + msg);
}
const total = TARGETS.length;
console.log(
  '\nGegenprobe Ownership-/health: ' + (total - failures) + '/' + total +
  ' Zusicherungen belegt, ' + failures + ' UNGETESTET'
);
if (failures) process.exit(1);
