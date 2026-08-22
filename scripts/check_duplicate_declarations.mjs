/* Stille Namenskollisionen in ChartRunner_Prototype.html — in JEDEM Scope.
 *
 * Anlass: v1.0.874 brachte ein zweites `_crFmtSol` mit. Zwei gleichnamige
 * Funktionsdeklarationen im selben Scope kollidieren NICHT laut — die spaetere
 * gewinnt, still. Die Swap-Tafel benutzte also nie den Formatierer, den sie
 * mitgebracht hat, und weder Parse-Check noch Browsertest konnten das melden:
 * die Datei ist gueltiges JavaScript, sie tut nur etwas anderes als dasteht.
 *
 * Die erste Fassung (check_duplicate_toplevel.mjs, v1.0.875) prueft nur die
 * OBERSTE Ebene der Skriptbloecke. Aufgefallen ist die Luecke der Session, die
 * den Check angewandt hat: die Datei besteht groesstenteils aus IIFEs, und zwei
 * gleichnamige Funktionen INNERHALB einer IIFE fielen durch. „Gruen" hiess
 * damit „keine globalen Kollisionen", nicht „keine Kollisionen" — und genau
 * dieser Unterschied stand nicht im Text daneben. Diese Fassung prueft jeden
 * Scope, deshalb der neue Name.
 *
 * Geprueft wird:
 *   - jeder Scope einzeln: oberste Ebene jedes Blocks, jeder Funktionskoerper,
 *     jede IIFE. Verglichen werden nur GESCHWISTER — Shadowing ueber Ebenen
 *     hinweg (`var x` aussen, `var x` in einer inneren Funktion) ist legal und
 *     meistens Absicht.
 *   - Bloecke gegeneinander: alle teilen sich denselben globalen Scope.
 *   - doppelte Schluessel in Objektliteralen. Anderer Mechanismus, dieselbe
 *     Stille: der spaetere Wert gewinnt.
 *
 * Zwei Klassen:
 *   STILL — nur Funktionsdeklarationen bzw. Objektschluessel. Legal, lautlos.
 *           Der gefaehrliche Fall und der Grund fuer dieses Skript.
 *   LAUT  — const/let/class beteiligt. Die Laufzeit wirft von selbst.
 *
 * Braucht `acorn` (nur hier, nur in CI — die Spieldatei bleibt abhaengigkeitsfrei):
 *   npm i acorn --no-save && node scripts/check_duplicate_declarations.mjs
 */
import fs from 'node:fs';
import * as acorn from 'acorn';

const FILE = 'ChartRunner_Prototype.html';
const html = fs.readFileSync(FILE, 'utf8');

// Dieselbe Regex wie der Parse-Check in ci.yml — bewusst identisch, damit beide
// ueber DIESELBEN Bloecke reden (es sind 7, nicht 8: src=-Bloecke sind keine
// Inline-Bloecke).
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;

const findings = [];
const globals = new Map();          // blockuebergreifend: name -> [{ block, line, kind }]
let blocks = 0, scopes = 0, skipped = 0;

function scanScope(body, offset, where, isGlobal, blockNo){
  scopes++;
  const seen = new Map();
  for(const node of body){
    const hits = [];
    if(node.type === 'FunctionDeclaration' && node.id) hits.push([node.id.name, node.loc.start.line, 'function']);
    if(node.type === 'ClassDeclaration'    && node.id) hits.push([node.id.name, node.loc.start.line, 'class']);
    if(node.type === 'VariableDeclaration')
      for(const d of node.declarations)
        if(d.id.type === 'Identifier') hits.push([d.id.name, d.loc.start.line, node.kind]);
    for(const [name, line, kind] of hits){
      const at = { line: offset + line - 1, kind };
      if(!seen.has(name)) seen.set(name, []);
      seen.get(name).push(at);
      if(isGlobal){
        if(!globals.has(name)) globals.set(name, []);
        globals.get(name).push({ block: blockNo, ...at });
      }
    }
  }
  for(const [name, hits] of seen)
    if(hits.length > 1) findings.push({ kind: 'Name', name, where, hits });
}

function walk(node, offset, where){
  if(!node || typeof node !== 'object') return;
  if(Array.isArray(node)){ for(const n of node) walk(n, offset, where); return; }

  if(/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)){
    const label = (node.id && node.id.name) || 'anonym';
    const inner = where + ' > ' + label + '()@' + (offset + node.loc.start.line - 1);
    if(node.body && node.body.type === 'BlockStatement') scanScope(node.body.body, offset, inner, false);
    for(const k in node){ if(/^(loc|start|end)$/.test(k)) continue; walk(node[k], offset, inner); }
    return;
  }

  if(node.type === 'ObjectExpression'){
    const keys = new Map();
    for(const p of node.properties){
      if(p.type !== 'Property' || p.computed) continue;
      const k = p.key.type === 'Identifier' ? p.key.name
              : p.key.type === 'Literal'    ? String(p.key.value) : null;
      if(k == null) continue;
      if(!keys.has(k)) keys.set(k, []);
      keys.get(k).push({ line: offset + p.loc.start.line - 1, kind: p.kind });
    }
    for(const [k, props] of keys){
      if(props.length < 2) continue;
      // get+set auf denselben Namen ist ein PAAR, kein Konflikt — das Spiel
      // benutzt das (`get candles()` / `set candles(v)` in der Chart-Bruecke).
      // Erst zwei init, zwei get oder zwei set ueberschreiben einander still.
      // Diese Unterscheidung fehlte im ersten Wurf und erzeugte prompt einen
      // Fehlalarm. Ein Check, der falschen Alarm schlaegt, wird ignoriert —
      // und ist damit so wertlos wie einer, der nichts findet.
      const n = { init: 0, get: 0, set: 0 };
      for(const p of props) n[p.kind]++;
      if(n.init > 1 || n.get > 1 || n.set > 1)
        findings.push({ kind: 'Objektschluessel', name: k, where: where + ' > Objektliteral', hits: props });
    }
  }

  for(const k in node){ if(/^(loc|start|end)$/.test(k)) continue; walk(node[k], offset, where); }
}

let m;
while((m = re.exec(html))){
  blocks++;
  const offset = html.slice(0, m.index).split('\n').length;
  let ast;
  try {
    ast = acorn.parse(m[2], { ecmaVersion: 2022, locations: true });
  } catch (e) {
    // Nicht still verschlucken: ein unparsbarer Block ist ein Loch in der
    // Abdeckung. Der Parse-Check in ci.yml faengt ihn ohnehin.
    console.log('  ?? Block #' + blocks + ' nicht parsbar, uebersprungen: ' + e.message);
    skipped++;
    continue;
  }
  scanScope(ast.body, offset, 'Block #' + blocks + ', oberste Ebene', true, blocks);
  walk(ast.body, offset, 'Block #' + blocks);
}

// Blockuebergreifend: zwei <script>-Bloecke mit je einem `function foo` auf
// oberster Ebene kollidieren genauso still wie zwei im selben Block.
for(const [name, hits] of globals){
  if(hits.length < 2) continue;
  if(new Set(hits.map(h => h.block)).size < 2) continue;   // gleicher Block: oben schon gemeldet
  findings.push({ kind: 'Name', name,
    where: 'blockuebergreifend (gemeinsamer globaler Scope)', hits });
}

for(const f of findings){
  const silent = f.kind === 'Objektschluessel' || f.hits.every(h => h.kind === 'function');
  const at = f.hits.map(h => (h.block ? 'Block #' + h.block + ' ' : '') + 'Zeile ' + h.line + ' (' + h.kind + ')').join('  ·  ');
  console.error('  ' + (silent ? 'STILL' : 'LAUT ') + '  ' + f.kind + ' ' + f.name + '\n          ' + at + '\n          ' + f.where);
}

if(findings.length === 0){
  console.log('Keine Namenskollisionen. ' + blocks + ' Bloecke, '
    + scopes.toLocaleString('de-DE') + ' Scopes geprueft'
    + (skipped ? ', ' + skipped + ' uebersprungen' : '') + '.');
  process.exit(0);
}

console.error('\n' + findings.length + ' Kollision(en) in ' + FILE + '.');
console.error('STILL heisst: die spaetere Deklaration gewinnt und die fruehere ist toter');
console.error('Code — auch wenn an ihrer Stelle etwas anderes steht. Es bleibt GENAU EINE');
console.error('Fassung. Welche, entscheidet das Verhalten, nicht die Reihenfolge im Text.');
process.exit(1);
