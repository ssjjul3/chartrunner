/* ChartRunnerOS apps + Phase 2 chrome — Runner Files, Stats, Shop, tray, Control Center.
   v1, 2026-07-17. Additive & defensive; reuses .cr-shell* classes. Reads live localStorage. */
(function CROSApps(){
  if (window.__CROS_APPS__) return; window.__CROS_APPS__ = 1;
  var D = document;
  function LS(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
  function asArr(v){ return Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).map(function(k){ return v[k]; }) : []); }
  function el(t,c,h){ var e=D.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function num(v,d){ v=parseInt(v,10); return isNaN(v)?(d||0):v; }
  function assetColor(a){ a=(a||'').toLowerCase(); return a.indexOf('sol')>=0?'#14f195':a.indexOf('eth')>=0?'#7c5cff':a.indexOf('btc')>=0?'#f7931a':'#3b82f6'; }

  // ---- generic shell window ----
  function makeDrag(win, handle){
    var sx,sy,ox,oy,drag=false;
    handle.addEventListener('pointerdown',function(e){ if(e.target.classList.contains('dot'))return;
      drag=true; handle.classList.add('dragging'); var r=win.getBoundingClientRect();
      win.style.transform='none'; win.style.left=r.left+'px'; win.style.top=r.top+'px';
      sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top; try{handle.setPointerCapture(e.pointerId);}catch(_){}});
    handle.addEventListener('pointermove',function(e){ if(!drag)return; win.style.left=(ox+e.clientX-sx)+'px'; win.style.top=(oy+e.clientY-sy)+'px'; });
    handle.addEventListener('pointerup',function(){ drag=false; handle.classList.remove('dragging'); });
  }
  var wins = {};
  function shellWin(id, title){
    if (wins[id]){ wins[id].classList.remove('cr-hidden'); return wins[id]; }
    var w = el('div','cr-shellwin');
    w.innerHTML =
      '<div class="cr-shellbar"><div class="dots"><span class="dot red"></span><span class="dot yel"></span><span class="dot grn"></span></div><div class="cr-title">'+title+'</div><div style="width:54px"></div></div>'+
      '<div class="cr-toolbar"><input class="cr-search" placeholder="Search"></div>'+
      '<div class="cr-appbody"><div class="cr-sidebar"></div><div class="cr-content"></div></div>'+
      '<div class="cr-statusbar"></div>';
    D.body.appendChild(w); wins[id]=w;
    w.querySelector('.dot.red').onclick=function(){ w.classList.add('cr-hidden'); };
    w.querySelector('.dot.yel').onclick=function(){ w.classList.add('cr-hidden'); };
    w.querySelector('.dot.grn').onclick=function(){ w.classList.toggle('cr-max'); };
    makeDrag(w, w.querySelector('.cr-shellbar'));
    return w;
  }
  function nav(items, active, onPick){
    var frag=D.createDocumentFragment();
    items.forEach(function(it){
      if(it.sec){ frag.appendChild(el('div','cr-listsec',it.sec)); return; }
      var n=el('div','cr-navitem'+(it.key===active?' active':''),
        '<span class="cr-nico" style="background:'+(it.color||'#8a94a6')+'">'+(it.ico||'')+'</span><span class="cr-nlbl">'+it.label+'</span><span class="cr-nnum">'+(it.count!=null?it.count:'')+'</span>');
      n.onclick=function(){ onPick(it.key); }; frag.appendChild(n);
    });
    return frag;
  }

  // ================= Runner Files (Finder) =================
  var filesState={f:'all', q:''};
  function docs(){
    var out=[];
    asArr(LS('cr_maps_v1')).forEach(function(m){ if(m) out.push({type:'SETUP', name:m.name||('Setup '+(m.asset||'')), asset:m.asset||'', tf:m.tf||'', thumb:m.thumb||m.thumbnail||null}); });
    asArr(LS('cr_backtest_replays_v1')).forEach(function(r){ if(r) out.push({type:'GHOST', name:r.name||'Replay', asset:r.asset||'', tf:r.tf||''}); });
    var jn=LS('cr_journal_v1')||LS('cr_journal_notes_v1');
    asArr(jn).forEach(function(n){ if(n) out.push({type:'NOTE', name:(typeof n==='string'?n:(n.title||n.text||'Note')).slice(0,40), asset:'', tf:''}); });
    return out;
  }
  function renderFiles(w){
    var all=docs().filter(function(d){ return !filesState.q || (d.name||'').toLowerCase().indexOf(filesState.q)>=0; });
    var byType={SETUP:[],GHOST:[],NOTE:[]}; all.forEach(function(d){ (byType[d.type]||(byType[d.type]=[])).push(d); });
    var side=w.querySelector('.cr-sidebar'); side.innerHTML='';
    side.appendChild(nav([
      {sec:'FAVORITES'},
      {key:'all',label:'All',ico:'▦',color:'#3b82f6',count:all.length},
      {key:'SETUP',label:'Chart Setups',ico:'▤',color:'#f7931a',count:byType.SETUP.length},
      {key:'GHOST',label:'Replays',ico:'◷',color:'#7c5cff',count:byType.GHOST.length},
      {key:'NOTE',label:'Journal',ico:'✎',color:'#28c840',count:byType.NOTE.length},
      {sec:'LOCATIONS'},
      {key:'local',label:'Local',ico:'⬢',color:'#8a94a6'}
    ], filesState.f, function(k){ filesState.f=k; renderFiles(w); }));
    var rows = (filesState.f==='all'||filesState.f==='local')?all:(byType[filesState.f]||[]);
    var cont=w.querySelector('.cr-content'); cont.innerHTML='<div class="cr-h">'+(filesState.f==='all'?'All Files':filesState.f==='local'?'Local':filesState.f.charAt(0)+filesState.f.slice(1).toLowerCase()+'s')+'</div><div class="cr-hsub">'+rows.length+' item'+(rows.length===1?'':'s')+'</div>';
    var grid=el('div','cr-fgrid'); cont.appendChild(grid);
    if(!rows.length) grid.appendChild(el('div','cr-fsub','No documents yet — saved setups, replays and journal notes appear here.'));
    rows.forEach(function(d){
      var it=el('div','cr-fitem');
      var badge=assetColor(d.asset);
      it.innerHTML='<div class="cr-fico"><span class="cr-fbadge" style="background:'+badge+'22;color:'+badge+'">'+d.type+'</span></div><div class="cr-fname">'+d.name+'</div><div class="cr-fsub">'+[d.asset&&d.asset.toUpperCase(),d.tf].filter(Boolean).join(' · ')+'</div>';
      if(d.thumb){ var img=new Image(); img.src=d.thumb; img.style.cssText='width:100%;height:100%;object-fit:cover'; it.querySelector('.cr-fico').appendChild(img); }
      grid.appendChild(it);
    });
    w.querySelector('.cr-statusbar').textContent=all.length+' documents · local storage';
  }
  function openFiles(){ var w=shellWin('files','Runner Files'); w.querySelector('.cr-search').oninput=function(e){ filesState.q=(e.target.value||'').toLowerCase(); renderFiles(w); }; renderFiles(w); }

  // ================= Stats =================
  function openStats(){
    var w=shellWin('stats','Stats');
    var stars=LS('cr_campaign_stars_v1'); var starCount=stars?asArr(stars).reduce(function(a,b){return a+num(b);},0):0;
    var cards=[
      {l:'Best Level', v:num(LS('cr_player_level_best_v1'),0)||'—'},
      {l:'Campaign Stars', v:starCount||'—'},
      {l:'Setups Saved', v:asArr(LS('cr_maps_v1')).length},
      {l:'Replays', v:asArr(LS('cr_backtest_replays_v1')).length},
      {l:'Score Badge', v:(LS('cr_score_badge_v1')||'—')},
      {l:'Journal Notes', v:asArr(LS('cr_journal_v1')||LS('cr_journal_notes_v1')).length}
    ];
    w.querySelector('.cr-sidebar').innerHTML='';
    w.querySelector('.cr-sidebar').appendChild(nav([{sec:'STATS'},{key:'ov',label:'Overview',ico:'◉',color:'#3b82f6'}],'ov',function(){}));
    var cont=w.querySelector('.cr-content'); cont.innerHTML='<div class="cr-h">Overview</div>';
    var g=el('div','cr-statgrid'); cont.appendChild(g);
    cards.forEach(function(c){ g.appendChild(el('div','cr-stat','<div class="cr-slbl">'+c.l+'</div><div class="cr-sval">'+c.v+'</div>')); });
    w.querySelector('.cr-statusbar').textContent='player stats · local';
  }

  // ================= Shop (abilities catalog) =================
  function openShop(){
    var w=shellWin('shop','Shop');
    var cat=[['Bracket','arm a stop+target on a position','120'],['Ladder','scale in across levels','160'],['OCO','one-cancels-other order','140'],['Hedge','offset exposure','200'],['Radar','scan tracks for setups','90'],['Rescue','recover a losing run','180']];
    w.querySelector('.cr-sidebar').innerHTML='';
    w.querySelector('.cr-sidebar').appendChild(nav([{sec:'CATEGORIES'},{key:'ab',label:'Abilities',ico:'◆',color:'#14f195',count:cat.length}],'ab',function(){}));
    var cont=w.querySelector('.cr-content'); cont.innerHTML='<div class="cr-h">Abilities</div><div class="cr-hsub">'+cat.length+' items · priced in $RUN</div>';
    cat.forEach(function(c){ cont.appendChild(el('div','cr-shoprow','<div><div class="cr-rtitle">'+c[0]+'</div><div class="cr-rmeta">'+c[1]+'</div></div><span class="cr-price">'+c[2]+' $RUN</span>')); });
    w.querySelector('.cr-statusbar').textContent='ability catalog · '+cat.length+' items';
  }

  // ================= Phase 2: Control Center =================
  var THEMES=[['liquid','Liquid'],['platinum','Platinum'],['solana','Solana'],['frontier','Frontier'],['mono','Mono'],['ascii','ASCII'],['bw','B/W']];
  function setTheme(name){
    try { if(typeof applyTheme==='function'){ applyTheme(name); } else {
      D.documentElement.setAttribute('data-theme',name); D.documentElement.setAttribute('data-os-theme',name);
      var d=D.querySelector('.os-desktop')||D.body; d.setAttribute('data-theme',name); d.setAttribute('data-os-theme',name);
    } localStorage.setItem('cr_os_theme',name); } catch(e){}
  }
  function curTheme(){ try{ return localStorage.getItem('cr_os_theme') || D.documentElement.getAttribute('data-theme') || 'liquid'; }catch(e){ return 'liquid'; } }
  var ccRef=null;
  function toggleCC(){
    if(ccRef){ ccRef.classList.toggle('cr-hidden'); if(!ccRef.classList.contains('cr-hidden')) renderCC(); return; }
    ccRef=el('div','cr-hidden'); ccRef.id='crCC'; D.body.appendChild(ccRef); renderCC(); ccRef.classList.remove('cr-hidden');
  }
  function renderCC(){
    var rm = localStorage.getItem('cr_reduce_motion')==='1';
    var wl = D.getElementById('crOsWidgets'); var wlOn = !wl || wl.style.display!=='none';
    ccRef.innerHTML='<div class="cr-cch">THEME</div><div class="cr-ccrow" id="ccThemes"></div>'+
      '<div class="cr-cch">TOGGLES</div>'+
      '<div class="cr-cctog" data-t="rm"><span>Reduce motion</span><span class="cr-sw'+(rm?' on':'')+'"></span></div>'+
      '<div class="cr-cctog" data-t="wl"><span>Desktop widgets</span><span class="cr-sw'+(wlOn?' on':'')+'"></span></div>'+
      '<div class="cr-cch">OPEN</div><div class="cr-ccrow"><span class="cr-ccbtn" data-o="files">Files</span><span class="cr-ccbtn" data-o="stats">Stats</span><span class="cr-ccbtn" data-o="quests">Quests</span><span class="cr-ccbtn" data-o="shop">Shop</span></div>';
    var tr=ccRef.querySelector('#ccThemes'); var ct=curTheme();
    THEMES.forEach(function(t){ var b=el('span','cr-ccbtn'+(t[0]===ct?' active':''),t[1]); b.onclick=function(){ setTheme(t[0]); renderCC(); }; tr.appendChild(b); });
    ccRef.querySelectorAll('.cr-cctog').forEach(function(row){ row.onclick=function(){
      var t=row.getAttribute('data-t');
      if(t==='rm'){ var on=localStorage.getItem('cr_reduce_motion')==='1'; localStorage.setItem('cr_reduce_motion',on?'0':'1'); D.documentElement.classList.toggle('cr-reduce-motion',!on); }
      if(t==='wl'){ var l=D.getElementById('crOsWidgets'); if(l) l.style.display=(l.style.display==='none'?'':'none'); }
      renderCC();
    };});
    ccRef.querySelectorAll('.cr-ccbtn[data-o]').forEach(function(b){ b.onclick=function(){ var o=b.getAttribute('data-o');
      if(o==='files')openFiles(); else if(o==='stats')openStats(); else if(o==='shop')openShop();
      else if(o==='quests'&&window.CRShell&&CRShell.openQuests)CRShell.openQuests(); ccRef.classList.add('cr-hidden'); };});
  }

  // ================= Phase 2: System tray =================
  function mountTray(){
    if(D.getElementById('crTray')) return;
    var t=el('div'); t.id='crTray';
    t.innerHTML='<span class="cr-ti" title="Connection"><span class="cr-tdot" id="crTdot"></span><span id="crTnet">online</span></span>'+
      '<span class="cr-ti" title="Balance">◎ <span id="crTsol">—</span></span>'+
      '<span class="cr-ti" id="crTclock">--:--</span>'+
      '<span class="cr-tbtn" id="crTcc" title="Control Center" aria-label="Control Center">⌃</span>';
    D.body.appendChild(t);
    t.querySelector('#crTcc').onclick=toggleCC;
    function tick(){
      try{ var d=new Date(); t.querySelector('#crTclock').textContent=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){}
      try{ var on=navigator.onLine; var dot=t.querySelector('#crTdot'); dot.classList.toggle('off',!on); t.querySelector('#crTnet').textContent=on?'online':'offline'; }catch(e){}
      try{ var sol=(window.crWalletBalances&&window.crWalletBalances.SOL); t.querySelector('#crTsol').textContent=(sol!=null?(Math.round(sol*100)/100+' SOL'):'—'); }catch(e){}
    }
    tick(); setInterval(tick, 20000);
  }

  // ---- launchers into the desktop widget host ----
  function chip(id,label,fn){ var host=D.getElementById('crOsWidgets'); if(!host||D.getElementById(id))return;
    var c=el('div','crw-widget crw-launch','<div class="crw-h">APP</div><div style="font-weight:800">'+label+'</div>'); c.id=id; c.onclick=fn; host.appendChild(c); }
  function init(){ try{
    mountTray();
    chip('crFilesLaunch','🗂 Files',openFiles);
    chip('crStatsLaunch','◉ Stats',openStats);
    if(localStorage.getItem('cr_reduce_motion')==='1') D.documentElement.classList.add('cr-reduce-motion');
  }catch(e){ try{console.warn('CROSApps',e);}catch(_){}} }
  if(D.readyState==='loading') D.addEventListener('DOMContentLoaded',function(){ setTimeout(init,500); }); else setTimeout(init,500);

  window.CRApps={ openFiles:openFiles, openStats:openStats, openShop:openShop, controlCenter:toggleCC, setTheme:setTheme };
})();
