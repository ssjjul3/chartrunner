#!/usr/bin/env python3
# ChartRunner — append campaign levels 64-100 (chapter ids 71-107) across 3 new Acts.
# Surgical, anchor-based splice into ChartRunner_Prototype.html.
import sys, re, io, os

HTML = sys.argv[1] if len(sys.argv) > 1 else "ChartRunner_Prototype.html"

# ---------------------------------------------------------------------------
# Tool step templates (mirror the game's existing complete-predicate idioms).
# ---------------------------------------------------------------------------
def esc(s):
    # For single-quoted JS strings.
    return s.replace("\\", "\\\\").replace("'", "\\'")

def choose(tool):
    labels = {
        'trendline':'Trendline','parChannel':'Parallel Channel','rect':'Rectangle',
        'triangle':'Triangle','fibRetrace':'Fib Retracement','hline':'HLine',
        'barPattern':'Bar Pattern',
    }
    lt = tool
    if tool == 'hline':
        cond = "game.laserTool === 'hLine' || game.laserTool === 'hline'"
    elif tool == 'fibRetrace':
        cond = "game.laserTool === 'fibRetrace'"
    else:
        cond = "game.laserTool === '%s'" % lt
    extra = ' (Fib tools live in the Red Laser menu.)' if tool == 'fibRetrace' else ''
    txt = 'Press hotkey 2 → %s.%s' % (labels[tool], extra)
    return ("{ kind:'choose', text:'%s', complete:()=> { try { return game && (%s); } catch(_){ return false; } } }"
            % (esc(txt), cond))

def anchor1(text):
    return ("{ kind:'execute', text:'%s', complete:(b)=> { try { return !!(game && game.laserAnchor1); } catch(_){ return false; } } }"
            % esc(text))

def placed(tool, text):
    P = {
      'trendline': "(game.tvOverlays||[]).filter(o => o.tool === 'trendline' || o.kind === 'trendline').length > (b.trendlines||0)",
      'parChannel':"(game.tvOverlays||[]).filter(o => o.tool === 'parChannel' || o.kind === 'parChannel').length > (b.channels||0)",
      'rect':      "(game.tvOverlays||[]).filter(o => o.tool === 'rect' || o.kind === 'rect').length > (b.rects||0)",
      'triangle':  "(game.tvOverlays||[]).some(o => o.tool === 'triangle' || o.kind === 'triangle')",
      'fibRetrace':"(game.tvOverlays||[]).filter(o => o.tool === 'fibRetrace' || o.kind === 'fibRetrace').length > (b.fibs||0)",
      'hline':     "(game.anchorLines||[]).filter(l => !l.tradeKind || l.tradeKind === 'market' || l.tradeKind === 'hline').length > (b.hlines||0)",
      'barPattern':"(game.tvOverlays||[]).some(o => o.tool === 'barPattern' || o.kind === 'barPattern')",
    }
    return ("{ kind:'execute', text:'%s', complete:(b)=> { try { return %s; } catch(_){ return false; } } }"
            % (esc(text), P[tool]))

def explain(text):
    return "{ kind:'explain', text:'%s' }" % esc(text)

# A "draw" describes one tool the player uses in a lesson.
#   tool, choose_lead (optional extra sentence prepended is not used — choose text fixed),
#   a1 (anchor1 text or None), pl (placed text)
def draw_steps(tool, a1, pl):
    out = [choose(tool)]
    if a1:
        out.append(anchor1(a1))
    out.append(placed(tool, pl))
    return out

# ---------------------------------------------------------------------------
# Curriculum data. Each lesson:
#   id, disp, act, name, goal, tip, loadout(list), desc(card), tag(card),
#   explains(list of text), draws(list of (tool,a1,pl))
# ---------------------------------------------------------------------------
L = []
def add(**k): L.append(k)

# ===== ACT VII · CANDLES & DOJI (disp 64-75, id 71-82) =====
DOJI_TIP = "Hotkey 2 → Bar Pattern → click the candle to stamp it."
def candle(id,disp,name,goal,e1,e2,marktxt):
    add(id=id,disp=disp,act=7,name=name,goal=goal,tip=DOJI_TIP,loadout=['barPattern'],
        desc=e1[:64], tag='Lesson',
        explains=[e1,e2],
        draws=[('barPattern', None, marktxt)])

candle(71,64,'Neutral Doji',
  'Mark a Neutral Doji — the indecision candle.',
  'A Doji prints when open and close finish at almost the same price — a tiny body with wicks both sides. It is the market pausing: buyers and sellers fought to a draw.',
  'Context is everything: a Doji after a long trend warns of exhaustion; a Doji inside a range is just noise. Read WHERE it prints, not just that it printed.',
  'Find a candle with a tiny body and click to stamp it.')
candle(72,65,'Long-Legged Doji',
  'Mark a Long-Legged Doji.',
  'A Long-Legged Doji has a tiny body but LONG wicks on both ends — price ranged wildly yet closed where it opened. Maximum indecision plus maximum volatility.',
  'It signals a violent tug-of-war. After a strong move it often marks the turning point where control is about to change hands.',
  'Stamp a doji with long upper AND lower wicks.')
candle(73,66,'Dragonfly Doji',
  'Mark a Dragonfly Doji at support.',
  'A Dragonfly Doji has open, high and close near the TOP with a long lower wick — sellers pushed down hard, buyers rejected it all back up. A bullish reversal tell at support.',
  'The long lower shadow is absorbed demand. Best when it prints into a level, VWAP, or prior swing low — not floating in mid-air.',
  'Stamp a doji with a long lower wick and no upper wick.')
candle(74,67,'Gravestone Doji',
  'Mark a Gravestone Doji at resistance.',
  'A Gravestone Doji is the mirror of Dragonfly: open, low and close near the BOTTOM with a long upper wick. Buyers pushed up, sellers slammed it back. Bearish reversal tell.',
  'The long upper shadow is trapped demand. It bites hardest at resistance, a prior high, or into a supply zone.',
  'Stamp a doji with a long upper wick and no lower wick.')
candle(75,68,'Four-Price Doji',
  'Mark a Four-Price Doji.',
  'A Four-Price Doji is a flat dash — open, high, low and close all at one price. No range at all. It is thin, dead, illiquid tape.',
  'It usually means nobody is trading here. Treat it as a warning about liquidity, not a directional signal.',
  'Stamp the flattest, smallest candle you can find.')
candle(76,69,'Spinning Top',
  'Mark a Spinning Top.',
  'A Spinning Top has a small body centred between two moderate wicks. Like a Doji but with a real (small) body — indecision that leans slightly the way the body closed.',
  'A cluster of Spinning Tops after a trend = momentum bleeding out. One inside a range = business as usual.',
  'Stamp a candle with a small body and wicks on both sides.')
candle(77,70,'Hammer',
  'Mark a Hammer at support.',
  'A Hammer has a small body up top and a long lower wick (2×+ the body), little or no upper wick. Sellers drove price down, buyers hammered it back up by the close. Bullish reversal.',
  'It only counts as a Hammer at the BOTTOM of a down move. The long wick is the story: demand showed up where it mattered.',
  'Stamp a candle with a long lower wick and a small body on top.')
candle(78,71,'Hanging Man',
  'Mark a Hanging Man at the top.',
  'A Hanging Man is the same shape as a Hammer — small body, long lower wick — but it prints at the TOP of an uptrend. It warns that sellers are starting to test lower.',
  'Same candle, opposite location, opposite meaning. This is why candlestick reading is always candle + context.',
  'Stamp a hammer-shaped candle at the top of a rally.')
candle(79,72,'Shooting Star',
  'Mark a Shooting Star at resistance.',
  'A Shooting Star has a small body near the low and a long upper wick at the top of an up move. Buyers ran it up, then got rejected hard. Bearish reversal.',
  'The long upper shadow is failed demand. Strongest into resistance or a prior high, ideally with volume.',
  'Stamp a candle with a long upper wick and a small body at the bottom.')
candle(80,73,'Inverted Hammer',
  'Mark an Inverted Hammer at the bottom.',
  'An Inverted Hammer is the Shooting Star shape — long upper wick, small body — but at the BOTTOM of a down move. It hints buyers are starting to probe higher.',
  'It needs confirmation: a strong green candle after it turns the hint into a signal. Alone it is only a lean.',
  'Stamp a candle with a long upper wick near the bottom of a drop.')
candle(81,74,'Engulfing',
  'Mark an Engulfing pair.',
  'An Engulfing is a two-candle reversal: the second body completely swallows the first. Bullish engulfing = a big green eats a red; bearish = a big red eats a green.',
  'It shows a decisive shift in control in one bar. The bigger the engulfing body and the higher the volume, the more it means.',
  'Stamp the big candle that engulfs the one before it.')
candle(82,75,'Morning / Evening Star',
  'Mark a Star reversal.',
  'A Morning Star is a three-candle bottom: big red, a small indecision candle (the star), then a big green that reclaims. An Evening Star is the top version (green, star, red).',
  'The middle star is the pause; the third candle is the confirmation. It is one of the most reliable classic reversals.',
  'Stamp the small middle "star" candle between the two big ones.')

# ===== ACT VIII · CHART PATTERNS (disp 76-89, id 83-96) =====
def pattern(id,disp,name,goal,tip,loadout,e_list,draws,desc,tag='Lesson'):
    add(id=id,disp=disp,act=8,name=name,goal=goal,tip=tip,loadout=loadout,
        desc=desc,tag=tag,explains=e_list,draws=draws)

pattern(83,76,'Bull Flag',
  'Build a Bull Flag — pole then flag.',
  'Draw the pole with a Trendline, then the flag with a Parallel Channel.',
  ['trendline','parChannel'],
  ['A Bull Flag is a sharp rally (the "pole") followed by a tight, slightly-down drift (the "flag"). It is a continuation pattern — the market resting before the next leg up.',
   'The measured target: project the pole’s height up from the flag’s breakout. Enter on the break of the flag’s upper rail with volume.'],
  [('trendline','Click the base of the rally, then the top — that is the pole.','Click anchor 2 at the top of the pole. The line locks.'),
   ('parChannel','Now Parallel Channel: click the first point of the flag’s upper rail.','Click along the flag, then set the width. The down-drift channel locks.')],
  'A rally (pole) + a tight pullback (flag) — continuation up.')
pattern(84,77,'Bear Flag',
  'Build a Bear Flag — pole then flag.',
  'Draw the drop with a Trendline, then the flag with a Parallel Channel.',
  ['trendline','parChannel'],
  ['A Bear Flag is the inverse: a sharp drop (pole) then a tight, slightly-up drift (flag). Continuation — the market pausing before the next leg down.',
   'Target: project the pole down from the flag’s breakdown. Enter on the break of the flag’s lower rail.'],
  [('trendline','Click the top of the drop, then the bottom — the pole.','Click anchor 2 at the bottom of the pole.'),
   ('parChannel','Now Parallel Channel: click the first point of the flag.','Click along the flag, then set the width. The up-drift channel locks.')],
  'A drop (pole) + a tight bounce (flag) — continuation down.')
pattern(85,78,'Ascending Channel',
  'Draw an Ascending Channel.',
  'Hotkey 2 → Parallel Channel → base anchor 1, anchor 2, then width.',
  ['parChannel'],
  ['An Ascending Channel is price climbing between two parallel up-sloping rails. Lower rail = dynamic support (buy zone); upper rail = dynamic resistance (sell zone).',
   'Buy the lower rail, sell the upper. A break BELOW the lower rail warns the uptrend is done; a break ABOVE = acceleration.'],
  [('parChannel','Click the first higher-low on the lower rail.','Click the next higher-low for the angle, then set the width to the highs.')],
  'Price rising inside two parallel up-rails.')
pattern(86,79,'Descending Channel',
  'Draw a Descending Channel.',
  'Hotkey 2 → Parallel Channel → base anchor 1, anchor 2, then width.',
  ['parChannel'],
  ['A Descending Channel is price falling between two parallel down-sloping rails. Upper rail = sell zone; lower rail = cover/buy zone.',
   'Fade the upper rail short, cover at the lower. A break ABOVE the upper rail is the first sign the downtrend is ending.'],
  [('parChannel','Click the first lower-high on the upper rail.','Click the next lower-high for the angle, then set the width to the lows.')],
  'Price falling inside two parallel down-rails.')
pattern(87,80,'Ascending Triangle',
  'Draw an Ascending Triangle.',
  'Hotkey 2 → Triangle → click the three points.',
  ['triangle'],
  ['An Ascending Triangle is a flat top (equal highs) with a rising lower trendline (higher lows). Buyers keep bidding higher into a fixed ceiling — usually a bullish break up.',
   'Trade the break of the flat top with volume. The pressure of higher lows into resistance is the tell.'],
  [('triangle','Click the flat top twice and the rising low once to outline it.')],
  'Flat top, rising lows — usually breaks up.')
pattern(88,81,'Descending Triangle',
  'Draw a Descending Triangle.',
  'Hotkey 2 → Triangle → click the three points.',
  ['triangle'],
  ['A Descending Triangle is a flat bottom (equal lows) with a falling upper trendline (lower highs). Sellers keep pressing into a fixed floor — usually a bearish break down.',
   'Trade the break of the flat bottom. Lower highs into support is distribution pressure.'],
  [('triangle','Click the flat bottom twice and the falling high once to outline it.')],
  'Flat bottom, falling highs — usually breaks down.')
pattern(89,82,'Symmetrical Triangle',
  'Draw a Symmetrical Triangle.',
  'Hotkey 2 → Triangle → click the three points.',
  ['triangle'],
  ['A Symmetrical Triangle has lower highs AND higher lows converging to an apex. It is a coil — volatility compressing before an expansion, direction still undecided.',
   'Do not guess the break; trade it. The break of a rail with volume picks the side; a failed break back inside is the trap.'],
  [('triangle','Click a high, a low, and the apex to outline the coil.')],
  'Converging highs and lows — a coil before expansion.')
pattern(90,83,'Rising Wedge',
  'Draw a Rising Wedge.',
  'Hotkey 2 → Triangle → outline the converging up-lines.',
  ['triangle'],
  ['A Rising Wedge is two UP-sloping lines converging — price grinds higher but momentum narrows. Despite the up-slope it is usually BEARISH: buyers are running out of steam.',
   'Watch for the break of the lower line. It is strongest after an extended rally.'],
  [('triangle','Click the rising support, the rising resistance, and the apex.')],
  'Converging up-lines — usually a bearish reversal.')
pattern(91,84,'Falling Wedge',
  'Draw a Falling Wedge.',
  'Hotkey 2 → Triangle → outline the converging down-lines.',
  ['triangle'],
  ['A Falling Wedge is two DOWN-sloping lines converging. Despite the down-slope it is usually BULLISH: selling pressure fades as the wedge tightens.',
   'Trade the break of the upper line. Best after a pullback in an uptrend or at the end of a capitulation.'],
  [('triangle','Click the falling resistance, the falling support, and the apex.')],
  'Converging down-lines — usually a bullish reversal.')
pattern(92,85,'Bull Pennant',
  'Build a Bull Pennant — pole then pennant.',
  'Trendline for the pole, then Triangle for the pennant.',
  ['trendline','triangle'],
  ['A Bull Pennant is a strong rally (pole) followed by a tiny symmetrical triangle (pennant). Like a flag, but the consolidation converges instead of drifting parallel.',
   'It is a fast continuation — the pause is short. Break of the pennant projects another pole-length up.'],
  [('trendline','Click the base of the rally, then the top — the pole.','Click anchor 2 at the top of the pole.'),
   ('triangle','Now Triangle: outline the small converging pennant with three clicks.')],
  'A pole + a small converging pennant — continuation.')
pattern(93,86,'Double Top',
  'Mark a Double Top and its neckline.',
  'HLine at the twin highs, then a Trendline for the neckline.',
  ['hline','trendline'],
  ['A Double Top is two peaks at roughly the same price with a valley between — an "M". Buyers failed twice at one level; supply is winning. Bearish reversal.',
   'The signal is the break of the neckline (the valley low). Target = the height of the pattern projected down from the neckline.'],
  [('hline','Click at the price of the twin peaks to pin the resistance.'),
   ('trendline','Now Trendline: draw the neckline across the valley between the peaks.','Click anchor 2 to lock the neckline.')],
  'Two equal peaks (an "M") — bearish reversal.')
pattern(94,87,'Double Bottom',
  'Mark a Double Bottom and its neckline.',
  'HLine at the twin lows, then a Trendline for the neckline.',
  ['hline','trendline'],
  ['A Double Bottom is two troughs at roughly the same price — a "W". Sellers failed twice at one level; demand is winning. Bullish reversal.',
   'The signal is the break of the neckline (the peak between the lows). Target = pattern height projected up.'],
  [('hline','Click at the price of the twin lows to pin the support.'),
   ('trendline','Now Trendline: draw the neckline across the peak between the lows.','Click anchor 2 to lock the neckline.')],
  'Two equal troughs (a "W") — bullish reversal.')
pattern(95,88,'Head & Shoulders',
  'Build a Head & Shoulders.',
  'Trendline for the neckline, then Bar Pattern to mark the head.',
  ['trendline','barPattern'],
  ['A Head & Shoulders is three peaks: a left shoulder, a higher head, then a lower right shoulder. It maps a trend that made a higher high and then failed to. Bearish reversal.',
   'The trade is the break of the neckline drawn under the two armpits. Target = head-to-neckline height projected down.'],
  [('trendline','Draw the neckline: click under the left armpit, then the right armpit.','Click anchor 2 to lock the neckline.'),
   ('barPattern','Now Bar Pattern: stamp the highest candle — the head.')],
  'Left shoulder, higher head, right shoulder — bearish.')
pattern(96,89,'Inverse Head & Shoulders',
  'Build an Inverse Head & Shoulders.',
  'Trendline for the neckline, then Bar Pattern to mark the head.',
  ['trendline','barPattern'],
  ['An Inverse Head & Shoulders is the bottom version: a trough, a lower trough (the head), then a higher trough. A downtrend that made a lower low and failed to continue. Bullish reversal.',
   'Trade the break ABOVE the neckline across the two peaks. Target = head-to-neckline height projected up.'],
  [('trendline','Draw the neckline: click above the left peak, then the right peak.','Click anchor 2 to lock the neckline.'),
   ('barPattern','Now Bar Pattern: stamp the lowest candle — the head.')],
  'Trough, lower head, higher trough — bullish.')

# ===== ACT IX · ADVANCED & SMART MONEY (disp 90-100, id 97-107) =====
def adv(id,disp,name,goal,tip,loadout,e_list,draws,desc,tag='Lesson'):
    add(id=id,disp=disp,act=9,name=name,goal=goal,tip=tip,loadout=loadout,
        desc=desc,tag=tag,explains=e_list,draws=draws)

adv(97,90,'Wyckoff Accumulation',
  'Map a Wyckoff Accumulation range.',
  'Rectangle for the trading range, then HLine for the spring.',
  ['rect','hline'],
  ['Wyckoff Accumulation is a sideways range where smart money quietly buys from panicked sellers. It runs in phases A–E: selling climax, automatic rally, secondary test, then the spring.',
   'The "spring" is the key: a false break below support that sweeps stops and immediately reclaims. It is the last shakeout before markup.'],
  [('rect','Click one corner of the sideways range.','Click the opposite corner to box the whole accumulation range.'),
   ('hline','Now HLine: pin the support level where the spring pokes below and reclaims.')],
  'The sideways base where smart money buys — spring = go.')
adv(98,91,'Wyckoff Distribution',
  'Map a Wyckoff Distribution range.',
  'Rectangle for the range, then HLine for the UTAD.',
  ['rect','hline'],
  ['Wyckoff Distribution is the top version: a range where smart money sells into euphoric buyers before markdown. Phases mirror accumulation, upside-down.',
   'The tell is the UTAD — Upthrust After Distribution: a false break ABOVE resistance that sweeps breakout buyers, then fails back inside. The trap before the drop.'],
  [('rect','Click one corner of the topping range.','Click the opposite corner to box the whole distribution range.'),
   ('hline','Now HLine: pin the resistance where the UTAD pokes above and fails back.')],
  'The topping range where smart money sells — UTAD = go.')
adv(99,92,'Elliott Impulse (1-5)',
  'Trace an Elliott 5-wave impulse.',
  'Hotkey 2 → Trendline → connect the swing that runs with the trend.',
  ['trendline'],
  ['Elliott Wave says trends move in five waves: 1 up, 2 back, 3 (the strongest, never the shortest), 4 back, 5 final push. Waves 1-3-5 advance; 2-4 correct.',
   'Rules: wave 2 never retraces past wave 1’s start; wave 3 is never the shortest; wave 4 never overlaps wave 1. Break a rule = your count is wrong.'],
  [('trendline','Click the start of wave 1 (the impulse origin).','Click the peak of wave 5 to span the whole impulse leg.')],
  'The five-wave move that builds a trend.')
adv(100,93,'Elliott Correction (A-B-C)',
  'Trace an Elliott A-B-C correction.',
  'Hotkey 2 → Trendline → span the corrective move.',
  ['trendline'],
  ['After a 5-wave impulse comes a 3-wave correction, labelled A-B-C, moving AGAINST the trend. A down, B a partial bounce (the trap), C the final flush.',
   'The A-B-C is where most traders get chopped up — B looks like a resumption but fails. Wait for C to complete before re-joining the main trend.'],
  [('trendline','Click the start of wave A (the top of the impulse).','Click the end of wave C to span the correction.')],
  'The three-wave pullback against the trend.')
adv(101,94,'PO3 · Power of Three',
  'Map the PO3 / AMD cycle.',
  'Rectangle for the manipulation sweep, then HLine for equilibrium.',
  ['rect','hline'],
  ['Power of Three (AMD) breaks a session into three acts: Accumulation (a tight range), Manipulation (a sweep that traps one side), then Distribution (the real move the other way).',
   'The edge: the manipulation leg is a fake-out. Price sweeps liquidity above/below the accumulation range, then reverses into the true distribution direction.'],
  [('rect','Click one corner of the accumulation range, then the opposite — box it.','Extend the box over the manipulation sweep that pokes out of the range.'),
   ('hline','Now HLine: pin the range equilibrium (the midpoint the true move leaves behind).')],
  'Accumulate → manipulate (sweep) → distribute.')
adv(102,95,'Order Block',
  'Mark an Order Block.',
  'Hotkey 2 → Rectangle → box the last opposite candle before the move.',
  ['rect'],
  ['An Order Block is the last down-candle before a strong up-move (or last up-candle before a strong down-move) — the footprint where institutions loaded up. Price often returns to it.',
   'It is a demand/supply zone with intent behind it. A retest of an untested order block is a high-probability entry in the direction of the impulse it launched.'],
  [('rect','Click one corner of the last opposite candle before the impulse.','Click the opposite corner to box the order block zone.')],
  'The institutional candle price returns to.')
adv(103,96,'Fair Value Gap',
  'Mark a Fair Value Gap (FVG).',
  'Hotkey 2 → Rectangle → box the 3-candle imbalance.',
  ['rect'],
  ['A Fair Value Gap is an imbalance: a three-candle sequence where the middle candle runs so fast it leaves a gap between candle 1’s wick and candle 3’s wick. Price was inefficient here.',
   'Markets tend to return to fill inefficiency. An unfilled FVG acts as a magnet and a reaction zone — trade the retest back into it.'],
  [('rect','Click the top of the gap (candle 1 wick).','Click the bottom of the gap (candle 3 wick) to box the imbalance.')],
  'The imbalance gap price comes back to fill.')
adv(104,97,'Liquidity Sweep',
  'Mark a Liquidity Sweep / stop hunt.',
  'HLine at the liquidity level, then Bar Pattern on the sweep candle.',
  ['hline','barPattern'],
  ['Liquidity pools sit just beyond obvious swing highs/lows — that is where stop orders rest. A Liquidity Sweep is a sharp poke past that level to trigger those stops, then a snap back.',
   'The sweep-and-reclaim is the signal: price grabs the liquidity, fails to hold, and reverses. Fade the sweep in the reclaim direction.'],
  [('hline','Click the swing high/low where stops are resting to pin the liquidity level.'),
   ('barPattern','Now Bar Pattern: stamp the candle that sweeps the level and reverses.')],
  'The stop-hunt poke beyond a level, then reversal.')
adv(105,98,'BOS / CHoCH',
  'Mark a Break of Structure / CHoCH.',
  'Trendline along structure, then HLine at the broken level.',
  ['trendline','hline'],
  ['Market structure is the sequence of highs and lows. A Break of Structure (BOS) is trend continuation — a new higher-high in an uptrend. A Change of Character (CHoCH) is the first break the OTHER way — the earliest reversal signal.',
   'CHoCH before BOS: the character change warns the trend may flip; the next structure break confirms the new direction.'],
  [('trendline','Draw along the recent structure — click the swing that defines the trend.','Click anchor 2 to lock the structure line.'),
   ('hline','Now HLine: pin the swing level whose break flips the structure (the CHoCH level).')],
  'The structure break that signals continuation or reversal.')
adv(106,99,'Harmonic · Gartley',
  'Build a Harmonic XABCD with Fibs.',
  'Fib Retracement on the XA leg, then Trendline for the XABCD skeleton.',
  ['fibRetrace','trendline'],
  ['Harmonic patterns (Gartley, Bat, Butterfly, Crab) are five-point XABCD shapes where each leg is a specific Fibonacci ratio. The Gartley completes with a 0.786 retrace of XA at point D.',
   'The D point is the trade: a precise, fib-measured reversal zone. Confluence of multiple fib ratios at D is what gives harmonics their edge.'],
  [('fibRetrace','Click X (the swing origin) as anchor 1.','Click A (the first leg high/low). The fib grid maps the retracements for B and D.'),
   ('trendline','Now Trendline: connect the X-A-B-C-D skeleton — click the start.','Click through to D to lay the XABCD structure.')],
  'The fib-measured XABCD reversal shape.')
adv(107,100,'Confluence Capstone',
  'Stack a full confluence read.',
  'Rectangle for the zone, then Fib Retracement for the confluence.',
  ['rect','fibRetrace'],
  ['The capstone: no single pattern is a trade — CONFLUENCE is. Stack a zone (order block / range), a fib level, structure, and a candle signal so several independent reads point to the same price.',
   'Mark a decision zone, then overlay a fib. Where the zone, the golden 0.618, and a reversal candle line up — that is an A+ setup. One reason is a guess; three is a plan.'],
  [('rect','Click one corner of your decision zone, then the opposite to box it.','Box the zone where you expect price to react.'),
   ('fibRetrace','Now Fib Retracement: click the swing low.','Click the swing high — check whether the 0.618 lands inside your zone.')],
  'Stack zone + fib + structure into one A+ read.')

# ---------------------------------------------------------------------------
# Sanity: ids/disps contiguous & unique
# ---------------------------------------------------------------------------
ids  = [x['id']   for x in L]
disps= [x['disp'] for x in L]
assert ids   == list(range(71,108)),  "ids not 71..107: %r" % ids
assert disps == list(range(64,101)),  "disps not 64..100: %r" % disps
assert len(set(ids))==len(ids) and len(set(disps))==len(disps)

# ---------------------------------------------------------------------------
# Emit: CAMPAIGN_CHAPTERS entries
# ---------------------------------------------------------------------------
def loadout_js(lst): return "[" + ",".join("'%s'"%t for t in lst) + "]"

chapters_block = ["", "    // ── ACT VII · CANDLES & DOJI (v1.0.700 — candlestick reading) ──"]
def chap_line(x):
    return ("    %d: { name:'%s', goal:'%s', tip:'%s', asset:'btc', tf:'15m', indicators:[], loadout:%s, probes:[] },"
            % (x['id'], esc(x['name']), esc(x['goal']), esc(x['tip']), loadout_js(x['loadout'])))
for x in L:
    if x['act']==8 and L[L.index(x)-1]['act']==7:
        chapters_block.append("    // ── ACT VIII · CHART PATTERNS (build them with click guidance) ──")
    if x['act']==9 and L[L.index(x)-1]['act']==8:
        chapters_block.append("    // ── ACT IX · ADVANCED & SMART MONEY ──")
    chapters_block.append(chap_line(x))
CHAPTERS_TEXT = "\n".join(chapters_block)

# ---------------------------------------------------------------------------
# Emit: SCRIPTS entries
# ---------------------------------------------------------------------------
def script_entry(x):
    steps = [explain(t) for t in x['explains']]
    for d in x['draws']:
        tool = d[0]
        if len(d)==2:      # (tool, placed)  — single-click tools
            steps += draw_steps(tool, None, d[1])
        else:              # (tool, anchor1, placed)
            steps += draw_steps(tool, d[1], d[2])
    body = ",\n        ".join(steps)
    return "      %d: [\n        %s,\n      ]," % (x['id'], body)

scripts_block = ["", "      // ── ACT VII–IX lessons (v1.0.700 — doji, chart patterns, advanced) ──"]
for x in L:
    scripts_block.append(script_entry(x))
SCRIPTS_TEXT = "\n".join(scripts_block)

# ---------------------------------------------------------------------------
# Emit: CR_CH_DISPLAY additions
# ---------------------------------------------------------------------------
DISPLAY_ADD = "".join(',"%d":%d'%(x['id'],x['disp']) for x in L)

# ---------------------------------------------------------------------------
# Emit: HTML cards + act headers
# ---------------------------------------------------------------------------
SVG = {
 7: '<svg class="mc-svg" style="--accent:#ffd166;--accent2:#7be3f3" viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="21" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/><rect x="9.5" y="10.5" width="5" height="3" rx="1" fill="none" stroke="var(--accent2)" stroke-width="1.6"/></svg>',
 8: '<svg class="mc-svg" style="--accent:#7be3f3;--accent2:#14f195" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21 L10 5" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/><path d="M10 6 L21 4 L21 12 L10 14 Z" fill="none" stroke="var(--accent2)" stroke-width="1.5" stroke-linejoin="round"/></svg>',
 9: '<svg class="mc-svg" style="--accent:#9b8cff;--accent2:#ffd166" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16 L7 9 L11 14 L15 4 L19 12 L21 8" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="4" r="1.3" fill="var(--accent2)"/></svg>',
}
ACT_HEADERS = {
 7: ('③', 'Act VII · Candles &amp; Doji', '· read the tape — doji, hammers, stars'),
 8: ('④', 'Act VIII · Chart Patterns', '· build them yourself with click guidance'),
 9: ('⑤', 'Act IX · Advanced &amp; Smart Money', '· Wyckoff · Elliott · PO3 · SMC'),
}
def act_header_html(act):
    ic,ti,su = ACT_HEADERS[act]
    return ('              <div class="modeSection cr-act" data-cat="campaign">\n'
            '                <span class="msIcon">%s</span>\n'
            '                <span class="msTitle">%s</span>\n'
            '                <span class="msSub">%s</span>\n'
            '              </div>' % (ic,ti,su))
def card_html(x):
    nm = "Ch.%d · %s" % (x['disp'], x['name'])
    return ('              <button class="modecard" data-cat="campaign" id="modeCampaign%d" data-mode="campaign:%d">\n'
            '                <div class="modeIcon">%s</div>\n'
            '                <div class="modeName">%s</div>\n'
            '                <div class="modeDesc">%s</div>\n'
            '                <div class="modeTag on">%s</div>\n'
            '              </button>' % (x['id'], x['id'], SVG[x['act']], html_esc(nm), html_esc(x['desc']), x['tag']))
def html_esc(s):
    return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

cards = []
prev_act = None
for x in L:
    if x['act']!=prev_act:
        cards.append(act_header_html(x['act']))
        prev_act = x['act']
    cards.append(card_html(x))
CARDS_TEXT = "\n".join(cards)

# ---------------------------------------------------------------------------
# Splice into the file
# ---------------------------------------------------------------------------
src = io.open(HTML, 'r', encoding='utf-8').read()

def must_replace(s, anchor, replacement, label):
    n = s.count(anchor)
    if n != 1:
        raise SystemExit("ANCHOR '%s' found %d times (need 1) — aborting." % (label, n))
    return s.replace(anchor, replacement, 1)

# 1) CAMPAIGN_CHAPTERS — insert after ch53 entry line, before the closing };
ANCHOR_CH = "runs the SAME live chart"  # unique substring inside ch53 line
# locate the full ch53 line and append our block after it
m = re.search(r"^(\s*53: \{ name:'Live Multiplayer'.*\},)\s*$", src, re.M)
if not m: raise SystemExit("could not locate ch53 CAMPAIGN_CHAPTERS line")
src = src[:m.end()] + "\n" + CHAPTERS_TEXT + src[m.end():]

# 2) SCRIPTS — insert before the LEGACY KEYS comment (inside SCRIPTS object)
LEG = "      // ── LEGACY KEYS (archived chapters"
src = must_replace(src, LEG, SCRIPTS_TEXT + "\n" + LEG, "SCRIPTS legacy comment")

# 3) CR_CH_DISPLAY — add keys before the closing brace of the JSON literal
src = must_replace(src, '"51":62,"52":63}', '"51":62,"52":63'+DISPLAY_ADD+'}', "CR_CH_DISPLAY tail")

# 4) _CAMPAIGN_MAX 70 -> 107
src = must_replace(src, "const _CAMPAIGN_MAX = 70;", "const _CAMPAIGN_MAX = 107;", "_CAMPAIGN_MAX")

# 5) CR_CAMPAIGN_CLAIMABLE 67 -> 104
src = must_replace(src, "const CR_CAMPAIGN_CLAIMABLE = 67;", "const CR_CAMPAIGN_CLAIMABLE = 104;", "CR_CAMPAIGN_CLAIMABLE")

# 6) HTML cards — insert before the MINIGAME comment
MINI = "              <!-- ── MINIGAME ─"
src = must_replace(src, MINI, CARDS_TEXT + "\n\n" + MINI, "MINIGAME comment")

# ---------------------------------------------------------------------------
# Write backup + output; dump validation snippets
# ---------------------------------------------------------------------------
bak = HTML + ".bak-newlevels"
if not os.path.exists(bak):
    io.open(bak, 'w', encoding='utf-8').write(io.open(HTML,'r',encoding='utf-8').read())
io.open(HTML, 'w', encoding='utf-8').write(src)

# Validation harness: chapters + scripts in isolation
io.open('/tmp/_val_chapters.js','w',encoding='utf-8').write(
    "var CAMPAIGN_INDICATOR_INTERACTION_TIP='';\nvar CAMPAIGN_CHAPTERS = {\n"+CHAPTERS_TEXT+"\n};\n")
io.open('/tmp/_val_scripts.js','w',encoding='utf-8').write(
    "var game={},sdk={},wb={},window={};\nvar SCRIPTS = {\n"+SCRIPTS_TEXT+"\n};\n")

print("OK: inserted %d lessons (ids %d-%d, display %d-%d)" % (len(L), ids[0],ids[-1],disps[0],disps[-1]))
print("chapters_block lines:", CHAPTERS_TEXT.count(chr(10))+1)
print("scripts_block lines :", SCRIPTS_TEXT.count(chr(10))+1)
print("cards lines         :", CARDS_TEXT.count(chr(10))+1)
print("display_add         :", DISPLAY_ADD[:60], "...")
print("backup              :", bak)
