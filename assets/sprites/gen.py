# -*- coding: utf-8 -*-
"""ChartRunner original sprite generator — 100% original pixel art.
All grids hand-authored in-session. Palette = ChartRunner terminal aesthetic."""
from PIL import Image, ImageDraw, ImageFont
import math, os, json

PAL = {
 'G':'#14F195','g':'#0FC17A','D':'#0A8F5B','L':'#BFF7DF','K':'#05070D',
 'W':'#FFFFFF','R':'#FF5C5C','r':'#B23A48','Y':'#FFD166','y':'#C9973A',
 'B':'#4DA6FF','b':'#2A6FBF','O':'#FF9C41','k':'#1A1F2B',
 # Live-Client-Farben (v1.0.639): Boss-Pink, Loot-Cyan, $CHART-Lila
 'P':'#FF5B7F','p':'#C24463','C':'#22D3EE','c':'#157F97','V':'#B57BFF','v':'#7C4DBF',
}

S = {}  # name -> list of frame grids

# ---------- BULL (Bull Dash player) 16x12 ----------
BULL_RUN_A = [
'..........WW..WW',
'...........WGGW.',
'.g.........GGGG.',
'.gg....GGGGGGGG.',
'..g..GGGGGGGGGG.',
'..gGGGGGGGGKGGG.',
'...GGGGGGGGGGGGL',
'...gGGGGGGGGGgD.',
'...GG..gg...GG..',
'...GG.......GG..',
'...gg.......gg..',
'................',
]
BULL_RUN_B = [
'..........WW..WW',
'...........WGGW.',
'.g.........GGGG.',
'.gg....GGGGGGGG.',
'..g..GGGGGGGGGG.',
'..gGGGGGGGGKGGG.',
'...GGGGGGGGGGGGL',
'...gGGGGGGGGGgD.',
'....GG.....GG...',
'.....GG...GG....',
'......gg.gg.....',
'................',
]
BULL_JUMP = [
'..........WW..WW',
'...........WGGW.',
'.g.........GGGG.',
'.gg....GGGGGGGG.',
'..g..GGGGGGGGGG.',
'..gGGGGGGGGKGGG.',
'...GGGGGGGGGGGGL',
'...gGGGGGGGGGgD.',
'....gGG...GGg...',
'.....gg...gg....',
'................',
'................',
]
BULL_DUCK = [
'................',
'................',
'................',
'............WW.W',
'.g..........WGGW',
'.ggGGGGGGGGGGGG.',
'..gGGGGGGGGGKGG.',
'...GGGGGGGGGGGGL',
'...gGGGGGGGGGgD.',
'...GG..gg...GG..',
'...gg.......gg..',
'................',
]
BULL_HIT = [
'..........WW..WW',
'...........WGGW.',
'.g.........GGGG.',
'.gg....GGGGGGGG.',
'..g..GGGGGGGGGG.',
'..gGGGGGGGGWGGG.',
'..RGGGGGGGGGGGGL',
'...gGGGGGGGRGgD.',
'...G.G..g..G.G..',
'................',
'................',
'................',
]
S['bull_idle'] = [BULL_RUN_A, BULL_RUN_B]  # placeholder, replaced below
S['bull_run']  = [BULL_RUN_A, BULL_RUN_B]
S['bull_jump'] = [BULL_JUMP]
S['bull_duck'] = [BULL_DUCK]
S['bull_hit']  = [BULL_HIT]

def shift_down(grid, rows=1):
    w = len(grid[0])
    return ['.'*w]*rows + grid[:-rows]
# idle = stand (both leg pairs planted) + subtle bob
BULL_STAND = [r for r in BULL_RUN_A]
BULL_STAND[8]  = '...GG..GG...GG..'
BULL_STAND[9]  = '...GG..GG...GG..'
BULL_STAND[10] = '...gg..gg...gg..'
S['bull_idle'] = [BULL_STAND, shift_down(BULL_STAND[:1],0) and BULL_STAND]  # fix below
# simple bob: move top 8 rows down 1px for frame B
BOB = ['.'*16] + BULL_STAND[0:8] + BULL_STAND[9:12]
S['bull_idle'] = [BULL_STAND, BOB]

# ---------- BEAR GRUNT (Monster Mode) 16x16 ----------
BEAR_A = [
'..rr......rr....',
'.rRRr....rRRr...',
'.RRRR....RRRR...',
'..RRRRRRRRRR....',
'.RRRRRRRRRRRR...',
'.RRKRRRRRRKRR...',
'.RRRRRrrRRRRR...',
'.RRRRrRRrRRRR...',
'..RRRrRRrRRR....',
'..RRRRrrRRRR....',
'..RRRRRRRRRR....',
'..RRRRRRRRRR....',
'...RRR..RRR.....',
'...RRr..rRR.....',
'...rr....rr.....',
'..WW......WW....',
]
BEAR_B = [
'..rr......rr....',
'.rRRr....rRRr...',
'.RRRR....RRRR...',
'..RRRRRRRRRR....',
'.RRRRRRRRRRRR...',
'.RRKRRRRRRKRR...',
'.RRRRRrrRRRRR...',
'.RRRRrRRrRRRR...',
'..RRRrRRrRRR....',
'..RRRRrrRRRR....',
'..RRRRRRRRRR....',
'..RRRRRRRRRR....',
'..RRR....RRR....',
'..rRR....RRr....',
'...rr....rr.....',
'.WW........WW...',
]
BEAR_ATK = [
'..rr......rr....',
'.rRRr....rRRr...',
'WRRRR....RRRRW..',
'WWRRRRRRRRRRWW..',
'RRRRRRRRRRRRRR..',
'RRKKRRRRRRKKRR..',
'RRRRRRrrRRRRRR..',
'.RRRRrRRrRRRR...',
'.RRRRrWWrRRRR...',
'..RRRRrrRRRR....',
'..RRRRRRRRRR....',
'..RRRRRRRRRR....',
'...RRR..RRR.....',
'...RRr..rRR.....',
'...rr....rr.....',
'..WW......WW....',
]
BEAR_DEAD = [
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'..rr......rr....',
'.rrrr....rrrr...',
'..rrrrrrrrrr....',
'.rrWrrrrrrWrr...',
'.rrrrrWWrrrrr...',
'..rrrrrrrrrr....',
'...rr....rr.....',
]
S['bear_walk'] = [BEAR_A, BEAR_B]
S['bear_attack'] = [BEAR_A, BEAR_ATK]
S['bear_dead'] = [BEAR_DEAD]

# ---------- WICK BITER (Monster Mode) 8x16 ----------
WICK_WARN_A = [
'...rr...',
'........',
'...rr...',
'........',
'...rr...',
'........',
'...rr...',
'........',
'...rr...',
'........',
'...rr...',
'........',
'...rr...',
'........',
'..rrrr..',
'........',
]
WICK_WARN_B = [
'........',
'...RR...',
'........',
'...RR...',
'........',
'...RR...',
'........',
'...RR...',
'........',
'...RR...',
'........',
'...RR...',
'........',
'...RR...',
'.RRRRRR.',
'........',
]
WICK_STRIKE = [
'...rr...',
'..rRRr..',
'..RRRR..',
'..RRRR..',
'..RRRR..',
'..RRRR..',
'..RRRR..',
'..RRRR..',
'..RRRR..',
'.RRRRRR.',
'.RKRRKR.',
'.RRRRRR.',
'.WR..RW.',
'.W....W.',
'........',
'........',
]
WICK_SPENT = [
'........',
'........',
'........',
'........',
'........',
'........',
'........',
'........',
'...rr...',
'..rrrr..',
'..rKKr..',
'..rrrr..',
'..r..r..',
'........',
'........',
'........',
]
S['wick_warn'] = [WICK_WARN_A, WICK_WARN_B]
S['wick_strike'] = [WICK_STRIKE]
S['wick_spent'] = [WICK_SPENT]

# ---------- WICK SNAKE 8x8 ----------
SNAKE_HEAD_A = [
'.gGGGg..',
'gGGGGGg.',
'GGGGKGG.',
'gGGGGGGR',
'GGGGKGG.',
'gGGGGGg.',
'.gGGGg..',
'........',
]
SNAKE_HEAD_B = [
'.gGGGg..',
'gGGGGGg.',
'GGGGKGG.',
'gGGGGGG.',
'GGGGKGG.',
'gGGGGGg.',
'.gGGGg..',
'........',
]
SNAKE_BODY = [
'........',
'.gGGGGg.',
'gGGGGGGg',
'GGLGGGGG',
'GGGGGGGG',
'gGGGGGGg',
'.gGGGGg.',
'........',
]
SNAKE_TAIL = [
'........',
'......gg',
'....gGGG',
'..gGGGGG',
'....gGGG',
'......gg',
'........',
'........',
]
SNAKE_DEAD = [
'.gGGGg..',
'gGGGGGg.',
'GGGWGWG.',
'gGGGGGG.',
'GGGWGWG.',
'gGGGGGg.',
'.gGGGg..',
'........',
]
S['snake_head'] = [SNAKE_HEAD_A, SNAKE_HEAD_B]
S['snake_body'] = [SNAKE_BODY]
S['snake_tail'] = [SNAKE_TAIL]
S['snake_dead'] = [SNAKE_DEAD]

# ---------- HOVER POD (Racing) 16x12 ----------
POD_A = [
'.......LLL......',
'......LLLLL.....',
'....GGLLLLLGG...',
'..GGGGGGGGGGGG..',
'.GGGGGGGGGGGGGG.',
'OGGGGGGGGGGGGGg.',
'.ggggggggggggg..',
'...gg......gg...',
'................',
'................',
'................',
'................',
]
POD_B = [
'.......LLL......',
'......LLLLL.....',
'....GGLLLLLGG...',
'..GGGGGGGGGGGG..',
'.GGGGGGGGGGGGGG.',
'YOGGGGGGGGGGGGg.',
'.ggggggggggggg..',
'...gg......gg...',
'................',
'................',
'................',
'................',
]
POD_BOOST_A = [
'.......LLL......',
'......LLLLL.....',
'....GGLLLLLGG...',
'..GGGGGGGGGGGG..',
'YGGGGGGGGGGGGGG.',
'OYGGGGGGGGGGGGg.',
'Yggggggggggggg..',
'...gg......gg...',
'................',
'................',
'................',
'................',
]
POD_BOOST_B = [
'.......LLL......',
'......LLLLL.....',
'....GGLLLLLGG...',
'..GGGGGGGGGGGG..',
'OYGGGGGGGGGGGGG.',
'YOYGGGGGGGGGGGg.',
'OYggggggggggggg.',
'...gg......gg...',
'................',
'................',
'................',
'................',
]
S['pod_hover'] = [POD_A, POD_B]
S['pod_boost'] = [POD_BOOST_A, POD_BOOST_B]

# ---------- FINISH FLAG (Racing) 16x16 ----------
FLAG_A = [
'gg..............',
'ggWWKKWWKKWW....',
'ggWWKKWWKKWW....',
'ggKKWWKKWWKK....',
'ggKKWWKKWWKK....',
'ggWWKKWWKKWW....',
'ggWWKKWWKKWW....',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
]
FLAG_B = [
'gg..............',
'gg.WKKWWKKWW....',
'ggWWKKWWKKWWW...',
'ggKKWWKKWWKK....',
'gg.KWWKKWWKKK...',
'ggWWKKWWKKWW....',
'gg.WKKWWKKWWW...',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
'gg..............',
]
S['finish_flag'] = [FLAG_A, FLAG_B]

# ---------- RANGE RALLY BEACON 12x16 ----------
BEACON_A = [
'.....GG.....',
'....GGGG....',
'...GGGGGG...',
'..GGGGGGGG..',
'...GGGGGG...',
'....GGGG....',
'.....GG.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'....gggg....',
'...gggggg...',
'............',
]
BEACON_B = [
'.....LL.....',
'....GLLG....',
'...GGLLGG...',
'..GGLLLLGG..',
'...GGLLGG...',
'....GLLG....',
'.....LL.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'.....gg.....',
'....gggg....',
'...gggggg...',
'............',
]
S['beacon'] = [BEACON_A, BEACON_B]

# ---------- EXIT GATE (Snake) 12x16 ----------
def gate(offset):
    rows=[]
    for y in range(16):
        row = list('............')
        row[0]='B'; row[1]='b'; row[10]='b'; row[11]='B'
        if y in (0,15):
            row = list('BBb......bBB')
        elif 1 <= y <= 14:
            for x in range(3,9):
                if (x + y + offset) % 3 == 0: row[x]='b'
                if (x + y + offset) % 6 == 0: row[x]='B'
        rows.append(''.join(row))
    return rows
S['exit_gate'] = [gate(0), gate(2)]

# ---------- COIN 8x8 spin (procedural) ----------
def coin(width):
    img=[]
    cx=3.5
    for y in range(8):
        row=''
        for x in range(8):
            dx=(x-cx)/ (width/2.0); dy=(y-3.5)/3.5
            d=dx*dx+dy*dy
            if d<=0.55: row+='Y'
            elif d<=1.0: row+='y'
            else: row+='.'
        img.append(row)
    return img
S['coin_spin'] = [coin(8), coin(5.5), coin(2.5), coin(5.5)]

# ---------- EXPLOSION 16x16 (procedural) ----------
def boom(radius, ring, colors):
    img=[]
    for y in range(16):
        row=''
        for x in range(16):
            d=math.hypot(x-7.5,y-7.5)
            if abs(d-radius)<=ring: row+=colors[0]
            elif d<radius-ring and radius<6: row+=colors[1]
            else: row+='.'
        img.append(row)
    return img
S['explosion'] = [boom(2,1.4,('W','Y')), boom(4,1.6,('Y','O')), boom(6,1.5,('O','r')), boom(7.4,1.0,('r','.'))]

# ---------- COACH INVADER (existing, kept for reference) ----------
S['coach'] = [[
'..11111111111..'.replace('1','G'),
'.1111111111111.'.replace('1','G'),
'111.1111111.111'.replace('1','G'),
'11111111111111.'.replace('1','G'),
'..11.11111.11..'.replace('1','G'),
'.1...11111...1.'.replace('1','G'),
'....1.....1....'.replace('1','G'),
]]

# ---------- BYTE (Avatar, Pacman-Ersatz) 12x12 ----------
# Candle-Muncher: Kerzenkoerper mit Docht, gezackter Kiefer, Stummelbeine.
# Silhouette bewusst eckig/kerzenfoermig — kein Kreis, kein Tortenstueck.
BYTE_CLOSED = [
'.....LL.....',
'.....gg.....',
'..GGGGGGGG..',
'.GGGGGGGGGG.',
'.GGGGGGKWGG.',
'.GGGGGGGGGG.',
'.GGGGGGgggg.',
'.GGGGGGGGGG.',
'.GGGGGGGGGG.',
'..GGGGGGGG..',
'...gg..gg...',
'...gg..gg...',
]
BYTE_HALF = [
'.....LL.....',
'.....gg.....',
'..GGGGGGGG..',
'.GGGGGGGGGG.',
'.GGGGGGKWGG.',
'.GGGGGGGGGG.',
'.GGGGGGKKKK.',
'.GGGGGGGKKK.',
'.GGGGGGGGGG.',
'..GGGGGGGG..',
'...gg..gg...',
'...gg..gg...',
]
BYTE_OPEN = [
'.....LL.....',
'.....gg.....',
'..GGGGGGGG..',
'.GGGGGGGGGG.',
'.GGGGGGKWGG.',
'.GGGGGLGGgg.',
'.GGGGGKKKKK.',
'.GGGGGKKKKK.',
'.GGGGGLGGgg.',
'..GGGGGGGG..',
'...gg..gg...',
'...gg..gg...',
]
BYTE_HIT = [
'.....LL.....',
'.....LL.....',
'..LLLLLLLL..',
'.LLLLLLLLLL.',
'.LLLKLKLLLL.',
'.LLLLKLLLLL.',
'.LLLKLKKKKK.',
'.LLLLLLLKKK.',
'.LLLLLLLLLL.',
'..LLLLLLLL..',
'...LL..LL...',
'...LL..LL...',
]
S['byte_chomp'] = [BYTE_CLOSED, BYTE_HALF, BYTE_OPEN, BYTE_HALF]
S['byte_hit']   = [BYTE_HIT]

# ---------- BEAR BOSS (Monster Mode) 20x16, Live-Pink #FF5B7F + gruener Guertel ----------
BOSS_A = [
'...pp..........pp...',
'..pPPp........pPPp..',
'..PPPP........PPPP..',
'...PPPPPPPPPPPPPP...',
'..PPPPPPPPPPPPPPPP..',
'..PPKKPPPPPPPPKKPP..',
'..PPKKPPPPPPPPKKPP..',
'..PPPPPPppppPPPPPP..',
'..PPPPPpPPPPpPPPPP..',
'...PPPPPppppPPPPP...',
'...PPPPPPPPPPPPPP...',
'...GGGGGGGGGGGGGG...',
'...PPPPPPPPPPPPPP...',
'....PPP......PPP....',
'....PPp......pPP....',
'...WW..........WW...',
]
BOSS_B = [r for r in BOSS_A]
BOSS_B[13] = '....PPP......PPP....'
BOSS_B[14] = '....pPP......PPp....'
BOSS_B[15] = '.....WW......WW.....'
BOSS_SLAM = [
'W..pp..........pp..W',
'WWpPPp........pPPpWW',
'.PPPPP........PPPPP.',
'.PPPPPPPPPPPPPPPPPP.',
'..PPPPPPPPPPPPPPPP..',
'..PPKKPPPPPPPPKKPP..',
'..PPKKPPPPPPPPKKPP..',
'..PPPPPKKKKKKPPPPP..',
'..PPPPPKPPPPKPPPPP..',
'...PPPPKKKKKKPPPP...',
'...PPPPPPPPPPPPPP...',
'...GGGGGGGGGGGGGG...',
'...PPPPPPPPPPPPPP...',
'....PPP......PPP....',
'....PPp......pPP....',
'...WW..........WW...',
]
BOSS_HIT = [row.replace('P','L').replace('p','L') for row in BOSS_A]
S['boss_walk'] = [BOSS_A, BOSS_B]
S['boss_slam'] = [BOSS_A, BOSS_SLAM]
S['boss_hit']  = [BOSS_HIT]

# ---------- PICKUPS (Live-Systeme aus drawPickups) ----------
# $CHART creds — lila Coin-Spin (wie coin_spin, Live-Farbe 'creds')
def pcoin(width, main, dark):
    img=[]
    cx=3.5
    for y in range(8):
        row=''
        for x in range(8):
            dx=(x-cx)/(width/2.0); dy=(y-3.5)/3.5
            d=dx*dx+dy*dy
            if d<=0.55: row+=main
            elif d<=1.0: row+=dark
            else: row+='.'
        img.append(row)
    return img
S['creds_spin'] = [pcoin(8,'V','v'), pcoin(5.5,'V','v'), pcoin(2.5,'V','v'), pcoin(5.5,'V','v')]

# Restock — gruener Puls-Orb mit R-Marke + Halo-Ring (Live: accent-green, Ring)
def orb(core_r, ring_r, main, dark, mark=None):
    img=[]
    for y in range(12):
        row=''
        for x in range(12):
            d=math.hypot(x-5.5,y-5.5)
            if d<=core_r: row+=main
            elif abs(d-ring_r)<=0.7: row+=dark
            else: row+='.'
        img.append(row)
    if mark:  # 3x5 R-Marke zentriert, dunkel auf Kern
        R=['KK.','K.K','KK.','K.K','K.K']
        for j,mr in enumerate(R):
            for i,ch in enumerate(mr):
                if ch=='K':
                    y=j+4; x=i+4
                    row=list(img[y]); row[x]='K'; img[y]=''.join(row)
    return img
S['restock_pulse'] = [orb(3.2,5.0,'G','g',mark=True), orb(3.6,5.6,'G','g',mark=True)]

# Boss-Loot — cyan Doppelring-Orb (Live: '#22d3ee', twin concentric rings)
def loot(r1, r2):
    img=[]
    for y in range(12):
        row=''
        for x in range(12):
            d=math.hypot(x-5.5,y-5.5)
            if d<=1.2: row+='C'
            elif abs(d-r1)<=0.6: row+='C'
            elif abs(d-r2)<=0.6: row+='c'
            else: row+='.'
        img.append(row)
    return img
S['loot_pulse'] = [loot(3.1,5.0), loot(3.7,5.6)]

# ---------- Erweiterung: alle weiteren Minigames (Roster 15+) ----------
import ext
ext.register(S)

# ================= RENDER =================
def render_frame(grid, px):
    h=len(grid); w=max(len(r) for r in grid)
    im=Image.new('RGBA',(w*px,h*px),(0,0,0,0))
    d=ImageDraw.Draw(im)
    for y,row in enumerate(grid):
        for x,c in enumerate(row):
            if c!='.' and c in PAL:
                d.rectangle([x*px,y*px,(x+1)*px-1,(y+1)*px-1],fill=PAL[c])
    return im

GAMES = {
 'AVATAR: BYTE (Pacman-Ersatz, Loadout)': ['byte_chomp','byte_hit'],
 'BULL DASH (Player: Bull)': ['bull_idle','bull_run','bull_jump','bull_duck','bull_hit'],
 'MONSTER MODE (Bear Grunt / Boss / Wick Biter)': ['bear_walk','bear_attack','bear_dead','boss_walk','boss_slam','boss_hit','wick_warn','wick_strike','wick_spent'],
 'WICK SNAKE': ['snake_head','snake_body','snake_tail','snake_dead','exit_gate'],
 'RACING (Hover Pod)': ['pod_hover','pod_boost','finish_flag'],
 'RANGE RALLY': ['beacon'],
 'PICKUPS (Live-Systeme)': ['coin_spin','creds_spin','restock_pulse','loot_pulse'],
 'SHARED': ['explosion','coach'],
}
GAMES.update(ext.GAMES_EXT)

def poster(path, px=8):
    try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',15)
    except: font=ImageFont.load_default()
    pad=16; secs=[]
    W=1500
    # layout: per game a section; frames in a row
    total_h=pad
    rows=[]
    for game,names in GAMES.items():
        rows.append(('title',game)); total_h+=34
        maxh=0; x=pad; row=[]
        for n in names:
            for i,f in enumerate(S[n]):
                fw=max(len(r) for r in f)*px; fh=len(f)*px
                lbl=(len(n)+4)*10
                span=max(fw,lbl,96)+40
                if x+span+pad>W:
                    rows.append(('frames',row)); total_h+=maxh+34; row=[]; x=pad; maxh=0
                row.append((n,i,x)); x+=span
                maxh=max(maxh,fh)
        rows.append(('frames',row)); total_h+=maxh+40
    img=Image.new('RGB',(W,total_h+pad),'#05070d')
    d=ImageDraw.Draw(img)
    y=pad
    for kind,val in rows:
        if kind=='title':
            d.text((pad,y),val,fill='#14F195',font=font); y+=34
        else:
            maxh=0
            for n,i,x in val:
                f=S[n][i]
                fr=render_frame(f,px)
                img.paste(fr,(x,y+18),fr)
                d.text((x,y),f'{n}[{i}]',fill='#888888',font=font)
                maxh=max(maxh,fr.height)
            y+=maxh+40
    img.save(path)
    print('poster',img.size)

if __name__=='__main__':
    poster('/home/user/workspace/cr-sprites/poster.png')
