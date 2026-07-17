// ChartRunner original minigame sprites — 100% original pixel art (no third-party assets).
// Same draw pattern as drawInvader: char grid -> fillRect per pixel.
const CR_SPRITES = {
 "pal": {
  "G": "#14F195",
  "g": "#0FC17A",
  "D": "#0A8F5B",
  "L": "#BFF7DF",
  "K": "#05070D",
  "W": "#FFFFFF",
  "R": "#FF5C5C",
  "r": "#B23A48",
  "Y": "#FFD166",
  "y": "#C9973A",
  "B": "#4DA6FF",
  "b": "#2A6FBF",
  "O": "#FF9C41",
  "k": "#1A1F2B",
  "P": "#FF5B7F",
  "p": "#C24463",
  "C": "#22D3EE",
  "c": "#157F97",
  "V": "#B57BFF",
  "v": "#7C4DBF"
 },
 "anims": {
  "bull_idle": {
   "fps": 4,
   "loop": true,
   "w": 16,
   "h": 12,
   "frames": [
    [
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGKGGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "...GG..GG...GG..",
     "...GG..GG...GG..",
     "...gg..gg...gg..",
     "................"
    ],
    [
     "................",
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGKGGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "...GG..GG...GG..",
     "...gg..gg...gg..",
     "................"
    ]
   ]
  },
  "bull_run": {
   "fps": 10,
   "loop": true,
   "w": 16,
   "h": 12,
   "frames": [
    [
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGKGGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "...GG..gg...GG..",
     "...GG.......GG..",
     "...gg.......gg..",
     "................"
    ],
    [
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGKGGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "....GG.....GG...",
     ".....GG...GG....",
     "......gg.gg.....",
     "................"
    ]
   ]
  },
  "bull_jump": {
   "fps": 0,
   "loop": false,
   "w": 16,
   "h": 12,
   "frames": [
    [
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGKGGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "....gGG...GGg...",
     ".....gg...gg....",
     "................",
     "................"
    ]
   ]
  },
  "bull_duck": {
   "fps": 0,
   "loop": false,
   "w": 16,
   "h": 12,
   "frames": [
    [
     "................",
     "................",
     "................",
     "............WW.W",
     ".g..........WGGW",
     ".ggGGGGGGGGGGGG.",
     "..gGGGGGGGGGKGG.",
     "...GGGGGGGGGGGGL",
     "...gGGGGGGGGGgD.",
     "...GG..gg...GG..",
     "...gg.......gg..",
     "................"
    ]
   ]
  },
  "bull_hit": {
   "fps": 8,
   "loop": false,
   "w": 16,
   "h": 12,
   "frames": [
    [
     "..........WW..WW",
     "...........WGGW.",
     ".g.........GGGG.",
     ".gg....GGGGGGGG.",
     "..g..GGGGGGGGGG.",
     "..gGGGGGGGGWGGG.",
     "..RGGGGGGGGGGGGL",
     "...gGGGGGGGRGgD.",
     "...G.G..g..G.G..",
     "................",
     "................",
     "................"
    ]
   ]
  },
  "bear_walk": {
   "fps": 6,
   "loop": true,
   "w": 16,
   "h": 16,
   "frames": [
    [
     "..rr......rr....",
     ".rRRr....rRRr...",
     ".RRRR....RRRR...",
     "..RRRRRRRRRR....",
     ".RRRRRRRRRRRR...",
     ".RRKRRRRRRKRR...",
     ".RRRRRrrRRRRR...",
     ".RRRRrRRrRRRR...",
     "..RRRrRRrRRR....",
     "..RRRRrrRRRR....",
     "..RRRRRRRRRR....",
     "..RRRRRRRRRR....",
     "...RRR..RRR.....",
     "...RRr..rRR.....",
     "...rr....rr.....",
     "..WW......WW...."
    ],
    [
     "..rr......rr....",
     ".rRRr....rRRr...",
     ".RRRR....RRRR...",
     "..RRRRRRRRRR....",
     ".RRRRRRRRRRRR...",
     ".RRKRRRRRRKRR...",
     ".RRRRRrrRRRRR...",
     ".RRRRrRRrRRRR...",
     "..RRRrRRrRRR....",
     "..RRRRrrRRRR....",
     "..RRRRRRRRRR....",
     "..RRRRRRRRRR....",
     "..RRR....RRR....",
     "..rRR....RRr....",
     "...rr....rr.....",
     ".WW........WW..."
    ]
   ]
  },
  "bear_attack": {
   "fps": 8,
   "loop": false,
   "w": 16,
   "h": 16,
   "frames": [
    [
     "..rr......rr....",
     ".rRRr....rRRr...",
     ".RRRR....RRRR...",
     "..RRRRRRRRRR....",
     ".RRRRRRRRRRRR...",
     ".RRKRRRRRRKRR...",
     ".RRRRRrrRRRRR...",
     ".RRRRrRRrRRRR...",
     "..RRRrRRrRRR....",
     "..RRRRrrRRRR....",
     "..RRRRRRRRRR....",
     "..RRRRRRRRRR....",
     "...RRR..RRR.....",
     "...RRr..rRR.....",
     "...rr....rr.....",
     "..WW......WW...."
    ],
    [
     "..rr......rr....",
     ".rRRr....rRRr...",
     "WRRRR....RRRRW..",
     "WWRRRRRRRRRRWW..",
     "RRRRRRRRRRRRRR..",
     "RRKKRRRRRRKKRR..",
     "RRRRRRrrRRRRRR..",
     ".RRRRrRRrRRRR...",
     ".RRRRrWWrRRRR...",
     "..RRRRrrRRRR....",
     "..RRRRRRRRRR....",
     "..RRRRRRRRRR....",
     "...RRR..RRR.....",
     "...RRr..rRR.....",
     "...rr....rr.....",
     "..WW......WW...."
    ]
   ]
  },
  "bear_dead": {
   "fps": 0,
   "loop": false,
   "w": 16,
   "h": 16,
   "frames": [
    [
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "................",
     "..rr......rr....",
     ".rrrr....rrrr...",
     "..rrrrrrrrrr....",
     ".rrWrrrrrrWrr...",
     ".rrrrrWWrrrrr...",
     "..rrrrrrrrrr....",
     "...rr....rr....."
    ]
   ]
  },
  "wick_warn": {
   "fps": 8,
   "loop": true,
   "w": 8,
   "h": 16,
   "frames": [
    [
     "...rr...",
     "........",
     "...rr...",
     "........",
     "...rr...",
     "........",
     "...rr...",
     "........",
     "...rr...",
     "........",
     "...rr...",
     "........",
     "...rr...",
     "........",
     "..rrrr..",
     "........"
    ],
    [
     "........",
     "...RR...",
     "........",
     "...RR...",
     "........",
     "...RR...",
     "........",
     "...RR...",
     "........",
     "...RR...",
     "........",
     "...RR...",
     "........",
     "...RR...",
     ".RRRRRR.",
     "........"
    ]
   ]
  },
  "wick_strike": {
   "fps": 0,
   "loop": false,
   "w": 8,
   "h": 16,
   "frames": [
    [
     "...rr...",
     "..rRRr..",
     "..RRRR..",
     "..RRRR..",
     "..RRRR..",
     "..RRRR..",
     "..RRRR..",
     "..RRRR..",
     "..RRRR..",
     ".RRRRRR.",
     ".RKRRKR.",
     ".RRRRRR.",
     ".WR..RW.",
     ".W....W.",
     "........",
     "........"
    ]
   ]
  },
  "wick_spent": {
   "fps": 0,
   "loop": false,
   "w": 8,
   "h": 16,
   "frames": [
    [
     "........",
     "........",
     "........",
     "........",
     "........",
     "........",
     "........",
     "........",
     "...rr...",
     "..rrrr..",
     "..rKKr..",
     "..rrrr..",
     "..r..r..",
     "........",
     "........",
     "........"
    ]
   ]
  },
  "snake_head": {
   "fps": 4,
   "loop": true,
   "w": 8,
   "h": 8,
   "frames": [
    [
     ".gGGGg..",
     "gGGGGGg.",
     "GGGGKGG.",
     "gGGGGGGR",
     "GGGGKGG.",
     "gGGGGGg.",
     ".gGGGg..",
     "........"
    ],
    [
     ".gGGGg..",
     "gGGGGGg.",
     "GGGGKGG.",
     "gGGGGGG.",
     "GGGGKGG.",
     "gGGGGGg.",
     ".gGGGg..",
     "........"
    ]
   ]
  },
  "snake_body": {
   "fps": 0,
   "loop": false,
   "w": 8,
   "h": 8,
   "frames": [
    [
     "........",
     ".gGGGGg.",
     "gGGGGGGg",
     "GGLGGGGG",
     "GGGGGGGG",
     "gGGGGGGg",
     ".gGGGGg.",
     "........"
    ]
   ]
  },
  "snake_tail": {
   "fps": 0,
   "loop": false,
   "w": 8,
   "h": 8,
   "frames": [
    [
     "........",
     "......gg",
     "....gGGG",
     "..gGGGGG",
     "....gGGG",
     "......gg",
     "........",
     "........"
    ]
   ]
  },
  "snake_dead": {
   "fps": 0,
   "loop": false,
   "w": 8,
   "h": 8,
   "frames": [
    [
     ".gGGGg..",
     "gGGGGGg.",
     "GGGWGWG.",
     "gGGGGGG.",
     "GGGWGWG.",
     "gGGGGGg.",
     ".gGGGg..",
     "........"
    ]
   ]
  },
  "pod_hover": {
   "fps": 8,
   "loop": true,
   "w": 16,
   "h": 12,
   "frames": [
    [
     ".......LLL......",
     "......LLLLL.....",
     "....GGLLLLLGG...",
     "..GGGGGGGGGGGG..",
     ".GGGGGGGGGGGGGG.",
     "OGGGGGGGGGGGGGg.",
     ".ggggggggggggg..",
     "...gg......gg...",
     "................",
     "................",
     "................",
     "................"
    ],
    [
     ".......LLL......",
     "......LLLLL.....",
     "....GGLLLLLGG...",
     "..GGGGGGGGGGGG..",
     ".GGGGGGGGGGGGGG.",
     "YOGGGGGGGGGGGGg.",
     ".ggggggggggggg..",
     "...gg......gg...",
     "................",
     "................",
     "................",
     "................"
    ]
   ]
  },
  "pod_boost": {
   "fps": 12,
   "loop": true,
   "w": 16,
   "h": 12,
   "frames": [
    [
     ".......LLL......",
     "......LLLLL.....",
     "....GGLLLLLGG...",
     "..GGGGGGGGGGGG..",
     "YGGGGGGGGGGGGGG.",
     "OYGGGGGGGGGGGGg.",
     "Yggggggggggggg..",
     "...gg......gg...",
     "................",
     "................",
     "................",
     "................"
    ],
    [
     ".......LLL......",
     "......LLLLL.....",
     "....GGLLLLLGG...",
     "..GGGGGGGGGGGG..",
     "OYGGGGGGGGGGGGG.",
     "YOYGGGGGGGGGGGg.",
     "OYggggggggggggg.",
     "...gg......gg...",
     "................",
     "................",
     "................",
     "................"
    ]
   ]
  },
  "finish_flag": {
   "fps": 6,
   "loop": true,
   "w": 16,
   "h": 16,
   "frames": [
    [
     "gg..............",
     "ggWWKKWWKKWW....",
     "ggWWKKWWKKWW....",
     "ggKKWWKKWWKK....",
     "ggKKWWKKWWKK....",
     "ggWWKKWWKKWW....",
     "ggWWKKWWKKWW....",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg.............."
    ],
    [
     "gg..............",
     "gg.WKKWWKKWW....",
     "ggWWKKWWKKWWW...",
     "ggKKWWKKWWKK....",
     "gg.KWWKKWWKKK...",
     "ggWWKKWWKKWW....",
     "gg.WKKWWKKWWW...",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg..............",
     "gg.............."
    ]
   ]
  },
  "beacon": {
   "fps": 4,
   "loop": true,
   "w": 12,
   "h": 16,
   "frames": [
    [
     ".....GG.....",
     "....GGGG....",
     "...GGGGGG...",
     "..GGGGGGGG..",
     "...GGGGGG...",
     "....GGGG....",
     ".....GG.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     "....gggg....",
     "...gggggg...",
     "............"
    ],
    [
     ".....LL.....",
     "....GLLG....",
     "...GGLLGG...",
     "..GGLLLLGG..",
     "...GGLLGG...",
     "....GLLG....",
     ".....LL.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     ".....gg.....",
     "....gggg....",
     "...gggggg...",
     "............"
    ]
   ]
  },
  "exit_gate": {
   "fps": 10,
   "loop": true,
   "w": 12,
   "h": 16,
   "frames": [
    [
     "BBb......bBB",
     "Bb...B..b.bB",
     "Bb..B..b..bB",
     "Bb.B..b...bB",
     "Bb...b..B.bB",
     "Bb..b..B..bB",
     "Bb.b..B...bB",
     "Bb...B..b.bB",
     "Bb..B..b..bB",
     "Bb.B..b...bB",
     "Bb...b..B.bB",
     "Bb..b..B..bB",
     "Bb.b..B...bB",
     "Bb...B..b.bB",
     "Bb..B..b..bB",
     "BBb......bBB"
    ],
    [
     "BBb......bBB",
     "Bb.B..b...bB",
     "Bb...b..B.bB",
     "Bb..b..B..bB",
     "Bb.b..B...bB",
     "Bb...B..b.bB",
     "Bb..B..b..bB",
     "Bb.B..b...bB",
     "Bb...b..B.bB",
     "Bb..b..B..bB",
     "Bb.b..B...bB",
     "Bb...B..b.bB",
     "Bb..B..b..bB",
     "Bb.B..b...bB",
     "Bb...b..B.bB",
     "BBb......bBB"
    ]
   ]
  },
  "coin_spin": {
   "fps": 8,
   "loop": true,
   "w": 8,
   "h": 8,
   "frames": [
    [
     "........",
     ".yyYYyy.",
     "yyYYYYyy",
     "yYYYYYYy",
     "yYYYYYYy",
     "yyYYYYyy",
     ".yyYYyy.",
     "........"
    ],
    [
     "........",
     "..yYYy..",
     "..YYYY..",
     ".yYYYYy.",
     ".yYYYYy.",
     "..YYYY..",
     "..yYYy..",
     "........"
    ],
    [
     "........",
     "...yy...",
     "...YY...",
     "...YY...",
     "...YY...",
     "...YY...",
     "...yy...",
     "........"
    ],
    [
     "........",
     "..yYYy..",
     "..YYYY..",
     ".yYYYYy.",
     ".yYYYYy.",
     "..YYYY..",
     "..yYYy..",
     "........"
    ]
   ]
  },
  "explosion": {
   "fps": 12,
   "loop": false,
   "w": 16,
   "h": 16,
   "frames": [
    [
     "................",
     "................",
     "................",
     "................",
     "................",
     "......WWWW......",
     ".....WWWWWW.....",
     ".....WWWWWW.....",
     ".....WWWWWW.....",
     ".....WWWWWW.....",
     "......WWWW......",
     "................",
     "................",
     "................",
     "................",
     "................"
    ],
    [
     "................",
     "................",
     ".......YY.......",
     ".....YYYYYY.....",
     "....YYYYYYYY....",
     "...YYYYYYYYYY...",
     "...YYYOOOOYYY...",
     "..YYYYOOOOYYYY..",
     "..YYYYOOOOYYYY..",
     "...YYYOOOOYYY...",
     "...YYYYYYYYYY...",
     "....YYYYYYYY....",
     ".....YYYYYY.....",
     ".......YY.......",
     "................",
     "................"
    ],
    [
     "................",
     "....OOOOOOOO....",
     "...OOOOOOOOOO...",
     "..OOOOOOOOOOOO..",
     ".OOOO......OOOO.",
     ".OOO........OOO.",
     ".OOO........OOO.",
     ".OOO........OOO.",
     ".OOO........OOO.",
     ".OOO........OOO.",
     ".OOO........OOO.",
     ".OOOO......OOOO.",
     "..OOOOOOOOOOOO..",
     "...OOOOOOOOOO...",
     "....OOOOOOOO....",
     "................"
    ],
    [
     "....rrrrrrrr....",
     "...rrrrrrrrrr...",
     "..rrr......rrr..",
     ".rr..........rr.",
     "rrr..........rrr",
     "rr............rr",
     "rr............rr",
     "rr............rr",
     "rr............rr",
     "rr............rr",
     "rr............rr",
     "rrr..........rrr",
     ".rr..........rr.",
     "..rrr......rrr..",
     "...rrrrrrrrrr...",
     "....rrrrrrrr...."
    ]
   ]
  },
  "coach": {
   "fps": 0,
   "loop": false,
   "w": 15,
   "h": 7,
   "frames": [
    [
     "..GGGGGGGGGGG..",
     ".GGGGGGGGGGGGG.",
     "GGG.GGGGGGG.GGG",
     "GGGGGGGGGGGGGG.",
     "..GG.GGGGG.GG..",
     ".G...GGGGG...G.",
     "....G.....G...."
    ]
   ]
  },
  "byte_chomp": {
   "fps": 10,
   "loop": true,
   "w": 12,
   "h": 12,
   "frames": [
    [
     ".....LL.....",
     ".....gg.....",
     "..GGGGGGGG..",
     ".GGGGGGGGGG.",
     ".GGGGGGKWGG.",
     ".GGGGGGGGGG.",
     ".GGGGGGgggg.",
     ".GGGGGGGGGG.",
     ".GGGGGGGGGG.",
     "..GGGGGGGG..",
     "...gg..gg...",
     "...gg..gg..."
    ],
    [
     ".....LL.....",
     ".....gg.....",
     "..GGGGGGGG..",
     ".GGGGGGGGGG.",
     ".GGGGGGKWGG.",
     ".GGGGGGGGGG.",
     ".GGGGGGKKKK.",
     ".GGGGGGGKKK.",
     ".GGGGGGGGGG.",
     "..GGGGGGGG..",
     "...gg..gg...",
     "...gg..gg..."
    ],
    [
     ".....LL.....",
     ".....gg.....",
     "..GGGGGGGG..",
     ".GGGGGGGGGG.",
     ".GGGGGGKWGG.",
     ".GGGGGLGGgg.",
     ".GGGGGKKKKK.",
     ".GGGGGKKKKK.",
     ".GGGGGLGGgg.",
     "..GGGGGGGG..",
     "...gg..gg...",
     "...gg..gg..."
    ],
    [
     ".....LL.....",
     ".....gg.....",
     "..GGGGGGGG..",
     ".GGGGGGGGGG.",
     ".GGGGGGKWGG.",
     ".GGGGGGGGGG.",
     ".GGGGGGKKKK.",
     ".GGGGGGGKKK.",
     ".GGGGGGGGGG.",
     "..GGGGGGGG..",
     "...gg..gg...",
     "...gg..gg..."
    ]
   ]
  },
  "byte_hit": {
   "fps": 8,
   "loop": false,
   "w": 12,
   "h": 12,
   "frames": [
    [
     ".....LL.....",
     ".....LL.....",
     "..LLLLLLLL..",
     ".LLLLLLLLLL.",
     ".LLLKLKLLLL.",
     ".LLLLKLLLLL.",
     ".LLLKLKKKKK.",
     ".LLLLLLLKKK.",
     ".LLLLLLLLLL.",
     "..LLLLLLLL..",
     "...LL..LL...",
     "...LL..LL..."
    ]
   ]
  },
  "boss_walk": {
   "fps": 5,
   "loop": true,
   "w": 20,
   "h": 16,
   "frames": [
    [
     "...pp..........pp...",
     "..pPPp........pPPp..",
     "..PPPP........PPPP..",
     "...PPPPPPPPPPPPPP...",
     "..PPPPPPPPPPPPPPPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPPPPPppppPPPPPP..",
     "..PPPPPpPPPPpPPPPP..",
     "...PPPPPppppPPPPP...",
     "...PPPPPPPPPPPPPP...",
     "...GGGGGGGGGGGGGG...",
     "...PPPPPPPPPPPPPP...",
     "....PPP......PPP....",
     "....PPp......pPP....",
     "...WW..........WW..."
    ],
    [
     "...pp..........pp...",
     "..pPPp........pPPp..",
     "..PPPP........PPPP..",
     "...PPPPPPPPPPPPPP...",
     "..PPPPPPPPPPPPPPPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPPPPPppppPPPPPP..",
     "..PPPPPpPPPPpPPPPP..",
     "...PPPPPppppPPPPP...",
     "...PPPPPPPPPPPPPP...",
     "...GGGGGGGGGGGGGG...",
     "...PPPPPPPPPPPPPP...",
     "....PPP......PPP....",
     "....pPP......PPp....",
     ".....WW......WW....."
    ]
   ]
  },
  "boss_slam": {
   "fps": 8,
   "loop": false,
   "w": 20,
   "h": 16,
   "frames": [
    [
     "...pp..........pp...",
     "..pPPp........pPPp..",
     "..PPPP........PPPP..",
     "...PPPPPPPPPPPPPP...",
     "..PPPPPPPPPPPPPPPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPPPPPppppPPPPPP..",
     "..PPPPPpPPPPpPPPPP..",
     "...PPPPPppppPPPPP...",
     "...PPPPPPPPPPPPPP...",
     "...GGGGGGGGGGGGGG...",
     "...PPPPPPPPPPPPPP...",
     "....PPP......PPP....",
     "....PPp......pPP....",
     "...WW..........WW..."
    ],
    [
     "W..pp..........pp..W",
     "WWpPPp........pPPpWW",
     ".PPPPP........PPPPP.",
     ".PPPPPPPPPPPPPPPPPP.",
     "..PPPPPPPPPPPPPPPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPKKPPPPPPPPKKPP..",
     "..PPPPPKKKKKKPPPPP..",
     "..PPPPPKPPPPKPPPPP..",
     "...PPPPKKKKKKPPPP...",
     "...PPPPPPPPPPPPPP...",
     "...GGGGGGGGGGGGGG...",
     "...PPPPPPPPPPPPPP...",
     "....PPP......PPP....",
     "....PPp......pPP....",
     "...WW..........WW..."
    ]
   ]
  },
  "boss_hit": {
   "fps": 10,
   "loop": false,
   "w": 20,
   "h": 16,
   "frames": [
    [
     "...LL..........LL...",
     "..LLLL........LLLL..",
     "..LLLL........LLLL..",
     "...LLLLLLLLLLLLLL...",
     "..LLLLLLLLLLLLLLLL..",
     "..LLKKLLLLLLLLKKLL..",
     "..LLKKLLLLLLLLKKLL..",
     "..LLLLLLLLLLLLLLLL..",
     "..LLLLLLLLLLLLLLLL..",
     "...LLLLLLLLLLLLLL...",
     "...LLLLLLLLLLLLLL...",
     "...GGGGGGGGGGGGGG...",
     "...LLLLLLLLLLLLLL...",
     "....LLL......LLL....",
     "....LLL......LLL....",
     "...WW..........WW..."
    ]
   ]
  },
  "creds_spin": {
   "fps": 8,
   "loop": true,
   "w": 8,
   "h": 8,
   "frames": [
    [
     "........",
     ".vvVVvv.",
     "vvVVVVvv",
     "vVVVVVVv",
     "vVVVVVVv",
     "vvVVVVvv",
     ".vvVVvv.",
     "........"
    ],
    [
     "........",
     "..vVVv..",
     "..VVVV..",
     ".vVVVVv.",
     ".vVVVVv.",
     "..VVVV..",
     "..vVVv..",
     "........"
    ],
    [
     "........",
     "...vv...",
     "...VV...",
     "...VV...",
     "...VV...",
     "...VV...",
     "...vv...",
     "........"
    ],
    [
     "........",
     "..vVVv..",
     "..VVVV..",
     ".vVVVVv.",
     ".vVVVVv.",
     "..VVVV..",
     "..vVVv..",
     "........"
    ]
   ]
  },
  "restock_pulse": {
   "fps": 6,
   "loop": true,
   "w": 12,
   "h": 12,
   "frames": [
    [
     ".....gg.....",
     "...gggggg...",
     "..gg....gg..",
     ".gg.GGGG.gg.",
     ".g.GKKGGG.g.",
     "gg.GKGKGG.gg",
     "gg.GKKGGG.gg",
     ".g.GKGKGG.g.",
     ".gg.KGKG.gg.",
     "..gg....gg..",
     "...gggggg...",
     ".....gg....."
    ],
    [
     "...gggggg...",
     "..gg....gg..",
     ".gg..GG..gg.",
     "gg.GGGGGG.gg",
     "g..GKKGGG..g",
     "g.GGKGKGGG.g",
     "g.GGKKGGGG.g",
     "g..GKGKGG..g",
     "gg.GKGKGG.gg",
     ".gg..GG..gg.",
     "..gg....gg..",
     "...gggggg..."
    ]
   ]
  },
  "loot_pulse": {
   "fps": 7,
   "loop": true,
   "w": 12,
   "h": 12,
   "frames": [
    [
     ".....cc.....",
     "...cccccc...",
     "..c..CC..c..",
     ".c.CCCCCC.c.",
     ".c.C....C.c.",
     "ccCC.CC.CCcc",
     "ccCC.CC.CCcc",
     ".c.C....C.c.",
     ".c.CCCCCC.c.",
     "..c..CC..c..",
     "...cccccc...",
     ".....cc....."
    ],
    [
     "...cccccc...",
     "..cc....cc..",
     ".c..CCCC..c.",
     "cc.C....C.cc",
     "c.C......C.c",
     "c.C..CC..C.c",
     "c.C..CC..C.c",
     "c.C......C.c",
     "cc.C....C.cc",
     ".c..CCCC..c.",
     "..cc....cc..",
     "...cccccc..."
    ]
   ]
  },
  "chrono_coin": {
   "fps": 6,
   "loop": true,
   "w": 10,
   "h": 10,
   "frames": [
    [
     "....yy....",
     "..yyyyyy..",
     ".yyYKYYyy.",
     ".yYYKYYYy.",
     "yyYYKKYYyy",
     "yyYYKKYYyy",
     ".yYYYYYYy.",
     ".yyYYYYyy.",
     "..yyyyyy..",
     "....yy...."
    ],
    [
     "....yy....",
     "..yyyyyy..",
     ".yyYYYYyy.",
     ".yYYYYYYy.",
     "yyYYKKKKyy",
     "yyYYKKYYyy",
     ".yYYYYYYy.",
     ".yyYYYYyy.",
     "..yyyyyy..",
     "....yy...."
    ],
    [
     "....yy....",
     "..yyyyyy..",
     ".yyYYYYyy.",
     ".yYYYYYYy.",
     "yyYYKKYYyy",
     "yyYYKKYYyy",
     ".yYYYKYYy.",
     ".yyYYKYyy.",
     "..yyyyyy..",
     "....yy...."
    ],
    [
     "....yy....",
     "..yyyyyy..",
     ".yyYYYYyy.",
     ".yYYYYYYy.",
     "yyYYKKYYyy",
     "yyKKKKYYyy",
     ".yYYYYYYy.",
     ".yyYYYYyy.",
     "..yyyyyy..",
     "....yy...."
    ]
   ]
  },
  "hourglass_drain": {
   "fps": 3,
   "loop": true,
   "w": 10,
   "h": 12,
   "frames": [
    [
     "yyyyyyyyyy",
     ".y......y.",
     ".yYYYYYYy.",
     "..yYYYYy..",
     "...yYYy...",
     "....yy....",
     "....yy....",
     "...y..y...",
     "..y....y..",
     ".y......y.",
     ".y......y.",
     "yyyyyyyyyy"
    ],
    [
     "yyyyyyyyyy",
     ".y......y.",
     ".y..YY..y.",
     "..y.YY.y..",
     "...yYYy...",
     "....Yy....",
     "....yY....",
     "...y..y...",
     "..y.YY.y..",
     ".y.YYYY.y.",
     ".yYYYYYYy.",
     "yyyyyyyyyy"
    ],
    [
     "yyyyyyyyyy",
     ".y......y.",
     ".y......y.",
     "..y....y..",
     "...y..y...",
     "....yy....",
     "....yy....",
     "...yYYy...",
     "..yYYYYy..",
     ".yYYYYYYy.",
     ".yYYYYYYy.",
     "yyyyyyyyyy"
    ]
   ]
  },
  "champ_idle": {
   "fps": 4,
   "loop": true,
   "w": 14,
   "h": 12,
   "frames": [
    [
     ".....GGGG.....",
     "....GGGGGG....",
     "....GKGGKG....",
     "....GGGGGG....",
     ".....GGGG.....",
     "..OO.DDDD.OO..",
     "..OOGDDDDGOO..",
     ".....DDDD.....",
     ".....DDDD.....",
     ".....G..G.....",
     ".....G..G.....",
     "....GG..GG...."
    ],
    [
     "..............",
     ".....GGGG.....",
     "....GGGGGG....",
     "....GKGGKG....",
     "....GGGGGG....",
     ".....GGGG.....",
     "..OO.DDDD.OO..",
     "..OOGDDDDGOO..",
     ".....DDDD.....",
     ".....DDDD.....",
     ".....G..G.....",
     ".....G..G....."
    ]
   ]
  },
  "champ_jab": {
   "fps": 8,
   "loop": false,
   "w": 14,
   "h": 12,
   "frames": [
    [
     ".....GGGG.....",
     "....GGGGGG....",
     "....GKGGKG....",
     "....GGGGGG....",
     ".....GGGG.....",
     "..OO.DDDD.OO..",
     "..OOGDDDDGOO..",
     ".....DDDD.....",
     ".....DDDD.....",
     ".....G..G.....",
     ".....G..G.....",
     "....GG..GG...."
    ],
    [
     ".....GGGG.....",
     "....GGGGGG....",
     "....GKGGKG....",
     "....GGGGGG....",
     ".....GGGG.....",
     "..OO.DDDD.....",
     "..OOGDDDDGOOOO",
     ".....DDDD.....",
     ".....DDDD.....",
     ".....G..G.....",
     ".....G..G.....",
     "....GG..GG...."
    ]
   ]
  },
  "champ_ko": {
   "fps": 0,
   "loop": false,
   "w": 14,
   "h": 12,
   "frames": [
    [
     "..............",
     "..............",
     "..............",
     "..W........W..",
     "..............",
     "..............",
     "..............",
     "..............",
     "..............",
     "..OO......OO..",
     ".GGGGGDDDDGG..",
     ".GGGGGDDDDGG.."
    ]
   ]
  },
  "sell_block": {
   "fps": 4,
   "loop": true,
   "w": 12,
   "h": 9,
   "frames": [
    [
     "rrrrrrrrrrrr",
     "rKRRRRRRRRRr",
     "rRWKRRRRKWRr",
     "rRRRRRRRRRRr",
     "rRRKKKKKKRRr",
     "rRRRRRRRRRRr",
     "rrrrrrrrrrrr",
     "..R..RR..R..",
     "..R..RR..R.."
    ],
    [
     "rrrrrrrrrrrr",
     "rKRRRRRRRRRr",
     "rRWKRRRRKWRr",
     "rRRRRRRRRRRr",
     "rRRKKKKKKRRr",
     "rRRRRRRRRRRr",
     "rrrrrrrrrrrr",
     ".R...RR...R.",
     "R....RR....R"
    ]
   ]
  },
  "order_cannon": {
   "fps": 8,
   "loop": false,
   "w": 14,
   "h": 9,
   "frames": [
    [
     "..............",
     "......GG......",
     "......GG......",
     ".....GGGG.....",
     "....GGGGGG....",
     "..GGGDDDDGGG..",
     ".GGGGDDDDGGGG.",
     ".GGGGGGGGGGGG.",
     ".gggggggggggg."
    ],
    [
     "......WW......",
     ".....YWWY.....",
     "......GG......",
     ".....GGGG.....",
     "....GGGGGG....",
     "..GGGDDDDGGG..",
     ".GGGGDDDDGGGG.",
     ".GGGGGGGGGGGG.",
     ".gggggggggggg."
    ]
   ]
  },
  "moth_flap": {
   "fps": 10,
   "loop": true,
   "w": 12,
   "h": 10,
   "frames": [
    [
     "....y..y....",
     ".....YY.....",
     "LL...GG...LL",
     "LLL..GG..LLL",
     ".LLL.GG.LLL.",
     "..LLLGGLLL..",
     ".....GG.....",
     ".....GG.....",
     ".....gg.....",
     "............"
    ],
    [
     "....y..y....",
     ".....YY.....",
     ".....GG.....",
     ".....GG.....",
     "LLLLLGGLLLLL",
     ".LLLLGGLLLL.",
     ".....GG.....",
     ".....GG.....",
     ".....gg.....",
     "............"
    ],
    [
     "....y..y....",
     ".....YY.....",
     ".....GG.....",
     ".....GG.....",
     ".....GG.....",
     "..LLLGGLLL..",
     ".LLL.GG.LLL.",
     "LLL..GG..LLL",
     "LL...gg...LL",
     "............"
    ]
   ]
  },
  "rug_rat": {
   "fps": 6,
   "loop": false,
   "w": 12,
   "h": 12,
   "frames": [
    [
     "............",
     "............",
     "............",
     "............",
     "............",
     "............",
     "..V......V..",
     "..VV....VV..",
     "..VVVVVVVV..",
     "..VWKVVKWV..",
     "kkkkkkkkkkkk",
     ".kkkkkkkkkk."
    ],
    [
     "............",
     "............",
     "..V......V..",
     "..VV....VV..",
     "..VVVVVVVV..",
     "..VWKVVKWV..",
     "..VVvvvvVV..",
     "...VVVVVV...",
     "...VVVVVV...",
     "....VVVV....",
     "kkkkkkkkkkkk",
     ".kkkkkkkkkk."
    ],
    [
     "............",
     "............",
     "............",
     "............",
     "............",
     "............",
     ".W........W.",
     "..VVVVVVVV..",
     ".VVKVVVVKVV.",
     ".VVVVVVVVVV.",
     "kkkkkkkkkkkk",
     ".kkkkkkkkkk."
    ]
   ]
  },
  "hopper_jump": {
   "fps": 8,
   "loop": false,
   "w": 12,
   "h": 9,
   "frames": [
    [
     "..GG....GG..",
     "..GKG..GKG..",
     ".GGGGGGGGGG.",
     ".GGGGGGGGGG.",
     ".GLLLLLLLLG.",
     ".GGGGGGGGGG.",
     ".GG......GG.",
     "GGg......gGG",
     "............"
    ],
    [
     "............",
     "..GG....GG..",
     "..GKG..GKG..",
     ".GGGGGGGGGG.",
     ".GGGGGGGGGG.",
     ".GLLLLLLLLG.",
     ".GGGGGGGGGG.",
     ".GGg....gGG.",
     "............"
    ],
    [
     "..GG....GG..",
     "..GKG..GKG..",
     ".GGGGGGGGGG.",
     ".GGGGGGGGGG.",
     ".GLLLLLLLLG.",
     ".GGGGGGGGGG.",
     "..G......G..",
     ".G........G.",
     "G..........G"
    ]
   ]
  },
  "stack_candle": {
   "fps": 8,
   "loop": false,
   "w": 12,
   "h": 7,
   "frames": [
    [
     ".....LL.....",
     "GGGGGGGGGGGG",
     "GGGGGGGGGGGG",
     "GGGGGGGGGGGG",
     "GGGGGGGGGGGG",
     "gggggggggggg",
     ".....LL....."
    ],
    [
     "............",
     ".....LL.....",
     "GGGGGGGGGGGG",
     "GGGGGGGGGGGG",
     "GGGGGGGGGGGG",
     "gggggggggggg",
     "W....LL....W"
    ]
   ]
  },
  "card_flip": {
   "fps": 8,
   "loop": false,
   "w": 10,
   "h": 14,
   "frames": [
    [
     "GGGGGGGGGG",
     "GkkkkkkkkG",
     "GkkkkkkkkG",
     "GkkkGGkkkG",
     "GkkGGGGkkG",
     "GkGGkkGGkG",
     "GkGGkkGGkG",
     "GkkGGGGkkG",
     "GkkkGGkkkG",
     "GkkkkkkkkG",
     "GkkkkkkkkG",
     "GkkkkkkkkG",
     "GkkkkkkkkG",
     "GGGGGGGGGG"
    ],
    [
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG....",
     "....GG...."
    ],
    [
     "GGGGGGGGGG",
     "GkkkkkkkkG",
     "Gkk..L.kkG",
     "Gkk..G.kkG",
     "GkGG.G.kkG",
     "GkGG.G.RkG",
     "GkGG.G.RkG",
     "GkGG...RkG",
     "GkGG...RkG",
     "Gk.L...RkG",
     "Gk.....R.G",
     "GkkkkkkkkG",
     "GkkkkkkkkG",
     "GGGGGGGGGG"
    ]
   ]
  },
  "spring_pad": {
   "fps": 10,
   "loop": false,
   "w": 12,
   "h": 8,
   "frames": [
    [
     "............",
     "............",
     "............",
     "............",
     "............",
     ".CCCCCCCCCC.",
     "..c..cc..c..",
     ".kkkkkkkkkk."
    ],
    [
     "............",
     "............",
     "............",
     ".CCCCCCCCCC.",
     "..c......c..",
     "...c....c...",
     "..c......c..",
     ".kkkkkkkkkk."
    ],
    [
     ".CCCCCCCCCC.",
     "..c......c..",
     "...c....c...",
     "..c......c..",
     "...c....c...",
     "..c......c..",
     "...c....c...",
     ".kkkkkkkkkk."
    ]
   ]
  },
  "term_bot": {
   "fps": 4,
   "loop": true,
   "w": 12,
   "h": 10,
   "frames": [
    [
     "......b.....",
     "......b.....",
     "..kkkkkkkk..",
     ".kBBBBBBBBk.",
     ".kBGGBBGGBk.",
     ".kBBBBBBBBk.",
     "..kkkkkkkk..",
     "...k....k...",
     "..C......C..",
     "............"
    ],
    [
     "............",
     "......b.....",
     "......b.....",
     "..kkkkkkkk..",
     ".kBBBBBBBBk.",
     ".kBggBBggBk.",
     ".kBBBBBBBBk.",
     "..kkkkkkkk..",
     "...k....k...",
     "..c......c.."
    ]
   ]
  },
  "build_drone": {
   "fps": 6,
   "loop": true,
   "w": 12,
   "h": 10,
   "frames": [
    [
     ".WWWWWWWWWW.",
     ".kOOOOOOOOk.",
     ".kOWKOOKWOk.",
     ".kOOOOOOOOk.",
     "..kkkkkkkk..",
     "....k..k....",
     "...GGGGGG...",
     "...GGGGGG...",
     "............",
     "............"
    ],
    [
     "..WWWWWWWW..",
     ".kOOOOOOOOk.",
     ".kOWKOOKWOk.",
     ".kOOOOOOOOk.",
     "..kkkkkkkk..",
     "....k..k....",
     "............",
     "...GGGGGG...",
     "...GGGGGG...",
     "............"
    ]
   ]
  },
  "swap_orb": {
   "fps": 5,
   "loop": true,
   "w": 12,
   "h": 12,
   "frames": [
    [
     "............",
     "..GGGGGG....",
     ".......GG...",
     "........G...",
     "....vVVv....",
     "...vVVVVv...",
     "...vVVVVv...",
     "....vVVv....",
     "...G........",
     "..GG........",
     "....GGGGGG..",
     "............"
    ],
    [
     "............",
     ".G..........",
     "GGG.......G.",
     ".G........G.",
     ".G..vVVv..G.",
     ".G.vVVVVv.G.",
     ".G.vVVVVv.G.",
     ".G..vVVv..G.",
     ".G........G.",
     ".G.......GGG",
     "..........G.",
     "............"
    ]
   ]
  },
  "lesson_star": {
   "fps": 4,
   "loop": true,
   "w": 11,
   "h": 8,
   "frames": [
    [
     ".....Y.....",
     "....YYY....",
     "....YYY....",
     "YYYYYYYYYYY",
     ".YYYYYYYYY.",
     "..YYYYYYY..",
     "..YYY.YYY..",
     ".YYY...YYY."
    ],
    [
     "W....Y....W",
     "....YYY....",
     "....YWY....",
     "YYYYYWYYYYY",
     ".YYYYWYYYY.",
     "..YYYYYYY..",
     "..YYY.YYY..",
     ".YYY...YYY."
    ]
   ]
  }
 }
};

// Draw one frame centered at (0,0); scale = pixel size; tint remaps the green family.
function crDrawSprite(ctx, name, frameIdx, scale, tint){
  const a = CR_SPRITES.anims[name]; if(!a) return;
  const grid = a.frames[frameIdx % a.frames.length];
  const px = scale || 1;
  const TINTABLE = {G:1,g:1,D:1};
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid[y].length;x++){
      const c = grid[y][x];
      if(c === '.' || !CR_SPRITES.pal[c]) continue;
      ctx.fillStyle = (tint && TINTABLE[c]) ? tint : CR_SPRITES.pal[c];
      ctx.fillRect((x - a.w/2)*px, (y - a.h/2)*px, px, px);
    }
  }
}
// Animation helper: pick frame from a running clock (ms).
function crSpriteFrame(name, tMs){
  const a = CR_SPRITES.anims[name]; if(!a || !a.fps) return 0;
  const f = Math.floor(tMs/1000 * a.fps);
  return a.loop ? (f % a.frames.length) : Math.min(f, a.frames.length-1);
}
