/* Keine NEUEN Fremdcode-Quellen in ChartRunner_Prototype.html.
 *
 * Die Single-File-Regel sagt „kein CDN". Wahr ist das nicht — Eintraege stehen
 * seit Langem drin, und ein Guard, der behauptet es gaebe keine, ist genauso
 * wertlos wie gar keiner. Also zaehlt dieser hier sie namentlich auf, mit
 * Grund und Fundstelle, und schlaegt an, sobald ein NEUER dazukommt.
 *
 * Eine Regel, die an mehreren Stellen gebrochen wird, leitet nichts mehr — sie
 * wird zu etwas, um das man herumbaut. Genau das ist hier passiert.
 *
 * v1.0.891: DREI wurden ZWEI. unpkg.com (@solana/web3.js, 270 KB, statisches
 * <script src>, geladen bei JEDEM Seitenaufruf) ist raus — der Anker-Bau ist
 * in den tx-Worker gezogen, genau der Abloesepfad, der in diesem Eintrag
 * stand. Die Zeile wird deshalb gestrichen und nicht auf null gesetzt: sie zu
 * behalten hiesse, den Host wieder zuzulassen. Entfernen ist erlaubt,
 * Hinzufuegen verboten — und mit ihr faellt das letzte statische <script src>.
 *
 * WAS GEZAEHLT WIRD: Hosts, von denen ausfuehrbarer Code geladen wird — per
 * <script src> oder zur Laufzeit injiziert. NICHT gezaehlt werden Daten-APIs
 * (Jupiter, Dexscreener, Solana-RPC): die liefern JSON, keinen Code, und sie
 * gehoeren zum Betrieb. Der Unterschied ist der Punkt — Fremdcode laeuft mit
 * unseren Rechten, fremdes JSON nicht.
 *
 * Aufruf:  node scripts/check_no_new_cdn.mjs
 */
import fs from 'node:fs';

const FILE = 'ChartRunner_Prototype.html';
const html = fs.readFileSync(FILE, 'utf8');

/* Die zwei verbliebenen Altlasten. Jede mit Grund — wer eine entfernt,
 * streicht ihre Zeile und macht den Guard damit strenger. Wer eine hinzufuegt,
 * muss hier begruenden, und das ist Absicht: die Begruendung ist die
 * eigentliche Huerde.
 *
 * v1.0.891 gestrichen: unpkg.com / @solana/web3.js. Der Eintrag nannte als
 * Abloesung „Bau in einen Worker verlegen, wie beim tx-Worker" — genau das ist
 * passiert. */
const ERLAUBT = [
  { host: 'cdn.jsdelivr.net',
    was:  '@supabase/supabase-js — Konten-Schicht (crAccount)',
    wie:  'zur Laufzeit injiziert, nur wenn ein Konto gebraucht wird',
    weg:  'offen' },
  { host: 'cdnjs.cloudflare.com',
    was:  'pdf.js — PDF-Anzeige',
    wie:  'zur Laufzeit injiziert, erst beim ersten PDF',
    weg:  'offen' },
];

/* Hosts, die AUSSCHLIESSLICH Daten liefern. Stehen hier, damit niemand sie
 * versehentlich als Fremdcode zaehlt — und damit auffaellt, wenn jemand von
 * einem davon plötzlich Code laedt. */
const DATEN_APIS = [
  'generativelanguage.googleapis.com',   // Gemini, JSON
];

const CODE_HOSTS = /\b((?:[a-z0-9-]+\.)*(?:unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|esm\.sh|skypack\.dev|jspm\.io|cdn\.skypack\.dev|googleapis\.com|gstatic\.com))\b/gi;

const erlaubteHosts = new Set(ERLAUBT.map(e => e.host));
const datenHosts    = new Set(DATEN_APIS);

const gefunden = new Map();
let m;
while((m = CODE_HOSTS.exec(html))){
  const host = m[1].toLowerCase();
  gefunden.set(host, (gefunden.get(host) || 0) + 1);
}

const neu = [...gefunden.keys()].filter(h => !erlaubteHosts.has(h) && !datenHosts.has(h));
const verschwunden = [...erlaubteHosts].filter(h => !gefunden.has(h));

/* Ein statisches <script src> ist teurer als ein injiziertes: es laedt immer,
 * blockiert potenziell, und der Host sieht jeden Seitenaufruf. Deshalb wird es
 * getrennt gezaehlt — seit v1.0.891 sind es NULL, und genau das soll auffallen,
 * sobald wieder eines dazukommt. Die Schranke steht deshalb jetzt bei 0 und
 * nicht mehr bei 1: eine Grenze, die den aktuellen Stand nicht beschreibt,
 * meldet den ersten Rueckfall nicht. */
const statisch = [...html.matchAll(/<script[^>]*\bsrc="(https?:\/\/[^"]+)"/gi)].map(x => x[1]);

console.log('Fremdcode-Quellen in ' + FILE + ':');
for(const e of ERLAUBT){
  const n = gefunden.get(e.host) || 0;
  console.log('  ' + (n ? '·' : '?') + ' ' + e.host.padEnd(24) + (n ? n + 'x' : 'nicht mehr gefunden'));
  console.log('      ' + e.was);
  console.log('      ' + e.wie);
  if(e.weg !== 'offen') console.log('      Ablösung: ' + e.weg);
}
console.log('  Statische <script src>: ' + statisch.length
  + (statisch.length ? ' → ' + statisch.map(u => u.replace(/^https?:\/\//, '').slice(0, 46)).join(', ') : ''));

if(verschwunden.length){
  console.log('\nHinweis: ' + verschwunden.join(', ') + ' steht in der Liste, aber nicht mehr in der Datei.');
  console.log('Wenn das Absicht war: Zeile in ERLAUBT streichen — der Guard wird dadurch strenger.');
}

if(statisch.length > 0){
  console.error('\nFEHLER: ' + statisch.length + ' statische <script src>. Erlaubt sind seit v1.0.891 keine.');
  console.error('Ein statisches Tag laedt bei JEDEM Seitenaufruf. Zur Laufzeit injizieren oder in einen Worker verlegen.');
  process.exit(1);
}

if(neu.length === 0){
  console.log('\nKeine neue Fremdcode-Quelle. ' + ERLAUBT.length + ' dokumentierte Altlasten.');
  process.exit(0);
}

console.error('\nFEHLER: neue Fremdcode-Quelle(n): ' + neu.join(', '));
console.error('Die Spieldatei laedt Code nur aus den ' + ERLAUBT.length + ' dokumentierten Quellen.');
console.error('Fremdcode laeuft mit unseren Rechten — bei einer Datei, die Transaktionen zum');
console.error('Signieren vorlegt, ist das keine Stilfrage.');
console.error('Wenn es wirklich sein muss: Eintrag in ERLAUBT aufnehmen, MIT Grund und');
console.error('Ablösepfad. Die Begruendung ist die Huerde, nicht die Liste.');
process.exit(1);
