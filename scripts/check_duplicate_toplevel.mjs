/* Namenskollisionen auf oberster Ebene in ChartRunner_Prototype.html.
 *
 * Anlass: v1.0.874 brachte ein zweites `_crFmtSol` mit, im selben Skriptblock
 * wie das bestehende der Wallet-Guthaben-Anzeige. Zwei Funktionsdeklarationen
 * desselben Namens kollidieren NICHT laut — die spaetere gewinnt, still. Die
 * Swap-Tafel benutzte also nie den Formatierer, den sie mitgebracht hat, und
 * kein Browser, kein Parse-Check und kein Browser-Test konnte das melden:
 * die Datei ist gueltiges JavaScript, sie tut nur etwas anderes als dasteht.
 *
 * Harmlos war das nur zufaellig. Verschiebt jemand einen der beiden Bloecke,
 * kippt die Anzeige der jeweils anderen Stelle stillschweigend um.
 *
 * Der Check unterscheidet zwei Faelle:
 *   STILL — nur Funktionsdeklarationen. Legal, lautlos, gewinnt die spaetere.
 *           Das ist der gefaehrliche Fall und der Grund fuer dieses Skript.
 *   LAUT  — mindestens ein const/let/class beteiligt. Die Laufzeit wirft von
 *           selbst; hier steht es nur der Vollstaendigkeit halber.
 *
 * Geprueft wird JEDER Skriptblock UND die Bloecke gegeneinander: alle teilen
 * sich denselben globalen Scope.
 *
 * Braucht `acorn` (nur hier, nur in CI — die Spieldatei bleibt abhaengigkeitsfrei):
 *   npm i acorn --no-save && node scripts/check_duplicate_toplevel.mjs
 */
import fs from 'node:fs';
import * as acorn from 'acorn';

const FILE = 'ChartRunner_Prototype.html';
const html = fs.readFileSync(FILE, 'utf8');

// Dieselbe Regex wie der Parse-Check in ci.yml — bewusst identisch, damit
// beide Checks ueber DIESELBEN Bloecke reden (es sind 7, nicht 8: Bloecke mit
// src= sind keine Inline-Bloecke).
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;

const seen = new Map();   // name -> [{ block, line, kind }]
let m, blocks = 0, skipped = 0;

while((m = re.exec(html))){
  blocks++;
  const body = m[2];
  const offset = html.slice(0, m.index).split('\n').length;
  let ast;
  try {
    ast = acorn.parse(body, { ecmaVersion: 2022, locations: true });
  } catch (e) {
    // Nicht still verschlucken: ein unparsbarer Block ist ein Loch in der
    // Abdeckung. Der Parse-Check in ci.yml faengt ihn ohnehin.
    console.log('  ?? Block #' + blocks + ' nicht parsbar, uebersprungen: ' + e.message);
    skipped++;
    continue;
  }
  for(const node of ast.body){
    const hits = [];
    if(node.type === 'FunctionDeclaration' && node.id) hits.push([node.id.name, node.loc.start.line, 'function']);
    if(node.type === 'ClassDeclaration'    && node.id) hits.push([node.id.name, node.loc.start.line, 'class']);
    if(node.type === 'VariableDeclaration')
      for(const d of node.declarations)
        if(d.id.type === 'Identifier') hits.push([d.id.name, d.loc.start.line, node.kind]);
    for(const [name, line, kind] of hits){
      if(!seen.has(name)) seen.set(name, []);
      seen.get(name).push({ block: blocks, line: offset + line - 1, kind });
    }
  }
}

let silent = 0, loud = 0;
for(const [name, hits] of seen){
  if(hits.length < 2) continue;
  const isSilent = hits.every(h => h.kind === 'function');
  isSilent ? silent++ : loud++;
  const where = hits.map(h => 'Block #' + h.block + ' Zeile ' + h.line + ' (' + h.kind + ')').join('  ·  ');
  console.error('  ' + (isSilent ? 'STILL' : 'LAUT ') + '  ' + name + '\n          ' + where);
}

if(silent + loud === 0){
  console.log('Keine Namenskollisionen. ' + blocks + ' Bloecke geprueft'
    + (skipped ? ', ' + skipped + ' uebersprungen' : '') + '.');
  process.exit(0);
}

console.error('\n' + (silent + loud) + ' Namenskollision(en) auf oberster Ebene in ' + FILE + '.');
console.error('Eine STILLE Kollision heisst: die spaetere Deklaration gewinnt und die');
console.error('fruehere ist toter Code — auch wenn an ihrer Stelle etwas anderes steht.');
console.error('Es bleibt GENAU EINE Fassung. Welche, entscheidet das Verhalten, nicht die Reihenfolge.');
process.exit(1);
