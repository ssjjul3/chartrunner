/* ChartRunner share card — canvas renderer, matches the CANON posting-card design
   (cream nav + invader badge · left context · right DATA BLOCK (Archivo Black) ·
    general = invader+candle panel · footer + gradient rule · pure-black + green #33e88a).
   Data-only (no CTA) — the export form used for share/link previews.
   render(canvas,{type,value,sub,foot}); fromRun(canvas,runSummary). Dependency-free. */
(function (global) {
  const C = { bg:'#060a08', cream:'#ece7d6', green:'#33e88a', lime:'#84ff5a', gray:'#8b95a3',
              purple:'#9b8cff', cyan:'#46e8ff', red:'#ff4d6a', navbg:'#ece9dc', navtx:'#12160f' };
  const INV = [[14,0,7,7],[56,0,7,7],[21,7,7,7],[49,7,7,7],[14,14,49,7],[7,21,14,7],
    [28,21,21,7],[56,21,14,7],[0,28,77,7],[0,35,7,7],[14,35,49,7],[70,35,7,7],
    [0,42,7,7],[14,42,7,7],[56,42,7,7],[70,42,7,7],[21,49,14,7],[42,49,14,7]];
  const DISP = '"Archivo Black","Arial Black",sans-serif';
  const MONO = '"JetBrains Mono",ui-monospace,Menlo,monospace';

  // full canon content per type; value/sub override the live bits
  const T = {
    general:     { general:true, prompt:'> PRESS PLAY TO RUN THE CHARTS _', hero:['$RUN THE','CHARTS.'],
                   sub:'Trade the chart. Upside-down.', foot:'chartrunner.xyz · mobile + desktop', ftype:'GENERAL' },
    // v1.0.630 — richer PNL card: tag = SPOT / leverage× / ON-CHAIN (brainstormed set,
    // see docs prompt) rendered as the kind pill; sub now carries entry->exit price
    // AND time (was just duration), so the card reads as a full trade receipt, not
    // just a percentage. Swap `tag`/`tagColor`/`sub` per run kind — this default is
    // the leveraged-long sample.
    // v1.0.630c — leverage was stated twice (tag pill "3x LEVERAGE" + "long 3x" in the
    // market box) — dropped the redundant "3x" from the box, the tag is the one source
    // of truth for leverage now. MARKET folded in as its own box (was a floating line
    // above the boxes); peak/drawdown/liq now render as chips (dstats), not a floating
    // line either — nothing on this card is unboxed text anymore except captions.
    pnl:         { chip:'RUN RESULT · PAPER', tag:'3x LEVERAGE', tagColor:'purple', prompt:'> RUN CLOSED _', lead:['Ride closed','in the green.'],
                   stats:[{k:'MARKET',v:'BTC · 5m · long'},{k:'ENTRY',v:'63,180 @ 14:02'},{k:'EXIT',v:'64,510 @ 16:14'}],
                   dstats:[{k:'PEAK',v:'+261%'},{k:'DRAWDOWN',v:'-12%'},{k:'LIQ',v:'51,900'}],
                   value:'+247.5%', size:1, color:'green',
                   foot:'chartrunner.xyz · simulated', ftype:'PNL CARD' },
    // v1.0.630b — blabel dropped (the checkered-flag logo is the panel's identity now,
    // "SPRINT TIME" read redundant next to it); rank added (rendered under the flag);
    // "sprint" reworded to "race" throughout — this is RACING, not a sprint minigame.
    racing:      { wordmark:true, wtag:'RACING', finish:true, rank:'#3', prompt:'> NEW PERSONAL BEST _', lead:['Race the','candles.'],
                   sub:'SOL · 1m race · rank #3 today', value:'01:23.45', size:1, color:'cream',
                   dsub:'^ personal best', dsubColor:'green', foot:'chartrunner.xyz', ftype:'RACING CARD' },
    monster:     { chip:'BOSS DOWN · ROUND 12', prompt:'> VOLATILITY SPIKE SURVIVED _', lead:['No rail.','No fear.'],
                   sub:'ETH · 15m · combo x8', blabel:'RESULT', value:'BEAR\nSLAIN', size:2, color:'green',
                   dsub:'round 12 · combo x8', foot:'chartrunner.xyz', ftype:'MONSTER CARD' },
    map:         { chip:'SHARED MAP', prompt:'> LOAD THIS RUN _', lead:['The exact chart,','one tap away.'],
                   sub:'SOL · 5m window · shared by @ssjjul3', blabel:'MAP NAME', value:'“RANGE\nROOM”', size:2, color:'cream',
                   dsub:'', foot:'chartrunner.xyz/?map=range-room', ftype:'MAP CARD' },
    multiplayer: { chip:'LIVE ROOM · 3 RUNNERS', prompt:'> RUNNERS IN THE ROOM _', lead:['Same chart.','Race live.'],
                   sub:'Guests + wallets welcome — join the run.', blabel:'ROOM CODE', value:'#A3F2', size:1, color:'cream',
                   dsub:'3 runners live', dsubColor:'green', foot:'chartrunner.xyz/?room=A3F2', ftype:'MULTIPLAYER CARD' },
    leaderboard: { chip:'WEEKLY BOARD', prompt:'> TOP OF THE BOARD _', lead:['Top runner','this week.'],
                   sub:'14,820 pts · 37 clean runs', blabel:'RANK · @SSJJUL3', value:'#1', size:1, color:'green',
                   dsub:'14,820 pts', foot:'chartrunner.xyz', ftype:'LEADERBOARD CARD' },
    alert:       { chip:'ALERT · LEVEL HIT', prompt:'> THE RAIL APPEARS _', lead:['Resistance','overhead.'],
                   sub:'BTC · 3rd rejection at the level', blabel:'LEVEL · BTC', value:'63,000', size:1, color:'red',
                   dsub:'3rd rejection', foot:'chartrunner.xyz', ftype:'ALERT CARD' },
    // v1.0.630 — dedicated deep-link card (was missing; the regular "open this chart"
    // link had no proper type and briefly borrowed `version`, which reads wrong —
    // "SHIPPED · LIVE NOW" doesn't make sense for a plain chart link).
    chart:       { chip:'LIVE CHART', prompt:'> OPEN THIS CHART _', lead:['Same chart,','one tap in.'],
                   sub:'Opens straight into this asset + timeframe.', blabel:'ASSET · TIMEFRAME', value:'BTC · 15M', size:1, color:'cream',
                   dsub:'', foot:'chartrunner.xyz', ftype:'CHART CARD' },
    version:     { chip:'SHIPPED · LIVE NOW', prompt:'> RUNTIME UPDATED _', lead:['Reload','and run.'],
                   sub:'Pyth guard · faster tf-switch · new sprint board', blabel:'RUNTIME', value:'v1.0.605', size:1, color:'green',
                   dsub:'live on chartrunner.xyz', foot:'chartrunner.xyz', ftype:'VERSION CARD' },
  };

  function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function invader(ctx,x,y,s,col){ ctx.fillStyle=col; for(const [a,b,w,h] of INV) ctx.fillRect(x+a*s,y+b*s,w*s,h*s); }

  function render(canvas, opt) {
    opt = opt || {};
    const W=1200, H=630, ctx=canvas.getContext('2d');
    canvas.width=W; canvas.height=H;
    const t = Object.assign({}, T[opt.type] || T.general);
    if (opt.value != null && opt.value !== '') t.value = String(opt.value);
    if (opt.sub   != null) t.sub = String(opt.sub);
    if (opt.foot  != null) t.foot = String(opt.foot);

    // background + radial green glow
    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);
    let rg = ctx.createRadialGradient(W*0.84,H*0.14,0, W*0.84,H*0.14,W*0.62);
    rg.addColorStop(0,'rgba(40,220,120,0.10)'); rg.addColorStop(1,'rgba(40,220,120,0)');
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);

    // grid (below nav), faint, brighter top-right
    ctx.strokeStyle='rgba(120,255,170,0.06)'; ctx.lineWidth=1;
    for(let x=0;x<=W;x+=46){ ctx.beginPath(); ctx.moveTo(x,58); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=58;y<=H;y+=46){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // nav bar
    ctx.fillStyle=C.navbg; ctx.fillRect(0,0,W,58);
    ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillStyle=C.navtx; ctx.font='800 19px '+MONO;
    let nx=26; for(const it of ['Home','Play','Docs','Roadmap']){ ctx.fillText(it,nx,31); nx+=ctx.measureText(it).width+28; }
    // right: ChartRunnerOS + badge
    ctx.textAlign='right'; ctx.fillText('ChartRunnerOS', W-26, 31);
    const osW = ctx.measureText('ChartRunnerOS').width;
    const bx = W-26-osW-12-40;
    ctx.fillStyle=C.bg; rr(ctx,bx,9,40,40,7); ctx.fill();
    ctx.strokeStyle=C.green; ctx.lineWidth=1.5; rr(ctx,bx,9,40,40,7); ctx.stroke();
    invader(ctx, bx+9, 20, 22/77, C.green);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    // ---- LEFT column (x=56, width 560) ----
    const LX=56;
    let y=104;
    if (t.wordmark){
      // CHART RUNNER RACING wordmark — same two-tone treatment as the in-game
      // end-card (green CHART, cyan RUNNER, pink ▰▰ tag underneath) instead of the
      // plain pill chip, so the static share card matches in-game branding.
      // Mirrored by the 🏁 FINISH tag in the data panel (see t.finish below) so the
      // wordmark (left) and finish flag (right) sit symmetrically across the card.
      // v1.0.630b — bumped up a size across the board (chip/prompt/wordmark/sub/blabel/
      // dsub all read too small against the big hero/value text at card-thumbnail scale).
      ctx.font='900 34px '+DISP;
      ctx.fillStyle=C.green; ctx.fillText('CHART', LX, y+26);
      const cw2=ctx.measureText('CHART ').width;
      ctx.fillStyle=C.cyan; ctx.fillText('RUNNER', LX+cw2, y+26);
      ctx.font='800 15px '+MONO; ctx.fillStyle=C.red;
      // ASCII dashes, not ▰▰ — same tofu-glyph issue as the FINISH emoji above;
      // the in-game DOM version can keep ▰▰ since real browsers render it fine.
      ctx.fillText('--  '+t.wtag+'  --', LX, y+50);
      y+=50+18;
    } else if (t.chip){ ctx.font='700 16px '+MONO; const cw=ctx.measureText(t.chip).width+28;
      ctx.strokeStyle=C.green; ctx.lineWidth=1; rr(ctx,LX,y,cw,36,5); ctx.stroke();
      ctx.fillStyle=C.green; ctx.fillText(t.chip, LX+14, y+23); y+=36+14; }
    // prompt
    ctx.fillStyle=C.green; ctx.font='700 27px '+MONO; ctx.fillText(t.prompt, LX, y+20); y+=44;
    // hero (general) or lead (data)
    if (t.general){ ctx.fillStyle=C.cream; ctx.font='112px '+DISP;
      ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowOffsetX=5; ctx.shadowOffsetY=6;
      t.hero.forEach((ln,i)=>ctx.fillText(ln, LX, y+96+i*104)); ctx.shadowColor='transparent'; ctx.shadowOffsetX=ctx.shadowOffsetY=0;
    } else { ctx.fillStyle=C.cream; ctx.font='46px '+DISP;
      t.lead.forEach((ln,i)=>ctx.fillText(ln, LX, y+40+i*47)); }
    // sub (bottom of body) — OR, if the type carries `stats`, a row of small bordered
    // boxes (same rounded-border treatment as the right-hand hero/data panel via
    // panelBox) instead of one run-on wrapped line. v1.0.630b: the plain wrapped
    // "BTC · 5m · long 3x · entry 63,180 @ 14:02 -> exit 64,510 @ 16:14" read as a
    // messy paragraph — entry/exit now render as their own ENTRY/EXIT boxes.
    if (t.stats && t.stats.length){
      // v1.0.630c — the plain sub line ("BTC · 5m · long 3x") floating above the
      // boxes was the same "text with no container" problem as the old entry/exit
      // paragraph — folded it in as its own MARKET box so the whole row is one
      // consistent boxed unit instead of a label line + boxes underneath it.
      const n=t.stats.length, gap=12, sbw=(560-gap*(n-1))/n, sbh=56, sby=500;
      t.stats.forEach((s,i)=>{
        const sx=LX+i*(sbw+gap);
        panelBox(ctx, sx, sby, sbw, sbh);
        ctx.fillStyle=C.gray; ctx.font='700 11.5px '+MONO; ctx.fillText(s.k.toUpperCase(), sx+14, sby+22);
        ctx.fillStyle=C.cream; ctx.font='700 16px '+MONO; ctx.fillText(s.v, sx+14, sby+43);
      });
    } else {
      ctx.fillStyle=C.gray; ctx.font='21px '+MONO;
      wrapText(ctx, subWithPurple(t.sub), LX, 520, 560, 27);
    }

    // ---- RIGHT ----
    if (t.general){
      // panel: invader (lime) + candle bars
      const px=784, py=100, pw=360, ph=410;
      panelBox(ctx,px,py,pw,ph);
      invader(ctx, px+pw/2-60, py+96, 120/77, C.lime);
      const cx0=px+pw/2-((5*15+4*7)/2), base=py+320;
      const cs=[[104,C.red],[70,C.lime],[118,C.lime],[88,C.lime],[130,C.lime]];
      cs.forEach((c,i)=>{ const x=cx0+i*(15+7); ctx.fillStyle=c[1];
        ctx.fillRect(x, base-c[0], 15, c[0]); ctx.fillRect(x+15/2-1.5, base-c[0]-9, 3, c[0]+18); });
    } else {
      // data block
      const bx2=650, by=100, bw=W-56-650, bh=410;
      panelBox(ctx,bx2,by,bw,bh);
      const cxc=bx2+bw/2, cyc=by+bh/2;
      ctx.textAlign='center';
      // v1.0.630 — checkered-flag drawn as pixels (not an emoji glyph): the CI
      // renderer (@napi-rs/canvas, node) only has Archivo Black + JetBrains Mono
      // registered, so 🏁 rendered as a tofu box in the committed PNG. A live
      // browser canvas (the in-game share card) has real emoji fonts and is fine.
      if (t.finish){
        // v1.0.630b — was a tiny inline flag+"FINISH" caption crammed above the
        // "SPRINT TIME" label. That label is dropped now (racing no longer sets
        // blabel), so this became the panel's real visual anchor — a proper-sized
        // checkered-flag racing logo on its own pole, using the freed vertical space.
        const cols=9, cell=10, rows=6, flagW=cols*cell, flagH=rows*cell;
        const fx=cxc-flagW/2, fyy=by+18;
        for(let r2=0;r2<rows;r2++) for(let c2=0;c2<cols;c2++){
          ctx.fillStyle=((r2+c2)%2===0)?C.cream:'#0c1410'; ctx.fillRect(fx+c2*cell, fyy+r2*cell, cell, cell); }
        ctx.strokeStyle=C.green; ctx.lineWidth=1.5; ctx.strokeRect(fx, fyy, flagW, flagH);
        ctx.strokeStyle=C.gray; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(fx-3, fyy); ctx.lineTo(fx-3, fyy+flagH+16); ctx.stroke();
        if (t.rank){
          ctx.font='800 14px '+MONO; ctx.fillStyle=C.green;
          ctx.fillText('GLOBAL RANK · ' + t.rank, cxc, fyy+flagH+34);
        }
      } else if (t.tag){
        // v1.0.630 — generic kind pill (e.g. SPOT / 3X LEVERAGE / ON-CHAIN on the pnl
        // card) — a plain bordered label, same slot the FINISH checkered tag uses on
        // racing, so every data-block type gets one consistent "what kind of run is
        // this" marker without repeating the bespoke racing-only flag icon.
        ctx.font='800 15px '+MONO; const tw=ctx.measureText(t.tag).width+24;
        ctx.strokeStyle=C[t.tagColor]||C.green; ctx.lineWidth=1;
        rr(ctx, cxc-tw/2, by+18, tw, 28, 5); ctx.stroke();
        ctx.fillStyle=C[t.tagColor]||C.green; ctx.fillText(t.tag, cxc, by+36);
      }
      if (t.blabel){
        ctx.fillStyle=C.gray; ctx.font='700 17px '+MONO;
        ctx.fillText(t.blabel.toUpperCase(), cxc, by+70);
      }
      // value
      ctx.fillStyle=C[t.color]||C.green; const fs=t.size===2?64:96; ctx.font=fs+'px '+DISP;
      ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowOffsetX=4; ctx.shadowOffsetY=5;
      const vlines=String(t.value).split(/<br>|\n/);
      const vy = cyc - ((vlines.length-1)*fs*0.94)/2;
      vlines.forEach((ln,i)=>ctx.fillText(ln, cxc, vy+i*fs*0.94+fs*0.33));
      ctx.shadowColor='transparent'; ctx.shadowOffsetX=ctx.shadowOffsetY=0;
      if (t.dstats && t.dstats.length){
        // v1.0.630c — peak/drawdown/liq as bordered chips (same language as the
        // ENTRY/EXIT/MARKET boxes) instead of one floating gray line.
        ctx.font='700 12px '+MONO;
        const gap=8, padX=10, chipH=27;
        const widths = t.dstats.map(s => ctx.measureText(s.k.toUpperCase()+' '+s.v).width + padX*2);
        const totalW = widths.reduce((a,b)=>a+b,0) + gap*(widths.length-1);
        let cx0 = cxc - totalW/2; const chipY = by+bh-54;
        ctx.textAlign='left';
        t.dstats.forEach((s,i)=>{
          const w=widths[i];
          ctx.strokeStyle='rgba(51,232,138,.35)'; ctx.lineWidth=1; rr(ctx, cx0, chipY, w, chipH, 7); ctx.stroke();
          ctx.fillStyle=C.gray; ctx.fillText(s.k.toUpperCase()+' ', cx0+padX, chipY+18);
          const kw=ctx.measureText(s.k.toUpperCase()+' ').width;
          ctx.fillStyle=C.cream; ctx.fillText(s.v, cx0+padX+kw, chipY+18);
          cx0 += w+gap;
        });
        ctx.textAlign='center';
      } else if (t.dsub){ ctx.fillStyle=C[t.dsubColor]||C.gray; ctx.font='20px '+MONO; ctx.fillText(t.dsub, cxc, by+bh-56); }
      ctx.textAlign='left';
    }

    // footer + ftype + rule
    ctx.fillStyle=C.gray; ctx.font='15px '+MONO; ctx.fillText(t.foot, 56, H-16-4);
    ctx.fillStyle='#4c5a52'; ctx.textAlign='right'; ctx.font='13px '+MONO;
    ctx.fillText(t.ftype, W-56, H-16-4); ctx.textAlign='left';
    let g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'#ff2d8f'); g.addColorStop(.36,C.purple); g.addColorStop(.7,C.cyan); g.addColorStop(1,C.green);
    ctx.fillStyle=g; ctx.fillRect(0,H-6,W,6);
    return canvas;

    function panelBox(ctx,x,yy,w,h){
      const lg=ctx.createLinearGradient(0,yy,0,yy+h); lg.addColorStop(0,'rgba(18,50,38,.4)'); lg.addColorStop(1,'rgba(6,14,10,.45)');
      ctx.fillStyle=lg; rr(ctx,x,yy,w,h,18); ctx.fill();
      ctx.strokeStyle='rgba(51,232,138,.3)'; ctx.lineWidth=1; rr(ctx,x,yy,w,h,18); ctx.stroke();
    }
  }
  function subWithPurple(s){ return s; } // (purple accent kept simple in canvas)
  function wrapText(ctx, text, x, y, maxW, lh){
    const words=String(text).split(' '); let line='', yy=y;
    for(const w of words){ const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>maxW && line){ ctx.fillText(line,x,yy); line=w; yy+=lh; } else line=test; }
    if(line) ctx.fillText(line,x,yy);
  }

  function fromRun(canvas, run){
    run=run||{};
    const sub=[run.symbol,run.tf,run.side].filter(Boolean).join(' · ');
    const m={ pnl:{type:'pnl',value:run.pnl,sub}, racing:{type:'racing',value:run.time,sub},
      monster:{type:'monster',value:run.result,sub}, version:{type:'version',value:run.version},
      map:{type:'map',value:run.map}, multiplayer:{type:'multiplayer',value:run.room},
      leaderboard:{type:'leaderboard',value:run.rank}, alert:{type:'alert',value:run.level}, general:{type:'general'} };
    return render(canvas, m[run.type]||m.general);
  }
  global.CRShareCard = { render, fromRun, TYPES:T };
})(typeof window!=='undefined'?window:globalThis);
