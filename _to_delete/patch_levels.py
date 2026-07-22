#!/usr/bin/env python3
# ChartRunner audit fixes:
#  1) unique per-card icon for lessons 71-107
#  2) live candlestick-pattern finder: candle lessons (71-82) spawn on + ring the REAL
#     best-fit candle for the taught pattern
#  3) varied spawn offset for pattern/advanced lessons (83-107) so they aren't identical
import sys, re, io, os
HTML = sys.argv[1] if len(sys.argv) > 1 else "ChartRunner_Prototype.html"

# ---------------------------------------------------------------------------
# 1) UNIQUE ICONS  (viewBox 0 0 24 24, matches existing .mc-svg card idiom)
# ---------------------------------------------------------------------------
def svg(acc, acc2, inner):
    return ('<svg class="mc-svg" style="--accent:%s;--accent2:%s" viewBox="0 0 24 24" aria-hidden="true">%s</svg>'
            % (acc, acc2, inner))
def wick(a,b): return '<line x1="12" y1="%s" x2="12" y2="%s" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/>'%(a,b)
def body(t,b): return '<rect x="9" y="%s" width="6" height="%s" rx="1" fill="none" stroke="var(--accent2)" stroke-width="1.6"/>'%(t,b-t)
def P(d,c='--accent',w='1.6',extra=''): return '<path d="%s" fill="none" stroke="var(%s)" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"%s/>'%(d,c,w,(' '+extra) if extra else '')
def R(x,y,w,h,c='--accent',fill='none'): return '<rect x="%s" y="%s" width="%s" height="%s" rx="1" fill="%s" stroke="var(%s)" stroke-width="1.5"/>'%(x,y,w,h,('none' if fill=='none' else fill),c)

G,C,Y,Pk,Vi='#14f195','#7be3f3','#ffd166','#ff5b7f','#9b8cff'
ICON = {
 # --- Doji / candle family (71-82) ---
 71: svg(G,C,  wick(4,20)+body(11,13)),                                   # neutral doji
 72: svg(C,C,  wick(2,22)+body(11,13)),                                   # long-legged
 73: svg(G,G,  wick(7,21)+body(6,8)),                                     # dragonfly (T)
 74: svg(Pk,Pk,wick(3,17)+body(16,18)),                                   # gravestone (inv-T)
 75: svg('#9aa0b5','#9aa0b5', '<line x1="6" y1="12" x2="18" y2="12" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>'),  # four-price dash
 76: svg(Y,Y,  wick(5,19)+body(9,15)),                                    # spinning top
 77: svg(G,G,  wick(5,21)+body(7,10)),                                    # hammer
 78: svg(Pk,Y, wick(5,21)+body(7,10)+P('M3 7 L6 4','--accent2','1.3')),   # hanging man (uptrend hint)
 79: svg(Pk,Pk,wick(3,19)+body(14,17)),                                   # shooting star
 80: svg(G,Y,  wick(3,19)+body(14,17)+P('M3 17 L6 20','--accent2','1.3')),# inverted hammer (downtrend hint)
 81: svg(Pk,G, '<line x1="8" y1="7" x2="8" y2="17" stroke="var(--accent)" stroke-width="1.4"/><rect x="6.4" y="9" width="3.2" height="5" fill="none" stroke="var(--accent)" stroke-width="1.3"/><line x1="16" y1="4" x2="16" y2="20" stroke="var(--accent2)" stroke-width="1.6"/><rect x="13.8" y="6" width="4.4" height="12" fill="none" stroke="var(--accent2)" stroke-width="1.6"/>'), # engulfing
 82: svg(Y,C,  '<line x1="5" y1="6" x2="5" y2="18" stroke="var(--accent2)" stroke-width="1.5"/><rect x="3.4" y="8" width="3.2" height="8" fill="none" stroke="var(--accent2)" stroke-width="1.4"/><line x1="12" y1="3" x2="12" y2="9" stroke="var(--accent)" stroke-width="1.4"/><rect x="10.6" y="5" width="2.8" height="2.6" fill="none" stroke="var(--accent)" stroke-width="1.4"/><line x1="19" y1="6" x2="19" y2="18" stroke="var(--accent2)" stroke-width="1.5"/><rect x="17.4" y="8" width="3.2" height="8" fill="none" stroke="var(--accent2)" stroke-width="1.4"/>'), # star (3-candle)
 # --- Chart patterns (83-96) ---
 83: svg(G,C,  P('M4 21 L10 7','--accent','1.8')+P('M11 8 L18 11 M11 12 L18 15','--accent2','1.4')),   # bull flag
 84: svg(Pk,C, P('M4 4 L10 18','--accent','1.8')+P('M11 17 L18 14 M11 13 L18 10','--accent2','1.4')),  # bear flag
 85: svg(G,G,  P('M3 21 L21 11 M3 15 L21 5')),                            # ascending channel
 86: svg(Pk,Pk,P('M3 3 L21 13 M3 9 L21 19')),                            # descending channel
 87: svg(G,C,  P('M3 5 L21 5','--accent2','1.6')+P('M3 20 L21 6')),       # ascending triangle
 88: svg(Pk,C, P('M3 19 L21 19','--accent2','1.6')+P('M3 4 L21 18')),     # descending triangle
 89: svg(C,C,  P('M3 5 L21 12 M3 19 L21 12')),                            # symmetrical triangle
 90: svg(Pk,Pk,P('M4 21 L21 7 M4 13 L21 9')),                            # rising wedge (bearish)
 91: svg(G,G,  P('M4 3 L21 17 M4 11 L21 15')),                            # falling wedge (bullish)
 92: svg(G,C,  P('M3 21 L9 9','--accent','1.8')+P('M10 6 L19 11 L10 16 Z','--accent2','1.4')),        # pennant
 93: svg(Pk,Y, P('M2 20 L7 6 L11 14 L15 6 L20 20')+P('M2 8 L20 8','--accent2','1.2')),                # double top (M)
 94: svg(G,Y,  P('M2 4 L7 18 L11 10 L15 18 L20 4')+P('M2 16 L20 16','--accent2','1.2')),              # double bottom (W)
 95: svg(Pk,C, P('M2 18 L5 12 L8 15 L12 4 L16 15 L19 12 L22 18')+P('M3 17 L21 17','--accent2','1.2')),# head & shoulders
 96: svg(G,C,  P('M2 6 L5 12 L8 9 L12 20 L16 9 L19 12 L22 6')+P('M3 7 L21 7','--accent2','1.2')),     # inverse H&S
 # --- Advanced / smart money (97-107) ---
 97: svg(C,G,  R(4,8,16,9)+P('M4 17 L7 21 L10 15','--accent2','1.5')),    # wyckoff accumulation (spring)
 98: svg(C,Pk, R(4,8,16,9)+P('M14 8 L17 3 L20 9','--accent2','1.5')),     # wyckoff distribution (UTAD)
 99: svg(Vi,G, P('M3 20 L6 12 L8 16 L13 5 L15 9 L21 2')),                 # elliott impulse 1-5
100: svg(Vi,Pk,P('M3 5 L9 15 L13 9 L21 19')),                            # elliott correction A-B-C
101: svg(Vi,Y, R(3,9,5,6)+R(9.5,5,4,13,'--accent2')+R(16,9,5,6)),        # PO3 A-M-D
102: svg(Vi,G, R(4,12,7,6,'--accent','fill')+P('M12 15 L21 6 M21 6 L21 10 M21 6 L17 6','--accent2','1.4')), # order block
103: svg(Vi,C, R(5,4,4,6)+R(15,14,4,6)+P('M4 11 L20 11 M4 13 L20 13','--accent2','1.2')),             # fair value gap
104: svg(Pk,Y, P('M3 10 L21 10','--accent2','1.4')+P('M8 10 L12 3 L16 10','--accent','1.6')),         # liquidity sweep
105: svg(C,Pk, P('M3 18 L8 12 L11 15 L16 7')+P('M4 10 L20 10','--accent2','1.2')),                    # BOS / CHoCH
106: svg(Vi,C, P('M3 18 L8 5 L12 13 L16 6 L20 16')),                     # harmonic XABCD
107: svg(Y,G,  '<circle cx="12" cy="12" r="8" fill="none" stroke="var(--accent)" stroke-width="1.4"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="var(--accent2)" stroke-width="1.4"/><path d="M9.5 12 l1.8 1.8 L15 9.5" fill="none" stroke="var(--accent2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'), # capstone
}
assert sorted(ICON.keys())==list(range(71,108)), "icon set incomplete"

# ---------------------------------------------------------------------------
# 2/3) JS module: candlestick finder + varied spawn
# ---------------------------------------------------------------------------
JS_MODULE = r"""
  // v1.0.701 — Lesson pattern locator. Candle lessons (71-82) scan live candles for the
  // BEST-FIT example of the taught pattern, spawn the player on it, and expose it as the
  // anchor-guide ring target (window.__crLessonTarget). Pattern/advanced lessons (83-107)
  // get a per-id spawn offset so they don't all start on the same window. Pure o/h/l/c math.
  window.crLessonPattern = (function(){
    var MAP={71:'doji',72:'longleg',73:'dragonfly',74:'gravestone',75:'fourprice',76:'spintop',
             77:'hammer',78:'hangman',79:'shootstar',80:'invhammer',81:'engulf',82:'star'};
    function clamp(x){ return Math.max(0,Math.min(1,x)); }
    function F(c){ var rng=Math.max(1e-9,c.h-c.l), bd=Math.abs(c.c-c.o);
      return { rng:rng, rrel:rng/Math.max(1e-9,c.c), b:bd/rng,
               up:(c.h-Math.max(c.o,c.c))/rng, lo:(Math.min(c.o,c.c)-c.l)/rng, bull:c.c>=c.o }; }
    function trend(cs,i){ var a=cs[Math.max(0,i-6)], b=cs[i]; if(!a||!b) return 0; return (b.c-a.c)/Math.max(1e-9,a.c); }
    function single(cs,i,key){ var f=F(cs[i]), t=trend(cs,i);
      switch(key){
        case 'doji':       return 1-clamp(f.b/0.12);
        case 'longleg':    return (f.b<0.20?1:0)*clamp(Math.min(f.up,f.lo)/0.35);
        case 'dragonfly':  return (f.b<0.22?1:0)*clamp((f.lo-0.55)/0.40)*(1-clamp(f.up/0.15));
        case 'gravestone': return (f.b<0.22?1:0)*clamp((f.up-0.55)/0.40)*(1-clamp(f.lo/0.15));
        case 'fourprice':  return 1-clamp(f.rrel/0.0015);
        case 'spintop':    return (f.b<0.45&&f.b>0.05?1:0)*clamp(Math.min(f.up,f.lo)/0.22);
        case 'hammer':     return clamp((f.lo-0.50)/0.40)*(1-clamp(f.up/0.18))*(f.b<0.45?1:0)*clamp(0.4-t/0.012);
        case 'hangman':    return clamp((f.lo-0.50)/0.40)*(1-clamp(f.up/0.18))*(f.b<0.45?1:0)*clamp(0.4+t/0.012);
        case 'shootstar':  return clamp((f.up-0.50)/0.40)*(1-clamp(f.lo/0.18))*(f.b<0.45?1:0)*clamp(0.4+t/0.012);
        case 'invhammer':  return clamp((f.up-0.50)/0.40)*(1-clamp(f.lo/0.18))*(f.b<0.45?1:0)*clamp(0.4-t/0.012);
      }
      return 0;
    }
    function priceOf(c,key){
      if(key==='dragonfly'||key==='hammer'||key==='hangman') return c.l;
      if(key==='gravestone'||key==='shootstar'||key==='invhammer') return c.h;
      return (c.h+c.l)/2;
    }
    function apply(num, cs){
      try{
        window.__crLessonTarget=null;
        if(!cs || cs.length<12) return null;
        var key=MAP[num];
        if(key){
          var best=-1, bi=-1;
          if(key==='engulf'){
            for(var i=1;i<cs.length;i++){ var p=cs[i-1],c=cs[i];
              var pb=Math.abs(p.c-p.o), cb=Math.abs(c.c-c.o);
              var eng=(cb>pb*1.1)&&((c.c>=c.o)!==(p.c>=p.o))&&(Math.max(c.o,c.c)>=Math.max(p.o,p.c))&&(Math.min(c.o,c.c)<=Math.min(p.o,p.c));
              var sc=eng? cb/Math.max(1e-9,cb+pb) : 0; if(sc>best){best=sc;bi=i;} }
          } else if(key==='star'){
            for(var i=2;i<cs.length;i++){ var a=cs[i-2],m=cs[i-1],z=cs[i];
              var ab=Math.abs(a.c-a.o), mb=Math.abs(m.c-m.o), zb=Math.abs(z.c-z.o), mr=Math.max(1e-9,m.h-m.l);
              var sc=((mb/mr<0.4)&&(ab>mb*1.3)&&(zb>mb*1.3)&&((a.c>=a.o)!==(z.c>=z.o)))?1:((mb/mr<0.4)?0.3:0);
              if(sc>best){best=sc;bi=i-1;} }
          } else {
            for(var i=6;i<cs.length-1;i++){ var sc=single(cs,i,key); if(sc>best){best=sc;bi=i;} }
          }
          if(bi<0) return null;
          window.__crLessonTarget={ idx:bi, price:priceOf(cs[bi],key) };
          return bi;
        }
        if(num>=83 && num<=107){ var off=50+((num*17)%160); return Math.max(6, cs.length-off); }
        return null;
      }catch(_){ window.__crLessonTarget=null; return null; }
    }
    return { apply:apply, MAP:MAP };
  })();
"""

# ---------------------------------------------------------------------------
# Splice
# ---------------------------------------------------------------------------
src = io.open(HTML,'r',encoding='utf-8').read()
orig = src

def repl_once(s, pat, rep, label, flags=0):
    new, n = re.subn(pat, rep, s, count=1, flags=flags)
    if n != 1: raise SystemExit("PATCH '%s' matched %d times (need 1)" % (label, n))
    return new

# (a) per-card icons
for i in range(71,108):
    pat = r'(id="modeCampaign%d" data-mode="campaign:%d">\s*<div class="modeIcon">).*?(</div>)' % (i,i)
    src = repl_once(src, pat, lambda m,i=i: m.group(1)+ICON[i].replace('\\','\\\\') +m.group(2),
                    "icon %d"%i, re.S)

# (b) inject JS module before `const _CAMPAIGN_MAX = 107;`
src = repl_once(src, r'(\n  const _CAMPAIGN_MAX = 107;)', JS_MODULE.rstrip('\n')+r'\1', "module inject")

# (c) reposition block -> use finder
src = repl_once(src,
    r'const targetIdx = Math\.max\(0, candles\.length - 50\);\n(\s*)const targetWx = targetIdx \* STEP \+ STEP/2;',
    r'''let targetIdx = Math.max(0, candles.length - 50);
\1try { var _lt = (window.crLessonPattern && window.crLessonPattern.apply(num, candles)); if(typeof _lt === 'number' && isFinite(_lt)) targetIdx = _lt; } catch(_){}
\1const targetWx = targetIdx * STEP + STEP/2;''',
    "reposition")

# (d) pickSwing: prefer lesson target
src = repl_once(src,
    r'(function pickSwing\(skip\)\{\n\s*try \{\n\s*skip = skip \|\| 0;)',
    r"""\1
        try { var _lt2=window.__crLessonTarget; if(_lt2 && _lt2.idx!=null && typeof sX==='function'){ var _sx2=sX(_lt2.idx*STEP+STEP/2); if(_sx2>40 && _sx2<window.innerWidth-40) return {idx:_lt2.idx, price:_lt2.price}; } } catch(_){}""",
    "pickSwing")

# (e) clear target on launch
src = repl_once(src, r'(\n\s*)(game\.campaignChapter = num;)',
                r'\1try{ window.__crLessonTarget=null; }catch(_){}\1\2', "clear target")

# write
bak = HTML + '.bak-audit'
if not os.path.exists(bak): io.open(bak,'w',encoding='utf-8').write(orig)
io.open(HTML,'w',encoding='utf-8').write(src)

# isolate the module for a node --check
io.open('/tmp/_val_module.js','w',encoding='utf-8').write("var window={};\n"+JS_MODULE)
print("OK: icons replaced 71-107, JS module + reposition/pickSwing/clear patched")
print("distinct icons:", len(set(ICON.values())), "of", len(ICON))
