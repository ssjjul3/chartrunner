/* ChartRunnerOS app-shell + Quests app (Missions in the Reminders layout) — v1, 2026-07-17
   Additive reference implementation of the app-shell (toolbar/sidebar/content/statusbar +
   smart-list cards + item rows + tags). Reads the live CHAPTERS quest data when reachable,
   with a real-content fallback. Launchable from a desktop chip. Touches nothing wired. */
(function CRShellApp(){
  if (window.__CR_SHELL__) return; window.__CR_SHELL__ = 1;
  var D = document;
  var DONE_LS = 'cr_quests_done_v1';
  var done = {};
  try { done = JSON.parse(localStorage.getItem(DONE_LS) || '{}'); } catch(e){}
  function saveDone(){ try { localStorage.setItem(DONE_LS, JSON.stringify(done)); } catch(e){} }

  // ---- data: live CHAPTERS, else real-content fallback ----
  var FALLBACK = [
    {goal:'Tour the ChartRunnerOS toolbar.', asset:'btc', tf:'15m'},
    {goal:'Place a Trendline (Tools laser).', asset:'btc', tf:'15m'},
    {goal:'Place an Anchored VWAP (Tools laser).', asset:'eth', tf:'1h'},
    {goal:'Place a Fib Retracement (Tools laser).', asset:'btc', tf:'15m'},
    {goal:'Drop an FRVP (Fixed-Range Volume Profile).', asset:'sol', tf:'5m'},
    {goal:'Draw a Parallel Channel — parallel trendlines.', asset:'eth', tf:'1h'},
    {goal:'Draw a Rectangle — mark a price zone.', asset:'sol', tf:'15m'},
    {goal:'Place a Ray — 1-anchor extending line.', asset:'btc', tf:'4h'}
  ];
  function quests(){
    var out = [];
    try {
      var C = window.CHAPTERS;
      if (C && typeof C === 'object'){
        Object.keys(C).forEach(function(k){
          var c = C[k]; if (c && c.goal) out.push({ id:k, goal:String(c.goal), asset:(c.asset||''), tf:(c.tf||'') });
        });
      }
    } catch(e){}
    if (!out.length) out = FALLBACK.map(function(q,i){ return {id:'f'+i, goal:q.goal, asset:q.asset, tf:q.tf}; });
    return out;
  }

  var state = { filter:'today', list:null, q:'' };
  function el(t,c,h){ var e=D.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }

  function assetColor(a){ a=(a||'').toLowerCase();
    return a.indexOf('sol')>=0?'#14f195': a.indexOf('eth')>=0?'#7c5cff': a.indexOf('btc')>=0?'#f7931a':'#3b82f6'; }

  function render(win){
    var all = quests().filter(function(q){ return !state.q || q.goal.toLowerCase().indexOf(state.q)>=0; });
    var lists = {}; all.forEach(function(q){ var a=(q.asset||'misc').toUpperCase(); (lists[a]=lists[a]||[]).push(q); });
    var doneArr = all.filter(function(q){ return done[q.id]; });
    var flagged = all.filter(function(q,i){ return i%9===3; }); // demo flags
    var today = all.filter(function(q){ return !done[q.id]; }).slice(0,6);
    var scheduled = all.filter(function(q){ return !done[q.id]; }).slice(6,13);

    // sidebar
    var side = win.querySelector('.cr-sidebar'); side.innerHTML='';
    var cards = el('div','cr-cards'); side.appendChild(cards);
    function card(key,label,ico,bg,arr){
      var c = el('div','cr-card'+(state.filter===key?' active':''),
        '<span class="cr-cico" style="background:'+bg+'">'+ico+'</span><span class="cr-cnt">'+arr.length+'</span><span class="cr-clbl">'+label+'</span>');
      c.onclick=function(){ state.filter=key; state.list=null; render(win); }; cards.appendChild(c);
    }
    card('today','Today','📅','#3b82f6',today);
    card('scheduled','Scheduled','🕗','#ff5f57',scheduled);
    card('all','All','▦','#8a94a6',all);
    card('flagged','Flagged','⚑','#febc2e',flagged);
    var comp = el('div','cr-navitem'+(state.filter==='done'?' active':''),
      '<span class="cr-nico" style="background:#28c840">✓</span><span class="cr-nlbl">Completed</span><span class="cr-nnum">'+doneArr.length+'</span>');
    comp.onclick=function(){ state.filter='done'; state.list=null; render(win); };
    comp.style.marginTop='10px'; side.appendChild(comp);
    side.appendChild(el('div','cr-listsec','MY LISTS'));
    Object.keys(lists).forEach(function(a){
      var n = el('div','cr-navitem'+(state.list===a?' active':''),
        '<span class="cr-nico" style="background:'+assetColor(a)+'">'+a.slice(0,1)+'</span><span class="cr-nlbl">'+a+'</span><span class="cr-nnum">'+lists[a].length+'</span>');
      n.onclick=function(){ state.list=a; state.filter='list'; render(win); }; side.appendChild(n);
    });

    // content
    var rows = state.filter==='done'?doneArr : state.filter==='flagged'?flagged :
               state.filter==='scheduled'?scheduled : state.filter==='all'?all :
               state.filter==='list'?(lists[state.list]||[]) : today;
    var title = state.filter==='list'?state.list : state.filter.charAt(0).toUpperCase()+state.filter.slice(1);
    var cont = win.querySelector('.cr-content');
    cont.innerHTML = '<div class="cr-h">'+title+'</div><div class="cr-hsub">'+rows.length+' quest'+(rows.length===1?'':'s')+'</div>';
    rows.forEach(function(q,i){
      var r = el('div','cr-row');
      var chk = el('span','cr-check'+(done[q.id]?' done':(i%3===1?' p2':i%5===2?' p3':'')));
      chk.onclick=function(){ if(done[q.id]) delete done[q.id]; else done[q.id]=1; saveDone(); render(win); };
      var meta = [];
      if(q.tf) meta.push('<span class="cr-rtime">'+q.tf+'</span>');
      if(q.asset) meta.push('<span class="cr-tag" style="color:'+assetColor(q.asset)+'">'+String(q.asset).toUpperCase()+'</span>');
      meta.push('<span class="cr-tag">#ch'+q.id+'</span>');
      var main = el('div','cr-rmain',
        '<div class="cr-rtitle">'+(i%9===3?'<span class="cr-bang">!</span>':'')+q.goal+(i%9===3?' <span class="cr-flag">⚑</span>':'')+'</div>'+
        '<div class="cr-rmeta">'+meta.join('')+'</div>');
      r.appendChild(chk); r.appendChild(main); cont.appendChild(r);
    });

    win.querySelector('.cr-statusbar').textContent = all.length+' quests · '+doneArr.length+' completed';
  }

  function makeDrag(win, handle){
    var sx,sy,ox,oy,drag=false;
    handle.addEventListener('pointerdown',function(e){
      if(e.target.classList.contains('dot')) return;
      drag=true; handle.classList.add('dragging');
      var r=win.getBoundingClientRect(); win.style.transform='none'; win.style.left=r.left+'px'; win.style.top=r.top+'px';
      sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top; try{handle.setPointerCapture(e.pointerId);}catch(_){}
    });
    handle.addEventListener('pointermove',function(e){ if(!drag)return; win.style.left=(ox+e.clientX-sx)+'px'; win.style.top=(oy+e.clientY-sy)+'px'; });
    handle.addEventListener('pointerup',function(){ drag=false; handle.classList.remove('dragging'); });
  }

  var winRef=null;
  function openQuests(){
    if(winRef){ winRef.classList.remove('cr-hidden'); render(winRef); return; }
    var w = el('div','cr-shellwin');
    w.innerHTML =
      '<div class="cr-shellbar"><div class="dots"><span class="dot red"></span><span class="dot yel"></span><span class="dot grn"></span></div><div class="cr-title">Quests</div><div style="width:54px"></div></div>'+
      '<div class="cr-toolbar"><button class="cr-tbtn" data-add>＋ New</button><input class="cr-search" placeholder="Search"></div>'+
      '<div class="cr-appbody"><div class="cr-sidebar"></div><div class="cr-content"></div></div>'+
      '<div class="cr-statusbar"></div>';
    D.body.appendChild(w); winRef=w;
    w.querySelector('.dot.red').onclick=function(){ w.classList.add('cr-hidden'); };
    w.querySelector('.dot.yel').onclick=function(){ w.classList.add('cr-hidden'); };
    w.querySelector('.dot.grn').onclick=function(){ w.classList.toggle('cr-max'); };
    w.querySelector('.cr-search').addEventListener('input',function(e){ state.q=(e.target.value||'').toLowerCase(); render(w); });
    makeDrag(w, w.querySelector('.cr-shellbar'));
    render(w);
  }

  // desktop launcher chip (into the widget host from the core), + keyboard ⌘/Ctrl+J
  function addLauncher(){
    var host = D.getElementById('crOsWidgets'); if(!host || D.getElementById('crQuestsLaunch')) return;
    var chip = el('div','crw-widget crw-launch','<div class="crw-h">APP</div><div style="font-weight:800">🎯 Quests</div>');
    chip.id='crQuestsLaunch'; chip.onclick=openQuests; host.appendChild(chip);
  }
  function init(){ try{ addLauncher(); }catch(e){} }
  if(D.readyState==='loading') D.addEventListener('DOMContentLoaded',function(){ setTimeout(init,400); });
  else setTimeout(init,400);
  D.addEventListener('keydown',function(e){ if((e.metaKey||e.ctrlKey)&&(e.key==='j'||e.key==='J')){ e.preventDefault(); openQuests(); } });

  window.CRShell = { openQuests:openQuests };
})();
