/* ChartRunnerOS — OS-level integration (v3, 2026-07-17)
   NO new apps. Only OS chrome that enhances the EXISTING structure:
   command palette (Cmd/Ctrl+K), menubar tray (connection/$RUN/notifications/control center/search),
   Control Center (theme switch + toggles + quick-open existing apps), notification center.
   Everything routes to the real windows via osOpenWindow. Additive & defensive. */
(function CROSNative(){
  if (window.__CROS_NATIVE__) return; window.__CROS_NATIVE__ = 1;
  var D = document;
  function el(t,c,h){ var e=D.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function osOpen(p){ try{ if(typeof osOpenWindow==='function') osOpenWindow(p); }catch(e){} }

  // ---------- Local Dev unlock (restores the UnlockedEcon connected state) ----------
  var DEV_ADDR='DevLoca1DevnetRunner1111111111111111111111'; // displays as DevL…1111
  function isGuest(){ try{ return document.body.classList.contains('cr-guest') || (typeof crGuest==='function' && crGuest()); }catch(e){ return true; } }
  function localDevConnect(){ try{
      if(window.crWallet && typeof crWallet.setConnected==='function'){ crWallet.setConnected(DEV_ADDR,'Local Dev'); }
      if(typeof crApplyAccessGates==='function') crApplyAccessGates();
      var b=D.getElementById('crMenuDev'); if(b){ b.classList.add('cr-on'); b.textContent='Local Dev ✓'; b.title='Local Dev connected — click to disconnect'; }
      pushNote('Local Dev connected','Economy unlocked · Maps, Journal and the econ model are visible.');
    }catch(e){ try{console.warn('localDev',e);}catch(_){}} }
  function localDevDisconnect(){ try{
      if(window.crWallet && typeof crWallet.disconnect==='function') crWallet.disconnect();
      if(typeof crApplyAccessGates==='function') crApplyAccessGates();
      var b=D.getElementById('crMenuDev'); if(b){ b.classList.remove('cr-on'); b.textContent='Local Dev'; b.title='Connect a local dev session'; }
    }catch(e){} }
  function toggleDev(){ if(isGuest()) localDevConnect(); else localDevDisconnect(); }
  // Unlock every gated app/feature: connect Local Dev (drops guest gating) + set the
  // permanent PL10 badge (crFeatureLevelOk short-circuits true when maxed → every level
  // gate opens: Broker · Journal · Maps · Lasers · Leverage · PvP). Reversible-ish (dev).
  function applyUnlock(){
    try{ if(isGuest()) localDevConnect(); }catch(e){}
    try{ localStorage.setItem('cr_player_level_best_v1', String(window.CR_LEVEL_MAX||10)); }catch(e){}
    try{ if(typeof window.crApplyLevelGates==='function') window.crApplyLevelGates(); }catch(e){}
    try{ if(typeof window.crApplyAccessGates==='function') window.crApplyAccessGates(); }catch(e){}
    // drop every gate class + a blanket force-show class (covers even the always-hidden
    // retired apps: runtube / workbench) so literally every app icon + dock button shows.
    try{ D.body.classList.remove('cr-lock-broker','cr-lock-journal','cr-lock-pvp','cr-guest'); D.body.classList.add('cr-pl-max','cr-unlock-all'); }catch(e){}
    try{ buildDock(); addFilesIcon(); addWalletIcon(); }catch(e){}
    try{ var b=D.getElementById('crMenuUnlock'); if(b){ b.classList.add('cr-on'); b.textContent='🔓 Unlocked ✓'; b.title='All apps & features are visible (PL10 · Local Dev)'; } }catch(e){}
  }
  function unlockAll(){ applyUnlock(); try{ localStorage.setItem('cr_os_unlock_all','1'); }catch(e){}
    try{ pushNote('🔓 Unlocked','Every app & feature is now visible — all icons shown · PL10 badge · Local Dev.'); }catch(e){} }
  function isUnlocked(){ try{ return localStorage.getItem('cr_os_unlock_all')==='1'; }catch(e){ return false; } }
  function isMaxed(){ try{ return (typeof window.crPlayerMaxed==='function') ? !!window.crPlayerMaxed() : false; }catch(e){ return false; } }

  // ---------- native app window (real .os-window, themed + readable) + Files (Finder) ----------
  function LS(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
  function asArr(v){ return Array.isArray(v)?v:(v&&typeof v==='object'?Object.keys(v).map(function(k){return v[k];}):[]); }
  function aCol(a){ a=(a||'').toLowerCase(); return a.indexOf('sol')>=0?'#14b981':a.indexOf('eth')>=0?'#7c5cff':a.indexOf('btc')>=0?'#e0851a':'#5b83c0'; }
  function readable(win){ try{ var t=win.querySelector('.os-wbar .ttl'); var c=t?getComputedStyle(t).color:''; var b=win.querySelector('.os-wbody');
    if(b){ if(c && c!=='rgba(0, 0, 0, 0)') b.style.color=c; else { var bg=(getComputedStyle(win).backgroundColor.match(/\d+/g)||[]); if(bg.length>=3){ var lum=(0.299*bg[0]+0.587*bg[1]+0.114*bg[2])/255; b.style.color=lum<0.5?'#e9eef5':'#12161d'; } } } }catch(e){} }
  function readableAll(){ D.querySelectorAll('.cr-appwin').forEach(readable); }
  var _appWins={}, _z=70, _off=0;
  function dragWin(win,h){ var sx,sy,ox,oy,d=false;
    h.addEventListener('pointerdown',function(e){ if(e.target.closest('.dots')||e.target.closest('.wclose'))return; d=true; h.classList.add('dragging'); var r=win.getBoundingClientRect(); win.style.transform='none'; win.style.left=r.left+'px'; win.style.top=r.top+'px'; sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top; try{h.setPointerCapture(e.pointerId);}catch(_){}});
    h.addEventListener('pointermove',function(e){ if(!d)return; win.style.left=(ox+e.clientX-sx)+'px'; win.style.top=(oy+e.clientY-sy)+'px'; });
    h.addEventListener('pointerup',function(){ d=false; h.classList.remove('dragging'); }); }
  function appWin(id,title){
    if(_appWins[id]){ var w0=_appWins[id]; w0.classList.remove('cr-min-hidden'); w0.classList.add('on'); w0.style.zIndex=++_z; setTimeout(function(){readable(w0);},0); buildDock(); return w0; }
    var w=el('div','os-window cr-appwin on'); w.id='win-cr-'+id;
    var ttlIco='<svg class="cr-svg-ico ttl-ico" style="--accent:#5b9cff;--accent2:#7ee787" viewBox="0 0 32 32" aria-hidden="true"><path class="a" d="M4 8 h8 l3 3 h13 v15 h-24 z" opacity=".2"/><path d="M4 8 h8 l3 3 h13 v15 h-24 z" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><path class="b" d="M4 14 h24" stroke="var(--accent)" stroke-width="1.2" opacity=".55"/></svg>';
    w.innerHTML='<div class="os-wbar"><div class="dots"><span class="dot red"></span><span class="dot yel"></span><span class="dot grn"></span></div><div class="ttl">'+ttlIco+title+'</div><div class="spacer"></div><button class="wclose" type="button">Close</button></div><div class="os-wbody"><div class="cr-appbody"><div class="cr-sidebar"></div><div class="cr-content"></div></div><div class="cr-statusbar"></div></div>';
    (D.getElementById('splash')||D.body).appendChild(w); _appWins[id]=w;
    _off=(_off+26)%130; w.style.left='calc(50% - 320px + '+_off+'px)'; w.style.top=(84+_off)+'px'; w.style.transform='none'; w.style.zIndex=++_z;
    w.querySelector('.wclose').onclick=function(){ w.classList.remove('on'); buildDock(); };
    w.querySelector('.dot.red').onclick=function(e){e.stopPropagation(); w.classList.remove('on'); buildDock();};
    w.querySelector('.dot.yel').onclick=function(e){e.stopPropagation(); w.classList.remove('on'); w.classList.add('cr-min-hidden'); buildDock();};
    w.querySelector('.dot.grn').onclick=function(e){e.stopPropagation(); w.classList.toggle('cr-max');};
    w.addEventListener('pointerdown',function(){ w.style.zIndex=++_z; });
    dragWin(w, w.querySelector('.os-wbar'));
    setTimeout(function(){ readable(w); },0); buildDock();
    return w;
  }
  var fS={f:'all',q:''};
  function fdocs(){ var out=[];
    asArr(LS('cr_maps_v1')).forEach(function(m){ if(m)out.push({type:'SETUP',open:'maps',name:m.name||('Setup '+(m.asset||'')),asset:m.asset||'',tf:m.tf||''}); });
    asArr(LS('cr_backtest_replays_v1')).forEach(function(r){ if(r)out.push({type:'GHOST',open:'run',name:r.name||'Replay',asset:r.asset||'',tf:r.tf||''}); });
    asArr(LS('cr_journal_v1')).forEach(function(j){ if(!j)return; var nm=(typeof j==='string')?j:(((j.asset||'')+' '+(j.side||'')+(j.result?(' '+j.result):'')).trim()||j.title||j.note||j.text||'Trade'); out.push({type:'JOURNAL',open:'journal',name:String(nm).slice(0,34),asset:(j&&j.asset)||'',tf:(j&&j.tf)||''}); });
    asArr(LS('cr_journal_notes_v1')).forEach(function(n){ if(!n)return; out.push({type:'JOURNAL',open:'journal',name:(typeof n==='string'?n:(n.title||n.text||'Note')).slice(0,34),asset:'',tf:''}); });
    return out; }
  function openJournalTab(key){ try{ osOpen('journal'); setTimeout(function(){ var b=D.querySelector('[data-jrntab="'+key+'"]'); if(b) b.click(); }, 90); }catch(e){} }
  // reparent a live native app body (Maps/Journal) into the Docs content pane — no separate window
  var _hosted=null;
  function unhost(){ if(typeof unhostMaps==='function') unhostMaps(); if(_hosted){ try{ _hosted.win.classList.remove('on'); _hosted.win.appendChild(_hosted.body); }catch(e){} _hosted=null; } }
  function hostApp(w, winId, tab){ var content=w.querySelector('.cr-content');
    unhost();
    try{ osOpen(winId); }catch(e){}
    var win=D.getElementById('win-'+winId), body=win&&win.querySelector('.os-wbody');
    if(!body){ content.className='cr-content'; content.innerHTML='<div class="cr-fsub" style="padding:16px">This view is unavailable right now.</div>'; return; }
    content.innerHTML=''; content.classList.add('cr-hosting'); content.classList.add('cr-oslight'); content.appendChild(body); _hosted={win:win, body:body};
    var tb=w.querySelector('.cr-toolbar'); if(tb) tb.style.display='none';
    try{ win.classList.remove('on'); }catch(e){}
    try{ lightenChrome(content); setTimeout(function(){ lightenChrome(content); },400); }catch(e){}
    if(tab){ setTimeout(function(){ var b=body.querySelector('[data-jrntab="'+tab+'"]'); if(b){ b.click(); setTimeout(function(){ lightenChrome(content); },60); } }, 40); }
  }
  // Maps: reparent its body into Docs (like Journal). It renders via getElementById into
  // #crMapGrid/#crMapAssetTabs/#crMapFolders, so it works after moving. It isn't in OS_PROGRAMS
  // and only renders on a 1.5s interval when #win-maps.on — so keep the (now empty) source window
  // .on (parked off-screen) to drive that interval, and click an existing control to force an
  // immediate render (its listeners call renderMaps within game scope).
  function unhostMaps(){}
  // Native Maps rendering couldn't be embedded reliably; build the view ourselves from the exposed
  // window.crMaps API (readAll + load) — a clean Finder-style grid of saved setups, click to restore.
  var _mapAsset='all';
  function mapsData(){ try{ if(window.crMaps && typeof crMaps.readAll==='function'){ var a=crMaps.readAll(); if(Array.isArray(a)) return a; } }catch(e){} return asArr(LS('cr_maps_v1')); }
  function restoreMap(m){ try{ if(window.crMaps && typeof crMaps.load==='function'){ crMaps.load(m&&m.id!=null?m.id:m); if(typeof toast==='function') toast('Restored map · '+(m&&m.name||'')); } }catch(e){} }
  function renderMapsView(w){ unhost(); var c=w.querySelector('.cr-content'); c.classList.remove('cr-hosting');
    var all=mapsData()||[]; var assets=['all','btc','eth','sol'];
    var list = _mapAsset==='all' ? all : all.filter(function(m){ return String(m&&m.asset||'').toLowerCase()===_mapAsset; });
    c.innerHTML='<div class="cr-hrow"><div><div class="cr-h">Maps</div><div class="cr-hsub">'+all.length+' saved setup'+(all.length===1?'':'s')+' · click to restore a chart</div></div></div>';
    var row=el('div','cr-chips'); assets.forEach(function(a){ var b=el('button','cr-chip'+(_mapAsset===a?' on':''), a==='all'?'All':a.toUpperCase()); b.onclick=function(){ _mapAsset=a; renderMapsView(w); }; row.appendChild(b); }); c.appendChild(row);
    var g=el('div','cr-fgrid'); c.appendChild(g);
    if(!list.length) g.appendChild(el('div','cr-empty','No saved maps'+(_mapAsset==='all'?'':' for '+_mapAsset.toUpperCase())+' yet. Save a chart setup during a run — asset, timeframe, indicators, tools and primitives — and it appears here to restore.'));
    list.forEach(function(m){ var it=el('div','cr-fitem'); var col=aCol(m&&m.asset);
      it.innerHTML='<div class="cr-fico"><span class="cr-fbadge" style="background:'+col+'22;color:'+col+'">MAP</span></div><div class="cr-fname">'+((m&&m.name)||'Setup')+'</div><div class="cr-fsub">'+[(m&&m.asset)&&String(m.asset).toUpperCase(),(m&&m.tf)].filter(Boolean).join(' · ')+'</div>';
      var th=m&&(m.thumb||m.thumbnail); if(th){ var im=new Image(); im.src=th; im.style.cssText='width:100%;height:100%;object-fit:cover'; it.querySelector('.cr-fico').appendChild(im); }
      it.title='Restore this map'; it.ondblclick=function(){ restoreMap(m); }; g.appendChild(it); });
    w.querySelector('.cr-statusbar').textContent=all.length+' maps · double-click to restore';
    readable(w);
  }
  function openFiles(){ var w=appWin('docs','Docs');
    try{ w.style.width='min(960px,95vw)'; w.style.height='min(660px,88vh)'; w.style.left='calc(50% - min(480px,47.5vw))'; w.style.top='68px'; }catch(e){}
    ['.wclose','.dot.red'].forEach(function(sel){ var b=w.querySelector(sel); if(b && !b.__unhostWrapped){ var prev=b.onclick; b.onclick=function(e){ unhost(); if(prev) prev.call(this,e); }; b.__unhostWrapped=1; } });
    renderF(w); }
  function renderF(w){ var all=fdocs(); var by={SETUP:[],GHOST:[],JOURNAL:[]}; all.forEach(function(d){(by[d.type]=by[d.type]||[]).push(d);});
    var side=w.querySelector('.cr-sidebar'); side.innerHTML='<div class="cr-listsec">FAVORITES</div>';
    function item(key,label,ico,color,num){ var n=el('div','cr-navitem'+(fS.f===key?' active':''),nico(color,ico)+'<span class="cr-nlbl">'+label+'</span><span class="cr-nnum">'+(num!=null?num:'')+'</span>'); n.onclick=function(){ fS.f=key; renderF(w); }; side.appendChild(n); }
    item('all','All','grid','#5b83c0',all.length);
    item('maps','Maps','map','#e0851a',by.SETUP.length);
    item('GHOST','Replays','replay','#7c5cff',by.GHOST.length);
    side.insertAdjacentHTML('beforeend','<div class="cr-listsec">JOURNAL</div>');
    item('j:manual','Manual','pencil','#2fa855');
    item('j:paper','Paper','doc','#e0851a');
    item('j:alerts','Alerts','bell','#e0556f');
    item('j:pnl','P&L','chart','#5b83c0');
    item('j:notes','Notes','doc','#3aa99a');
    side.insertAdjacentHTML('beforeend','<div class="cr-listsec">PLAYER</div>');
    item('win:stats','Stats','chart','#5b83c0');
    item('win:missions','Missions','star','#e0a326');
    side.insertAdjacentHTML('beforeend','<div class="cr-listsec">LOCATIONS</div><div class="cr-navitem">'+nico('#8a8f99','disk')+'<span class="cr-nlbl">Local</span></div>');
    var c=w.querySelector('.cr-content');
    if(fS.f && fS.f.indexOf('win:')===0){ var _wid=fS.f.slice(4); hostApp(w,_wid); w.querySelector('.cr-statusbar').textContent=(_wid==='stats'?'Player stats':'Missions'); return; }
    if(fS.f==='maps'){ renderMapsView(w); return; }
    if(fS.f==='j:alerts'){ renderAlarms(w); return; }
    if(fS.f && fS.f.indexOf('j:')===0){ hostApp(w,'journal',fS.f.slice(2)); w.querySelector('.cr-statusbar').textContent='Trading Journal · '+fS.f.slice(2).toUpperCase(); return; }
    unhost(); c.classList.remove('cr-hosting');
    var title=(fS.f==='GHOST'?'Replays':'All Files'); c.innerHTML='';
    var hrow=el('div','cr-hrow'); hrow.innerHTML='<div><div class="cr-h">'+title+'</div><div class="cr-hsub" data-sub></div></div>';
    var srch=el('input','cr-search'); srch.placeholder='Search'; srch.value=fS.q||''; hrow.appendChild(srch); c.appendChild(hrow);
    var g=el('div','cr-fgrid'); c.appendChild(g);
    function fill(){ var rows=(fS.f==='GHOST'?by.GHOST:all).filter(function(d){return !fS.q||d.name.toLowerCase().indexOf(fS.q)>=0;});
      hrow.querySelector('[data-sub]').textContent=rows.length+' item'+(rows.length===1?'':'s')+' · double-click to open'; g.innerHTML='';
      if(!rows.length){ g.appendChild(el('div','cr-empty','Saved setups, replays and journal entries appear here. Use the sidebar for the full Maps and Journal.')); return; }
      rows.forEach(function(d){ var it=el('div','cr-fitem'); var col=aCol(d.asset);
        it.innerHTML='<div class="cr-fico"><span class="cr-fbadge" style="background:'+col+'22;color:'+col+'">'+d.type+'</span></div><div class="cr-fname">'+d.name+'</div><div class="cr-fsub">'+[d.asset&&d.asset.toUpperCase(),d.tf].filter(Boolean).join(' · ')+'</div>';
        it.ondblclick=function(){ if(d.type==='SETUP'){ fS.f='maps'; renderF(w); } else if(d.type==='JOURNAL'){ fS.f='j:manual'; renderF(w); } }; g.appendChild(it); }); }
    srch.oninput=function(e){ fS.q=(e.target.value||'').toLowerCase(); fill(); }; fill();
    w.querySelector('.cr-statusbar').textContent=all.length+' documents · local storage'; readable(w);
  }
  // ---------- Alarms (redesigned, inline create + fires into OS notifications) ----------
  function alarms(){ var a=LS('cr_os_alarms_v1'); return Array.isArray(a)?a:[]; }
  function saveAlarms(a){ try{ localStorage.setItem('cr_os_alarms_v1', JSON.stringify(a)); }catch(e){} }
  function curAsset(){ try{ return (typeof window.currentAsset==='string'?window.currentAsset:'BTC').toUpperCase(); }catch(e){ return 'BTC'; } }
  function px(){ try{ if(typeof window.lastPrice==='function'){ var p=window.lastPrice(); return (p!=null&&!isNaN(p))?+p:null; } }catch(e){} return null; }
  var _almTimer=null, _almWin=null;
  function startAlarmMonitor(){ if(_almTimer) return; _almTimer=setInterval(checkAlarms, 4000); }
  function checkAlarms(){ try{ var p=px(); if(p==null) return; var a=curAsset(); var list=alarms(), changed=false;
    list.forEach(function(al){ if(!al.armed||al.triggered) return; if(al.asset && al.asset.toUpperCase()!==a) return;
      var hit=(al.cond==='above'&&p>=al.price)||(al.cond==='below'&&p<=al.price);
      if(hit){ al.triggered=true; al.armed=false; changed=true; try{ pushNote('⏰ Alarm · '+al.asset, (al.cond==='above'?'crossed above ':'crossed below ')+al.price+'  (now '+(Math.round(p*100)/100)+')'); }catch(e){} } });
    if(changed){ saveAlarms(list); if(_almWin && _almWin.classList.contains('on') && fS.f==='j:alerts') renderAlarms(_almWin); }
  }catch(e){} }
  function renderAlarms(w){ unhost(); _almWin=w; var c=w.querySelector('.cr-content'); c.classList.remove('cr-hosting'); var _tb=w.querySelector('.cr-toolbar'); if(_tb)_tb.style.display='none';
    var list=alarms(); var armed=list.filter(function(a){return a.armed&&!a.triggered;}).length;
    c.innerHTML='<div class="cr-h">Alarms</div><div class="cr-hsub">'+armed+' armed · alarms fire into notifications ◔</div>';
    var form=el('div','cr-alarm-new');
    form.innerHTML='<input class="cr-al-asset" value="'+curAsset()+'" placeholder="Asset"><select class="cr-al-cond"><option value="above">crosses above</option><option value="below">crosses below</option></select><input class="cr-al-price" type="number" step="any" placeholder="Price"><button class="cr-al-add">＋ Add alarm</button>';
    c.appendChild(form);
    form.querySelector('.cr-al-add').onclick=function(){ var asset=(form.querySelector('.cr-al-asset').value||'').trim().toUpperCase(); var price=parseFloat(form.querySelector('.cr-al-price').value); var cond=form.querySelector('.cr-al-cond').value; if(!asset||isNaN(price)){ return; } var a=alarms(); a.unshift({id:Date.now(),asset:asset,price:price,cond:cond,armed:true,triggered:false}); saveAlarms(a); renderAlarms(w); };
    var wrap=el('div','cr-alarm-list'); c.appendChild(wrap);
    if(!list.length){ wrap.appendChild(el('div','cr-fsub','No alarms yet. Set a price level above — you’ll get a notification when it’s hit.')); }
    list.forEach(function(a){ var row=el('div','cr-alarm-row'+(a.triggered?' done':(a.armed?'':' off')));
      row.innerHTML='<span class="cr-tag" style="color:'+aCol(a.asset)+'">'+a.asset+'</span><span class="cr-al-txt">'+(a.cond==='above'?'crosses above':'crosses below')+' <b>'+a.price+'</b></span><span class="cr-al-state">'+(a.triggered?'triggered':(a.armed?'● armed':'○ off'))+'</span>';
      var arm=el('button','cr-al-btn',a.armed?'Disarm':'Arm'); arm.onclick=function(){ var al=alarms(),t=null; al.forEach(function(x){if(x.id===a.id)t=x;}); if(t){ t.armed=!t.armed; if(t.armed)t.triggered=false; saveAlarms(al); renderAlarms(w);} };
      var del=el('button','cr-al-btn','✕'); del.title='Delete'; del.onclick=function(){ saveAlarms(alarms().filter(function(x){return x.id!==a.id;})); renderAlarms(w); };
      row.appendChild(arm); row.appendChild(del); wrap.appendChild(row); });
    w.querySelector('.cr-statusbar').textContent=list.length+' alarm'+(list.length===1?'':'s')+' · '+list.filter(function(a){return a.triggered;}).length+' triggered · price via lastPrice()';
    readable(w); startAlarmMonitor();
  }
  // Unified sidebar nav glyphs — clean white SVG icons on app-icon-style tiles,
  // matching the desktop icon design language (replaces flat unicode symbols).
  function glyph(k){ var G={
    run:'<path fill="#fff" stroke="none" d="M8 5v14l11-7z"/>',
    campaign:'<path d="M6 3v18"/><path d="M6 4h11l-2 4 2 4H6"/>',
    minigame:'<rect x="4.5" y="8.5" width="15" height="8" rx="4"/><circle cx="9" cy="12.5" r="1.2" fill="#fff" stroke="none"/><circle cx="15" cy="12.5" r="1.2" fill="#fff" stroke="none"/>',
    rooms:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4" fill="#fff" stroke="none"/>',
    grid:'<rect x="4" y="4" width="7" height="7" rx="1.4" fill="#fff" stroke="none"/><rect x="13" y="4" width="7" height="7" rx="1.4" fill="#fff" stroke="none"/><rect x="4" y="13" width="7" height="7" rx="1.4" fill="#fff" stroke="none"/><rect x="13" y="13" width="7" height="7" rx="1.4" fill="#fff" stroke="none"/>',
    star:'<path fill="#fff" stroke="none" d="M12 3l2.5 5.5 6 .6-4.5 4 1.3 6L12 17.8 6.7 21l1.3-6-4.5-4 6-.6z"/>',
    down:'<path d="M12 4v13"/><path d="M7 12l5 5 5-5"/>',
    starO:'<path d="M12 3.5l2.4 5.3 5.8.6-4.3 3.9 1.2 5.7L12 16.9 6.9 19l1.2-5.7-4.3-3.9 5.8-.6z"/>',
    map:'<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    replay:'<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l3 2"/>',
    pencil:'<path d="M4.5 19.5 5.5 15 16 4.5 19.5 8 9 18.5z"/><path d="M14 6.5 17.5 10"/>',
    doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15.5h5"/>',
    bell:'<path d="M6 16h12l-1.6-2.2V11a4.4 4.4 0 0 0-8.8 0v2.8z"/><path d="M10.4 18a1.6 1.6 0 0 0 3.2 0"/>',
    chart:'<path d="M4 19h16"/><path d="M6.5 15 10 11l3 3 4.5-5.5"/>',
    disk:'<rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M8.5 4.5v5h6v-5M9.5 19.5v-4.5h5v4.5"/>',
    wallet:'<rect x="3.5" y="6" width="17" height="12.5" rx="2.4"/><path d="M3.5 10h17"/><circle cx="16.5" cy="14.5" r="1.3" fill="#fff" stroke="none"/>',
    swap:'<path d="M7 8.5h11l-3-3M17 15.5H6l3 3"/>',
    cart:'<path d="M4 5h2l1.6 9.5h9.2L18.5 8H7"/><circle cx="10" cy="19" r="1.3" fill="#fff" stroke="none"/><circle cx="16.5" cy="19" r="1.3" fill="#fff" stroke="none"/>',
    tag:'<path d="M4 12l8-8h7v7l-8 8z"/><circle cx="15.5" cy="8.5" r="1.4" fill="#fff" stroke="none"/>'
  }; return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(G[k]||G.grid)+'</svg>'; }
  function nico(color,key){ return '<span class="cr-nico" style="--nc:'+color+'">'+glyph(key)+'</span>'; }

  function addFilesIcon(){ var grid=D.getElementById('osGrid'); if(!grid||D.getElementById('osIconDocs'))return;
    var b=el('button','os-icon'); b.id='osIconDocs'; b.title='Docs — setups, replays & journal';
    b.innerHTML='<div class="ico"><svg class="cr-svg-ico" style="--accent:#5b9cff;--accent2:#7ee787" viewBox="0 0 32 32" aria-hidden="true">'
      +'<path class="a" d="M4 9 h8 l3 3 h13 v13 a1 1 0 0 1 -1 1 h-22 a1 1 0 0 1 -1 -1 z" opacity=".22"/>'
      +'<path d="M4 9 h8 l3 3 h13 v13 a1 1 0 0 1 -1 1 h-22 a1 1 0 0 1 -1 -1 z" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/>'
      +'<path class="l" d="M4 16 h24"/></svg></div><div class="lbl">Docs</div>';
    b.onclick=openFiles; wireIconSelect(b); grid.appendChild(b); }
  // match the native icon selection: highlight (blue tile + dotted outline) on hover
  function wireIconSelect(b){ b.addEventListener('mouseenter',function(){ try{ D.querySelectorAll('#osGrid .os-icon.selected').forEach(function(x){ x.classList.remove('selected'); }); }catch(e){} b.classList.add('selected'); }); }

  // =============================================================
  //  WALLET app  — WALLET + BROKER views moved out of Profile into
  //  their own OS app with a folder sidebar (like Docs).
  //  + LASER card in the Profile altar (hotkeys 2/3/4, 3&4 gated)
  //  + Laser Tools window (Red Laser loadout) opened from the card.
  //  All reparent-based so the native views stay fully functional.
  // =============================================================
  var _pvHolder=null;
  function pvHolder(){ if(!_pvHolder){ _pvHolder=el('div'); _pvHolder.id='crPvHolder'; _pvHolder.style.display='none'; (D.getElementById('splash')||D.body).appendChild(_pvHolder); } return _pvHolder; }
  function pv(id){ return D.getElementById(id); }
  function stashPV(v){ if(v) pvHolder().appendChild(v); }
  // ===== Marketplace (reimagined) — OS-style app hosting the real Shop (Game Shop $RUN + P2P $SOL)
  //  with a game-progress sidebar (level · $CHART · $RUN). The stock "Marketplace" (data-prog=shop)
  //  desktop icon is hidden in favour of this one. =====
  function addMarketIcon(){ var grid=D.getElementById('osGrid'); if(!grid||D.getElementById('osIconMarket'))return;
    var b=el('button','os-icon'); b.id='osIconMarket'; b.title='Marketplace — gear, vehicles & P2P bots/maps/strats';
    b.innerHTML='<div class="ico"><svg class="cr-svg-ico" style="--accent:#e0556f;--accent2:#ffd166" viewBox="0 0 32 32" aria-hidden="true">'
      +'<path class="a" d="M6 11 h20 l-2 15 h-16 z" opacity=".22"/>'
      +'<path d="M6 11 h20 l-2 15 h-16 z" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/>'
      +'<path d="M11 12 a5 5 0 0 1 10 0" fill="none" stroke="var(--accent)" stroke-width="1.6"/></svg></div><div class="lbl">Market</div>';
    b.onclick=openMarket; wireIconSelect(b); grid.appendChild(b); }
  function marketProgress(){ var chart='0',run='0',lvl='1';
    try{ var ce=D.getElementById('profileChartBal'); if(ce&&ce.textContent) chart=ce.textContent.trim(); else if(typeof window.game!=='undefined'&&window.game&&window.game.chart!=null) chart=String(window.game.chart|0); }catch(e){}
    try{ var re=D.getElementById('profileRunBal'); if(re&&re.textContent) run=re.textContent.trim(); }catch(e){}
    try{ if(window.crPlayerLevel) lvl=String(window.crPlayerLevel()); }catch(e){}
    return {chart:chart,run:run,lvl:lvl}; }
  var _mktTab='p2p';
  function hostShop(w){ var content=w.querySelector('.cr-content'); try{ osOpen('shop'); }catch(e){}
    var win=D.getElementById('win-shop'), body=win&&win.querySelector('.os-wbody');
    content.className='cr-content cr-oslight cr-market'; content.innerHTML='';
    if(body){ content.appendChild(body); try{ win.classList.remove('on'); }catch(e){} lightenChrome(content); modernizeMarketCards(content); setTimeout(function(){ lightenChrome(content); modernizeMarketCards(content); },400); }
    else content.innerHTML='<div class="cr-fsub" style="padding:16px">Marketplace unavailable.</div>'; }
  function catMeta(nm){ var m={all:['grid','#5b83c0'],bots:['minigame','#5b83c0'],maps:['map','#e0851a'],strategies:['chart','#2fa855'],backtests:['replay','#7c5cff'],indicators:['star','#e0a326'],apps:['doc','#e0556f'],'my licenses':['tag','#3aa99a'],gear:['cart','#2fa855'],vehicles:['minigame','#e0851a'],weapons:['star','#e0556f'],skins:['doc','#5b83c0']};
    return m[(nm||'').toLowerCase().trim()]||['grid','#5b83c0']; }
  // Reimagine the native P2P/shop listing cards → modern light cards with game glyphs + richer info.
  var _GLYPH_CAT={'▣':'bots','⊠':'maps','✦':'strategies','▦':'backtests','↗':'indicators','❒':'apps','◆':'vehicles','◈':'gear'};
  function modernizeMarketCards(content){ try{ if(!content) return;
    content.querySelectorAll('.os-shop-item').forEach(function(card){ if(card.__mod) return; card.__mod=1; card.classList.add('cr-mkt-card');
      var ic=card.querySelector('.ic'); var ch=(ic&&(ic.textContent||'').trim())||''; var cat=_GLYPH_CAT[ch]; var meta=catMeta(cat||'bots');
      if(ic){ ic.innerHTML=nico(meta[1],meta[0]); }
      var nmEl=card.querySelector('.nm');
      if(cat && nmEl && nmEl.parentNode && !nmEl.parentNode.querySelector('.cr-mkt-badge')){ var bd=el('span','cr-mkt-badge',cat.replace('_',' ')); nmEl.parentNode.insertBefore(bd, nmEl); }
      var buy=card.querySelector('.buy'); if(buy && !buy.disabled){ buy.__lt=1;
        buy.style.setProperty('background','rgba(20,241,149,.16)','important'); buy.style.setProperty('color','#0a5e3e','important');
        buy.style.setProperty('border','.5px solid rgba(20,241,149,.42)','important'); buy.style.setProperty('border-radius','9px','important');
        buy.style.setProperty('box-shadow','none','important'); buy.style.setProperty('text-shadow','none','important'); }
    });
  }catch(e){} }
  function mktStyle(w){ try{ var c=w.querySelector('.cr-content'); lightenChrome(c); modernizeMarketCards(c); }catch(e){} }
  function marketSidebar(w){ var p=marketProgress(); var side=w.querySelector('.cr-sidebar'); var mode=(_mktTab==='gear'?'gear':'p2p');
    side.innerHTML='<div class="cr-mkt-prog"><div class="cr-mkt-lvl">Level '+p.lvl+'</div>'+
      '<div class="cr-mkt-cur">◈ <b>'+p.chart+'</b> <span>$CHART</span></div>'+
      '<div class="cr-mkt-cur">▦ <b>'+p.run+'</b> <span>$RUN</span></div></div>'+
      '<div class="cr-mkt-switch"><button type="button" data-mode="p2p" class="'+(mode==='p2p'?'on':'')+'">P2P</button><button type="button" data-mode="gear" class="'+(mode==='gear'?'on':'')+'">Shop</button></div>'+
      '<div class="cr-listsec">'+(mode==='p2p'?'P2P · $SOL':'GAME SHOP · $RUN')+'</div>';
    side.querySelectorAll('.cr-mkt-switch button').forEach(function(b){ b.onclick=function(){ var m2=b.getAttribute('data-mode'); if(m2===mode) return; _mktTab=m2;
      try{ var t=w.querySelector('.cr-content [data-shopview="'+(m2==='p2p'?'p2p':'gear')+'"]'); if(t) t.click(); }catch(e){}
      setTimeout(function(){ marketSidebar(w); mktStyle(w); },90); }; });
    var cats=w.querySelectorAll('.cr-content #crShopCatBar .crTerm-subtab');
    cats.forEach(function(cb){ var meta=catMeta(cb.textContent); var n=el('div','cr-navitem'+(cb.classList.contains('active')?' active':''),nico(meta[1],meta[0])+'<span class="cr-nlbl">'+cb.textContent+'</span>');
      n.onclick=function(){ try{ cb.click(); }catch(e){} setTimeout(function(){ marketSidebar(w); mktStyle(w); },60); }; side.appendChild(n); }); }
  function openMarket(){ var w=appWin('market','Marketplace');
    try{ w.style.width='min(960px,94vw)'; w.style.height='min(640px,86vh)'; w.style.left='calc(50% - min(480px,47vw))'; w.style.top='66px'; }catch(e){}
    hostShop(w);
    setTimeout(function(){ try{ var t=w.querySelector('.cr-content [data-shopview="'+(_mktTab==='gear'?'gear':'p2p')+'"]'); if(t) t.click(); }catch(e){} setTimeout(function(){ marketSidebar(w); mktStyle(w); },100); },80);
    w.querySelector('.cr-statusbar').textContent='Marketplace · P2P ($SOL) · Game Shop ($RUN)'; readable(w); }

  // ===== Workbench (reimagined) — the CREATE/SELL counterpart to the P2P Marketplace.
  //  List your MD files (journal notes + Bot Terminal agent outputs), maps and bots for $SOL. =====
  function addWorkbenchIcon(){ var grid=D.getElementById('osGrid'); if(!grid||D.getElementById('osIconWb'))return;
    var b=el('button','os-icon'); b.id='osIconWb'; b.title='Workbench — package & sell MD files, maps & bots on the P2P Marketplace';
    b.innerHTML='<div class="ico"><svg class="cr-svg-ico" style="--accent:#e0851a;--accent2:#7ee787" viewBox="0 0 32 32" aria-hidden="true">'
      +'<path class="a" d="M6 20 h20 v6 h-20 z" opacity=".22"/>'
      +'<path d="M6 20 h20 v6 h-20 z" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/>'
      +'<path d="M9 20 l7-12 3 5 3-3 3 4" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/></svg></div><div class="lbl">Workbench</div>';
    b.onclick=openWorkbench; wireIconSelect(b); grid.appendChild(b); }
  var _wbTab='all';
  function wbMdFiles(){ var out=[];
    asArr(LS('cr_journal_notes_v1')).forEach(function(n,i){ if(n==null)return; var t=(typeof n==='string')?n:(n.text||n.title||n.note||''); if(!t)return; out.push({name:((String(t).split('\n')[0]||('Note '+(i+1))).replace(/[#*>-]/g,'').trim().slice(0,38)||'Note')+'.md', kind:'JOURNAL NOTE', size:String(t).length}); });
    try{ var bs=JSON.parse(localStorage.getItem('crBotSessions')||localStorage.getItem('cr_bot_sessions_v1')||'[]'); if(Array.isArray(bs)) bs.forEach(function(s){ if(!s)return; out.push({name:((s.title||s.agent||'agent-session')+'.md'), kind:'BOT TERMINAL', size:(s.text?String(s.text).length:0)}); }); }catch(e){}
    return out; }
  function wbListP2P(name){ try{ pushNote('Listed on P2P · '+name, 'Queued for the P2P Marketplace — cross-player listing settles on-chain in Phase 2.'); }catch(e){} }
  function wbRow(icoColor,icoKey,name,sub,onSell){ var r=el('div','cr-wb-row'); r.innerHTML=nico(icoColor,icoKey)+'<div class="cr-wb-meta"><div class="cr-wb-nm">'+name+'</div><div class="cr-wb-sub">'+sub+'</div></div>'; var b=el('button','cr-wb-sell','List on P2P'); b.onclick=onSell; r.appendChild(b); return r; }
  function openWorkbench(){ var w=appWin('workbench','Workbench');
    try{ w.style.width='min(880px,94vw)'; w.style.height='min(600px,86vh)'; w.style.left='calc(50% - min(440px,47vw))'; w.style.top='72px'; }catch(e){}
    renderWb(w); }
  // Workbench mirrors the P2P Marketplace categories (sell side).
  var WB_CATS=[
    {k:'all',        label:'All',        ico:'grid',     color:'#5b83c0', desc:'Everything you can list on the P2P Marketplace.'},
    {k:'bots',       label:'Bots',       ico:'minigame', color:'#5b83c0', desc:'Bots you own — list a copy, earn a royalty on every sale (Phase 2).'},
    {k:'maps',       label:'Maps',       ico:'map',      color:'#e0851a', desc:'Your saved chart setups — sell them to other runners.'},
    {k:'strategies', label:'Strategies', ico:'chart',    color:'#2fa855', desc:'Rule-based strategies you author — package and list them.'},
    {k:'backtests',  label:'Backtests',  ico:'replay',   color:'#7c5cff', desc:'Recorded backtest replays — sell verified performance runs.'},
    {k:'indicators', label:'Indicators', ico:'star',     color:'#e0a326', desc:'Custom indicators you configured — list them for sale.'},
    {k:'apps',       label:'Apps',       ico:'doc',      color:'#e0556f', desc:'Mini-apps / tools you build for the OS — publish them.'},
    {k:'md',         label:'MD Files',   ico:'doc',      color:'#17b877', desc:'Markdown docs — journal notes + Bot Terminal agent outputs.'}
  ];
  function wbItems(cat){ var out=[];
    if(cat==='bots'||cat==='all'){ try{ var ob=JSON.parse(localStorage.getItem('cr_owned_bots')||'[]'); if(Array.isArray(ob)) ob.forEach(function(b){ var nm=(typeof b==='string')?b:(b&&(b.name||b.id))||'Bot'; out.push({name:nm,sub:'trading bot',ico:'minigame',color:'#5b83c0'}); }); }catch(e){} }
    if(cat==='maps'||cat==='all'){ asArr(LS('cr_maps_v1')).forEach(function(m){ if(!m)return; out.push({name:(m.name||'Setup'),sub:(((m.asset||'').toUpperCase()+(m.tf?(' · '+m.tf):''))||'chart setup'),ico:'map',color:'#e0851a'}); }); }
    if(cat==='backtests'||cat==='all'){ asArr(LS('cr_backtest_replays_v1')).forEach(function(r){ if(!r)return; out.push({name:(r.name||'Replay'),sub:'backtest replay',ico:'replay',color:'#7c5cff'}); }); }
    if(cat==='indicators'||cat==='all'){ asArr(LS('cr_indicators_v1')).forEach(function(i){ if(!i)return; var nm=(typeof i==='string')?i:(i&&(i.name||i.id))||'Indicator'; out.push({name:nm,sub:'indicator',ico:'star',color:'#e0a326'}); }); }
    if(cat==='md'||cat==='all'){ wbMdFiles().forEach(function(f){ out.push({name:f.name,sub:f.kind+' · '+f.size+' chars',ico:'doc',color:'#17b877'}); }); }
    return out; }
  function renderWb(w){ var side=w.querySelector('.cr-sidebar');
    side.innerHTML='<div class="cr-mkt-prog"><div class="cr-mkt-lvl">Creator Studio</div><div class="cr-mkt-cur">⟠ <b>P2P</b> <span>$SOL · sell side</span></div></div><div class="cr-listsec">LIST FOR SALE</div>';
    WB_CATS.forEach(function(cat){ var n=el('div','cr-navitem'+(_wbTab===cat.k?' active':''),nico(cat.color,cat.ico)+'<span class="cr-nlbl">'+cat.label+'</span>'); n.onclick=function(){ _wbTab=cat.k; renderWb(w); }; side.appendChild(n); });
    var def=WB_CATS[0]; for(var i=0;i<WB_CATS.length;i++){ if(WB_CATS[i].k===_wbTab){ def=WB_CATS[i]; break; } }
    var c=w.querySelector('.cr-content'); c.className='cr-content cr-oslight'; c.innerHTML='';
    var head=el('div'); head.innerHTML='<div class="cr-h" style="padding:14px 16px 2px">'+def.label+'</div><div class="cr-hsub" style="padding:0 16px 12px">'+def.desc+'</div>';
    var g=el('div','cr-wb-list'); var items=wbItems(_wbTab);
    if(!items.length) g.appendChild(el('div','cr-empty', _wbTab==='strategies'||_wbTab==='apps' ? ('No '+def.label.toLowerCase()+' yet — author one, then list it on the P2P Marketplace.') : ('Nothing to list here yet. Create '+def.label.toLowerCase()+' in-game and they appear here to sell.')));
    items.forEach(function(it2){ g.appendChild(wbRow(it2.color,it2.ico,it2.name,it2.sub,function(){ wbListP2P(it2.name); })); });
    c.appendChild(head); c.appendChild(g);
    w.querySelector('.cr-statusbar').textContent='Workbench · create & sell — the P2P Marketplace supply side'; readable(w); }

  // ===== Bot Terminal (reimagined) — OS-style app hosting win-bot (Console · Sessions · Agents)
  //  with a folder sidebar + light chrome. Replaces the stock dark terminal icon. =====
  function addBotIcon(){ var grid=D.getElementById('osGrid'); if(!grid||D.getElementById('osIconBot'))return;
    var b=el('button','os-icon'); b.id='osIconBot'; b.title='Bot Terminal — connect agents (Claude · Telegram · OpenClaw)';
    b.innerHTML='<div class="ico"><svg class="cr-svg-ico" style="--accent:#4ecdc4;--accent2:#7ee787" viewBox="0 0 32 32" aria-hidden="true">'
      +'<line x1="16" y1="4" x2="16" y2="8" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/><circle class="b" cx="16" cy="4" r="1.7"/>'
      +'<rect class="a" x="6" y="9" width="20" height="15" rx="3" opacity=".22"/><rect x="6" y="9" width="20" height="15" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.6"/>'
      +'<circle class="b" cx="12" cy="16" r="1.9"/><circle class="b" cx="20" cy="16" r="1.9"/></svg></div><div class="lbl">Bot Terminal</div>';
    b.onclick=openBotTerm; wireIconSelect(b); grid.appendChild(b); }
  var _botTab='console';
  function hostBot(w){ var content=w.querySelector('.cr-content'); content.className='cr-content cr-oslight cr-botterm';
    if(content.querySelector('[data-botview]')){ lightenChrome(content); return; } // already hosted → keep
    var win=D.getElementById('win-bot'); var body=win&&win.querySelector('.os-wbody');
    if(!body){ content.innerHTML='<div class="cr-fsub" style="padding:16px">Bot Terminal loading…</div>'; setTimeout(function(){ hostBot(w); },220); return; }
    content.innerHTML=''; content.appendChild(body); try{ win.classList.remove('on'); }catch(e){}
    lightenChrome(content); setTimeout(function(){ lightenChrome(content); },400); }
  function botSidebar(w){ var side=w.querySelector('.cr-sidebar'); side.innerHTML='<div class="cr-listsec">AGENTS · LABS</div>';
    function it(key,label,ico,color,bv){ var n=el('div','cr-navitem'+(_botTab===key?' active':''),nico(color,ico)+'<span class="cr-nlbl">'+label+'</span>');
      n.onclick=function(){ _botTab=key; try{ var b=w.querySelector('.cr-content [data-botview="'+bv+'"]'); if(b) b.click(); }catch(e){} side.querySelectorAll('.cr-navitem').forEach(function(x){x.classList.remove('active');}); n.classList.add('active'); setTimeout(function(){ lightenChrome(w.querySelector('.cr-content')); },60); }; side.appendChild(n); }
    it('console','Console','doc','#2fa855','console'); it('sessions','Sessions','replay','#7c5cff','sessions'); it('agents','Agents','minigame','#5b83c0','agents'); }
  function openBotTerm(){ var w=appWin('botterm','Bot Terminal');
    try{ w.style.width='min(860px,94vw)'; w.style.height='min(600px,86vh)'; w.style.left='calc(50% - min(430px,47vw))'; w.style.top='72px'; }catch(e){}
    hostBot(w); botSidebar(w);
    setTimeout(function(){ try{ var b=w.querySelector('.cr-content [data-botview="'+_botTab+'"]'); if(b) b.click(); }catch(e){} lightenChrome(w.querySelector('.cr-content')); },70);
    w.querySelector('.cr-statusbar').textContent='Bot Terminal · live agent command center · actions need player approval'; readable(w); }

  function addWalletIcon(){ var grid=D.getElementById('osGrid'); if(!grid||D.getElementById('osIconWallet'))return;
    var b=el('button','os-icon'); b.id='osIconWallet'; b.title='Wallet — balance, holdings & broker';
    b.innerHTML='<div class="ico"><svg class="cr-svg-ico" style="--accent:#2fb673;--accent2:#7ee787" viewBox="0 0 32 32" aria-hidden="true">'
      +'<rect class="a" x="4" y="8" width="24" height="17" rx="3.2" opacity=".22"/>'
      +'<rect x="4" y="8" width="24" height="17" rx="3.2" fill="none" stroke="var(--accent)" stroke-width="1.6"/>'
      +'<path class="l" d="M4 14 h24"/><circle class="b" cx="22" cy="19.5" r="2.3"/></svg></div><div class="lbl">Wallet</div>';
    b.onclick=openWalletApp; wireIconSelect(b); grid.appendChild(b); }
  var _walletTab='bal';
  function openWalletApp(){ var w=appWin('walletapp','Wallet');
    try{ w.style.width='min(900px,94vw)'; w.style.height='min(600px,86vh)'; w.style.left='calc(50% - min(450px,47vw))'; w.style.top='72px'; }catch(e){}
    renderWallet(w, _walletTab); }
  function renderWallet(w, tab){ _walletTab=tab||'bal';
    var side=w.querySelector('.cr-sidebar'); side.innerHTML='<div class="cr-listsec">ACCOUNT</div>';
    function item(key,label,ico,color){ var n=el('div','cr-navitem'+(_walletTab===key?' active':''),nico(color,ico)+'<span class="cr-nlbl">'+label+'</span>'); n.onclick=function(){ renderWallet(w,key); }; side.appendChild(n); }
    item('bal','Wallet','wallet','#2fa855'); item('broker','Broker','swap','#5b83c0');
    var c=w.querySelector('.cr-content'); c.className='cr-content cr-oslight';
    var bal=pv('crProfileViewBal'), br=pv('crProfileViewBroker');
    stashPV(bal); stashPV(br); c.innerHTML='';
    var active=(_walletTab==='broker'?br:bal);
    if(active){ active.classList.remove('hidden'); c.appendChild(active); lightenChrome(active); setTimeout(function(){ lightenChrome(active); },400); }
    else c.innerHTML='<div class="cr-fsub" style="padding:16px">This view is unavailable.</div>';
    w.querySelector('.cr-statusbar').textContent=(_walletTab==='broker'?'Broker · connect once':'Wallet · balance, holdings & claim'); readable(w); }
  // Neutralise inline !important dark backgrounds (e.g. .cr-go buttons like Switch/Refresh/Add token)
  // so hosted native chrome matches the light OS style. CSS can't beat inline-!important — do it in JS.
  // luminance test — is this element's background dark or mid-dark? (catches navy inline,
  // class-based dark, AND the game's mid-gray pills uniformly).
  function _isDark(el){ try{ var bg=getComputedStyle(el).backgroundColor||''; var m=bg.match(/[\d.]+/g); if(!m||m.length<3) return false;
    var a=(m.length>3?parseFloat(m[3]):1); if(a<0.22) return false; var lum=0.299*+m[0]+0.587*+m[1]+0.114*+m[2]; return lum<150; }catch(e){ return false; } }
  // Convert any dark/mid-dark native button + field to the light OS style. Idempotent (__lt flag).
  function lightenChrome(root){ try{
    root.querySelectorAll('button, .cr-go, .brBtn').forEach(function(b){ if(b.__lt||!_isDark(b)) return;
      b.style.setProperty('background','rgba(120,122,132,.15)','important'); b.style.setProperty('color','#1a1a18','important');
      b.style.setProperty('border','.5px solid rgba(120,122,132,.28)','important'); b.style.setProperty('border-radius','9px','important');
      b.style.setProperty('box-shadow','none','important'); b.style.setProperty('text-shadow','none','important'); b.__lt=1; });
    root.querySelectorAll('input:not([type=checkbox]):not([type=radio]), select, textarea').forEach(function(i){ if(i.__lt||!_isDark(i)) return;
      i.style.setProperty('background','rgba(120,122,132,.10)','important'); i.style.setProperty('color','#1a1a18','important');
      i.style.setProperty('border','.5px solid rgba(120,122,132,.26)','important'); i.style.setProperty('border-radius','8px','important'); i.__lt=1; });
  }catch(e){} }
  function lightenWindows(){ try{ D.querySelectorAll('.os-window.on').forEach(function(win){ var body=win.querySelector('.os-wbody'); if(body) lightenChrome(body); });
    // keep the reimagined market cards styled even after the game re-renders the grid
    D.querySelectorAll('.cr-content.cr-market').forEach(function(c){ modernizeMarketCards(c); });
    // also the body-level overlays: the detail drawer + the terminal settings/picker modal
    ['#drawer','#crTermPicker','#statsDrawer','#crTvSettings','#crWidgetLayer','#crChartWidgetLayer'].forEach(function(sel){ var e=D.querySelector(sel); if(e && e.offsetParent!==null) lightenChrome(e); });
  }catch(e){} }

  // ---- Laser gate helpers ----
  function laserOk(feat){ try{ return typeof window.crFeatureLevelOk==='function' ? !!window.crFeatureLevelOk(feat) : true; }catch(e){ return true; } }
  function laserCh(feat){ try{ return (typeof window.crFeatureUnlockLv==='function' ? window.crFeatureUnlockLv(feat) : 0)||0; }catch(e){ return 0; } }
  var LASERS=[
    {key:'red', num:'2', ic:'◎', col:'#e0556f', nm:'Red Laser',        feat:null,        desc:'Draw & place chart tools — trendlines, fibs, channels, primitives.'},
    {key:'act', num:'3', ic:'◉', col:'#2fa855', nm:'Activation Laser', feat:'activation',desc:'Arms a placed level into a live order route — touch/close triggers a bracket.'},
    {key:'alt', num:'4', ic:'◔', col:'#e0851a', nm:'Alert Laser',      feat:'alarm',     desc:'Turns a level into a price alert that fires into your notifications.'}
  ];
  function laserById(k){ for(var i=0;i<LASERS.length;i++) if(LASERS[i].key===k) return LASERS[i]; return LASERS[0]; }
  function laserActive(l){ return !l.feat || laserOk(l.feat); }

  // ---- Red Laser Tools — dark command-palette-style window, searchable ----
  var _laserWin=null;
  function openLaserConfig(){ openLaserTools(); }   // laser card entry point
  function openLaserTools(){
    if(!_laserWin){ _laserWin=el('div','cr-hidden'); _laserWin.id='crLaserTools';
      _laserWin.innerHTML='<div class="cr-lt-bar"><span class="cr-lt-ttl">◎ Red Laser · Tools</span><span class="cr-lt-cnt" id="crLtCount"></span><button type="button" class="cr-lt-x" id="crLtX">✕</button></div>'+
        '<input id="crLtSearch" placeholder="Search chart tools…" autocomplete="off" spellcheck="false"><div class="cr-lt-body" id="crLtBody"></div>';
      D.body.appendChild(_laserWin);
      _laserWin.querySelector('#crLtX').onclick=closeLaserTools;
      _laserWin.querySelector('#crLtSearch').oninput=function(e){ filterTools(e.target.value); };
    }
    var body=_laserWin.querySelector('#crLtBody'); var v=pv('crProfileViewTools'); stashPV(v);
    body.innerHTML=''; if(v){ v.classList.remove('hidden'); body.appendChild(v); } else body.innerHTML='<div class="cr-lt-empty">Red Laser loadout unavailable.</div>';
    _laserWin.classList.remove('cr-hidden');
    var s=_laserWin.querySelector('#crLtSearch'); s.value=''; filterTools('');
    setTimeout(function(){ try{ s.focus(); }catch(e){} },40); }
  function closeLaserTools(){ if(_laserWin){ var v=pv('crProfileViewTools'); if(v) stashPV(v); _laserWin.classList.add('cr-hidden'); } }
  function filterTools(q){ if(!_laserWin) return; q=(q||'').trim().toLowerCase();
    var tiles=_laserWin.querySelectorAll('#wbToolEquippedZone button, #wbToolAvailZone button'); var n=0;
    Array.prototype.forEach.call(tiles,function(t){ var m=!q||((t.textContent||'').toLowerCase().indexOf(q)>=0); t.style.display=m?'':'none'; if(m)n++; });
    var cnt=_laserWin.querySelector('#crLtCount'); if(cnt) cnt.textContent=q?(n+' match'+(n===1?'':'es')):''; }

  // ---- LASER card in the Profile altar (square, beside Vehicle) ----
  function refreshLaserLocks(){ var card=D.getElementById('crLaserCard'); if(!card) return; var nm=card.querySelector('.ps-name'); if(!nm)return;
    nm.innerHTML=LASERS.map(function(l){ return laserActive(l)? ('<b>'+l.num+'</b>') : (l.num+'🔒'); }).join(' · '); }
  function injectLaserCard(){ var center=D.querySelector('#win-wallet .player-altar-center'); if(!center){ return; }
    if(D.getElementById('crLaserCard')){ refreshLaserLocks(); return; }
    var veh=D.getElementById('crPlayerSlot-vehicle'); if(!veh) return;
    var card=el('div','player-slot cr-laser-slot'); card.id='crLaserCard'; card.setAttribute('data-slot','laser');
    card.innerHTML='<div class="ps-frame"><div class="ps-ic cr-laser-ic">◎</div></div><div class="ps-cap">LASER</div><div class="ps-name">2 · 3 · 4</div>';
    card.onclick=function(e){ e.stopPropagation(); openLaserConfig('red'); };
    // wrap Vehicle + Laser into one side-by-side row (equal size)
    var row=D.getElementById('crVehLaserRow');
    if(!row){ row=el('div','cr-vl-row'); row.id='crVehLaserRow'; if(veh.parentNode===center) center.insertBefore(row, veh); else center.appendChild(row); row.appendChild(veh); }
    row.appendChild(card); refreshLaserLocks(); }
  // Runner name below the avatar: a transparent "Search"-style field when unnamed,
  // or just the name once set. Uses the local handle (window.crRunnerName) to claim.
  function playerName(){ var nm=''; try{ if(window.crRunnerName && typeof crRunnerName.get==='function') nm=(crRunnerName.get()||'').trim(); }catch(e){}
    if(!nm){ var s=D.getElementById('crProfilePlayerName'); var t=s?(s.textContent||'').trim():''; if(t && t.toLowerCase()!=='anon_runner') nm=t; } return nm; }
  function arrangeProfile(){ var center=D.querySelector('#win-wallet .player-altar-center'); if(!center) return;
    // Keep the Profile on the player loadout — the COACH.llm config belongs to the COACH.llm
    // window, not the Profile (both were opening it). Force PLAYER, hide any COACH-in-profile.
    try{ var _cv=D.getElementById('crProfileViewCoach'); if(_cv && _cv.closest && _cv.closest('#win-wallet')) _cv.classList.add('hidden');
      var _pv2=D.querySelector('#win-wallet #crProfileViewPlayer'); if(_pv2) _pv2.classList.remove('hidden'); }catch(e){}
    var avatar=center.querySelector('.player-altar-avatar'); if(!avatar) return;
    var id=D.getElementById('crIdentUnder');
    if(!id){ id=el('div','cr-ident-under'); id.id='crIdentUnder'; avatar.parentNode.insertBefore(id, avatar.nextSibling); }
    var nm=playerName(), mode=id.getAttribute('data-mode');
    if(nm){ if(mode!=='name'){ id.setAttribute('data-mode','name'); id.innerHTML='<span class="cr-ident-name" id="crIdentName"></span>'; }
      var n=D.getElementById('crIdentName'); if(n && n.textContent!==nm) n.textContent=nm; }
    else if(mode!=='input'){ id.setAttribute('data-mode','input');
      id.innerHTML='<input type="text" class="cr-ident-field" id="crIdentField" placeholder="Claim your name" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false">';
      var f=D.getElementById('crIdentField');
      f.onclick=function(e){ e.stopPropagation(); };
      f.onkeydown=function(e){ if(e.key==='Enter'){ var v=(f.value||'').trim(); if(v){ try{ if(window.crRunnerName) crRunnerName.set(v); }catch(_){}
        try{ pushNote('Runner name set', 'You are now '+((window.crRunnerName&&crRunnerName.get())||v)+'.'); }catch(_){}
        arrangeProfile(); } } }; } }

  // =============================================================
  //  SIDEBAR DRAWER — every app sidebar becomes a collapsible drawer
  //  toggled by a small titlebar button. 3 modes (global, persisted):
  //    open   — sidebar pinned in flow (default)
  //    fluid  — sidebar hidden; slides in as an overlay when the cursor
  //             approaches the left edge of the window frame
  //    closed — sidebar fully hidden, content full width
  // =============================================================
  var _SB_MODES=['open','closed'];
  function drawerMode(){ try{ var m=localStorage.getItem('cr_os_sb_mode'); return _SB_MODES.indexOf(m)>=0?m:'open'; }catch(e){ return 'open'; } }
  function drawerIcon(m){ return m==='open'?'❰':'❯'; }
  function applyDrawerMode(m){ var r=D.documentElement; ['open','fluid','closed'].forEach(function(x){ r.classList.remove('cr-sbmode-'+x); }); r.classList.add('cr-sbmode-'+m);
    try{ localStorage.setItem('cr_os_sb_mode',m); }catch(e){}
    D.querySelectorAll('.cr-sb-toggle').forEach(function(b){ b.textContent=drawerIcon(m); b.title='Sidebar drawer: '+m.toUpperCase()+' · click to toggle (open ↔ closed)'; }); }
  function cycleDrawer(){ var i=_SB_MODES.indexOf(drawerMode()); applyDrawerMode(_SB_MODES[(i+1)%_SB_MODES.length]); }
  function setupDrawers(){ try{
    D.querySelectorAll('.os-window').forEach(function(win){
      var body=win.querySelector('.cr-appbody'); if(!body){ var fb=win.querySelector('.os-wbody.cr-folded'); if(fb) body=fb; }
      if(!body) return; var sb=null, kids=body.children; for(var i=0;i<kids.length;i++){ if(kids[i].classList&&kids[i].classList.contains('cr-sidebar')){ sb=kids[i]; break; } }
      if(!sb) return; body.classList.add('cr-drawerhost'); body.style.position='relative';
      var hot=body.querySelector(':scope > .cr-sb-hot'); if(!hot){ hot=el('div','cr-sb-hot'); body.insertBefore(hot, body.firstChild); }
      if(hot.nextSibling!==sb){ body.insertBefore(sb, hot.nextSibling); }
      var has=false, wk=win.children; for(var j=0;j<wk.length;j++){ if(wk[j].classList&&wk[j].classList.contains('cr-sb-toggle')){ has=true; break; } }
      if(!has){ if(getComputedStyle(win).position==='static') win.style.position='relative'; var btn=el('button','cr-sb-toggle'); btn.type='button'; btn.textContent=drawerIcon(drawerMode()); btn.title='Sidebar drawer'; btn.onclick=function(e){ e.stopPropagation(); e.preventDefault(); cycleDrawer(); }; win.appendChild(btn); }
    });
  }catch(e){} }

  // real apps that already exist (win-<id>) — the palette/CC route here, nothing new is created
  var APPS = [
    ['chartrunner','▶','Play — Configure Run'], ['terminal','⌨','Terminal'], ['profile','☺','Profile'],
    ['maps','▤','Maps'], ['journal','✎','Journal'], ['tokenterm','◎','Token Terminal'],
    ['missions','🎯','Missions'], ['shop','◆','Shop'], ['stats','◉','Stats'], ['wallet','▦','Wallet'], ['run','◷','Run']
  ];

  // ---------- theme ----------
  // The live desktop-OS themes (game's THEMES cycle = platinum/ascii/frontier/bw/mono;
  // liquid+solana are NOT live — they normalize to platinum. ascii/frontier archive on the
  // public surface, so the always-live trio is Platinum · Monochrome · B&W). Theme is set on
  // #splash — a MutationObserver mirrors it to body[data-os-theme]; 'platinum' = no attribute.
  var THEMES=[['platinum','Platinum'],['mono','Monochrome'],['bw','B&W']];
  function setTheme(n){ try{ var sp=D.getElementById('splash'); if(sp){ if(n==='platinum') sp.removeAttribute('data-theme'); else sp.setAttribute('data-theme',n); } localStorage.setItem('cr_os_theme',n); setTimeout(readableAll,60); }catch(e){} }
  function curTheme(){ try{ var sp=D.getElementById('splash'); var t=sp&&sp.getAttribute('data-theme'); return t||localStorage.getItem('cr_os_theme')||'platinum'; }catch(e){ return 'platinum'; } }

  function closePops(except){ if(except!=='cc'&&cc)cc.classList.add('cr-hidden'); if(except!=='n'&&np)np.classList.add('cr-hidden'); if(except!=='p'&&pal)pal.classList.add('cr-hidden'); }

  // ---------- Control Center ----------
  var cc=null, _sol=null;
  function toggleCC(){ closePops('cc'); if(!cc){ cc=el('div','cr-pop cr-hidden'); cc.id='crCCpop'; cc.style.right='10px'; D.body.appendChild(cc); } cc.classList.toggle('cr-hidden'); if(!cc.classList.contains('cr-hidden')) renderCC(); }
  function renderCC(){ var rm=localStorage.getItem('cr_reduce_motion')==='1'; var ct=curTheme();
    var notesHtml=notes.length ? notes.slice(0,10).map(function(n){ return '<div class="cr-note"><div class="cr-nt">'+n.t+'</div>'+(n.m?'<div class="cr-nm">'+n.m+'</div>':'')+'</div>'; }).join('') : '<div class="cr-note-empty">No notifications</div>';
    cc.innerHTML=
      '<div class="cr-cctop"><button type="button" class="cr-ccsi" id="ccSearch" title="Search apps &amp; commands (Cmd/Ctrl+K)">⌕</button><span class="cr-ccsol" id="ccSol">◎ '+(_sol!=null?_sol:'—')+'</span></div>'+
      '<div class="cr-cch">THEME</div><div class="cr-ccrow" id="ccTh"></div>'+
      '<div class="cr-cch">NOTIFICATIONS'+(notes.length?(' · '+notes.length+' <span class="cr-ccclear" id="ccClear">clear</span>'):'')+'</div>'+
      '<div class="cr-ccnotes">'+notesHtml+'</div>';
    var th=cc.querySelector('#ccTh'); THEMES.forEach(function(t){ var b=el('span','cr-ccbtn'+(t[0]===ct?' active':''),'<span>'+t[1]+'</span>'); b.onclick=function(){ setTheme(t[0]); renderCC(); }; th.appendChild(b); });
    cc.querySelector('#ccSearch').onclick=function(e){ if(e){ e.stopPropagation(); e.preventDefault(); } cc.classList.add('cr-hidden'); setTimeout(openPalette,0); };
    var clr=cc.querySelector('#ccClear'); if(clr) clr.onclick=function(e){ e.stopPropagation(); notes.length=0; var mb=D.getElementById('crMenuCC'); if(mb) mb.removeAttribute('data-n'); renderCC(); };
  }

  // ---------- Notifications (captures the game's own toasts) ----------
  var notes=[], np=null;
  function pushNote(t,m){ notes.unshift({t:t,m:m||''}); if(notes.length>30)notes.pop(); var b=D.getElementById('crMenuCC'); if(b)b.setAttribute('data-n',notes.length); if(cc&&!cc.classList.contains('cr-hidden'))renderCC(); }
  function toggleNotes(){ closePops('n'); if(!np){ np=el('div','cr-pop cr-hidden'); np.id='crNotePop'; np.style.right='10px'; D.body.appendChild(np); } np.classList.toggle('cr-hidden'); if(!np.classList.contains('cr-hidden'))renderNotes(); }
  function renderNotes(){ np.innerHTML='<div class="cr-cch">NOTIFICATIONS</div>'+(notes.length?notes.map(function(n){ return '<div class="cr-note"><div class="cr-nt">'+n.t+'</div>'+(n.m?'<div class="cr-nm">'+n.m+'</div>':'')+'</div>'; }).join(''):'<div class="cr-note-empty">No notifications</div>'); }
  function hookToasts(){ try{ if(typeof window.toast==='function' && !window.toast.__crWrapped){ var o=window.toast; window.toast=function(msg){ try{ pushNote(String(msg).slice(0,64),''); }catch(e){} return o.apply(this,arguments); }; window.toast.__crWrapped=1; } }catch(e){} }

  // ---------- Command palette (Spotlight over the existing OS) ----------
  var pal=null, palItems=[], palSel=0;
  function commands(){ var c=APPS.map(function(a){ return {k:a[1],l:a[2],t:'app',run:function(){ osOpen(a[0]); }}; });
    c.push({k:'🗂',l:'Docs',t:'app',run:openFiles});
    c.push({k:'⌃',l:'Control Center',t:'sys',run:toggleCC});
    return c; }
  function openPalette(){ closePops('p'); if(!pal){ pal=el('div','cr-hidden'); pal.id='crPalette'; pal.innerHTML='<input placeholder="Search apps, commands, themes…"><div class="cr-pres"></div>'; D.body.appendChild(pal);
      var inp=pal.querySelector('input');
      inp.addEventListener('input',function(e){ renderPal(e.target.value); });
      inp.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){e.preventDefault();palSel=Math.min(palSel+1,palItems.length-1);hi();} else if(e.key==='ArrowUp'){e.preventDefault();palSel=Math.max(palSel-1,0);hi();} else if(e.key==='Enter'){ var it=palItems[palSel]; if(it){ pal.classList.add('cr-hidden'); it.run(); } } else if(e.key==='Escape'){ pal.classList.add('cr-hidden'); } }); }
    pal.classList.remove('cr-hidden'); var i2=pal.querySelector('input'); i2.value=''; renderPal(''); i2.focus(); }
  function hi(){ var rows=pal.querySelectorAll('.cr-pitem'); rows.forEach(function(r,i){ r.classList.toggle('sel',i===palSel); }); var s=rows[palSel]; if(s)s.scrollIntoView({block:'nearest'}); }
  function renderPal(q){ q=(q||'').toLowerCase(); palItems=commands().filter(function(c){return !q||c.l.toLowerCase().indexOf(q)>=0;}); palSel=0;
    var res=pal.querySelector('.cr-pres'); res.innerHTML='';
    palItems.forEach(function(c,i){ var r=el('div','cr-pitem'+(i===0?' sel':''),'<span class="cr-pk">'+c.k+'</span><span class="cr-pl">'+c.l+'</span><span class="cr-ptag">'+c.t+'</span>'); r.onclick=function(){ pal.classList.add('cr-hidden'); c.run(); }; res.appendChild(r); });
    if(!palItems.length) res.innerHTML='<div class="cr-note-empty">No matches</div>'; }

  // ---------- menubar tray (into the existing bar, beside #crBarClock) ----------
  // inject into the VISIBLE desktop menubar (the splash bar with Theme / Connect), not the in-game bar
  function addTray(){ var connect=D.getElementById('crMenuConnect'); if(!connect||D.getElementById('crMenuDev'))return; var bar=connect.parentNode;
    function mk(id,txt,title,fn){ var d=el('div','menu'); d.id=id; if(title)d.title=title; d.innerHTML=txt; if(fn)d.onclick=fn; return d; }
    // Local Dev right next to Connect
    var dev=mk('crMenuDev','Local Dev','Connect a local dev session — unlocks Maps / Journal / economy',toggleDev);
    bar.insertBefore(dev, connect.nextSibling);
    // Economy — opens the Econ Setup inspector (connects Local Dev first if needed)
    var econ=mk('crMenuEcon','Economy','Open the Economic Setup inspector',function(){ if(isGuest()) localDevConnect();
      try{ if(window.crEconSetup && typeof crEconSetup.toggle==='function') crEconSetup.toggle(); else if(typeof toast==='function') toast('Econ inspector unavailable'); }catch(e){} });
    bar.insertBefore(econ, dev.nextSibling);
    // Unlock — reveal every gated app/feature (dev convenience)
    var unlock=mk('crMenuUnlock','🔓 Unlock','Unlock every app & feature so all apps are visible (PL10 · Local Dev)',unlockAll);
    if(isMaxed()||isUnlocked()){ unlock.classList.add('cr-on'); unlock.textContent='🔓 Unlocked ✓'; }
    bar.insertBefore(unlock, econ.nextSibling);
    // right-side cluster → ONE Control Center button (unique sliders glyph).
    // Search · SOL · Notifications all live INSIDE the Control Center now.
    var spacer=bar.querySelector('.spacer');
    var ccGlyph='<svg class="cr-ccglyph" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h8M18 8h2M4 16h2M12 16h8"/><circle cx="15" cy="8" r="2.6" fill="currentColor" stroke="none"/><circle cx="9" cy="16" r="2.6" fill="currentColor" stroke="none"/></svg>';
    var ccb=mk('crMenuCC',ccGlyph,'Control Center — search, notifications, SOL & themes',toggleCC);
    if(spacer&&spacer.parentNode===bar){ bar.insertBefore(ccb, spacer.nextSibling); } else bar.appendChild(ccb);
    if(!isGuest()){ dev.classList.add('cr-on'); dev.textContent='Local Dev ✓'; }
    function tick(){ try{ var s=(window.crWalletBalances&&window.crWalletBalances.SOL); _sol=(s!=null?(Math.round(s*100)/100):null); var el2=D.getElementById('ccSol'); if(el2) el2.textContent='◎ '+(_sol!=null?_sol:'—'); }catch(e){} }
    tick(); setInterval(tick,20000); }

  // ---------- Window dock / taskbar (Kimi window structure, native look) ----------
  function winTitle(w){ var t=w.querySelector('.os-wbar .ttl'); var s=t?(t.textContent||'').replace(/\s+/g,' ').trim():''; if(!s) s=(w.id||'').replace(/^win-/,''); return s.slice(0,20); }
  function focusWin(w){ try{
      if(w.classList.contains('cr-min-hidden')){ w.classList.remove('cr-min-hidden'); w.classList.add('on'); }
      var z=100; D.querySelectorAll('.os-window.on').forEach(function(x){ var zz=parseInt(getComputedStyle(x).zIndex,10)||0; if(zz>z)z=zz; });
      w.style.zIndex=(z+1); }catch(e){} buildDock(); }
  function buildDock(){ try{
      var dock=D.getElementById('crDock'); if(!dock){ dock=el('div'); dock.id='crDock'; D.body.appendChild(dock); }
      var frag=D.createDocumentFragment(), n=0, seen={};
      D.querySelectorAll('.os-window').forEach(function(w){
        if(!w.id || seen[w.id]) return;
        var on=w.classList.contains('on'), mini=w.classList.contains('cr-min-hidden');
        if(!on && !mini) return; seen[w.id]=1; n++;
        var e=el('div','cr-dwin'+(mini?' min':''),'<span class="cr-ddot"></span>'+winTitle(w));
        e.title=(mini?'Restore ':'Focus ')+winTitle(w);
        e.onclick=function(ev){ ev.stopPropagation(); focusWin(w); };
        frag.appendChild(e);
      });
      dock.innerHTML=''; dock.appendChild(frag);
    }catch(e){} }

  // Replace an app's top tab row with a left folder-sidebar (like Docs), in its own window.
  function foldToSidebar(winId, tabsId, sec, items){ try{
    var win=D.getElementById(winId); if(!win) return; var body=win.querySelector('.os-wbody');
    if(!body || body.classList.contains('cr-folded')) return; var tabs=D.getElementById(tabsId); if(!tabs) return;
    var main=el('div','cr-appmain cr-oslight'); while(body.firstChild){ main.appendChild(body.firstChild); }
    var side=el('div','cr-sidebar'); side.innerHTML='<div class="cr-listsec">'+(sec||'')+'</div>';
    items.forEach(function(it){ var n=el('div','cr-navitem',nico(it.color,it.ico)+'<span class="cr-nlbl">'+it.label+'</span>');
      n.onclick=function(){ try{ var b=main.querySelector(it.sel); if(b) b.click(); }catch(e){} side.querySelectorAll('.cr-navitem').forEach(function(x){x.classList.remove('active');}); n.classList.add('active'); };
      side.appendChild(n); });
    body.appendChild(side); body.appendChild(main); body.classList.add('cr-folded');
    try{ var prev=tabs.previousElementSibling; if(prev && /^H[1-6]$/.test(prev.tagName)) prev.classList.add('cr-modehead-redundant'); }catch(e){}
    var activeIdx=0; items.forEach(function(it,i){ try{ var b=main.querySelector(it.sel); if(b&&(b.classList.contains('on')||b.classList.contains('active'))) activeIdx=i; }catch(e){} });
    var navs=side.querySelectorAll('.cr-navitem'); if(navs[activeIdx]) navs[activeIdx].classList.add('active');
  }catch(e){ try{console.warn('fold',e);}catch(_){}} }
  function foldApps(){
    foldToSidebar('win-run','crModeTabs','MODE',[
      {label:'Regular',ico:'run',color:'#2fa855',sel:'[data-cat="regular"]'},
      {label:'Campaign',ico:'campaign',color:'#5b83c0',sel:'[data-cat="campaign"]'},
      {label:'Minigame',ico:'minigame',color:'#e0851a',sel:'[data-cat="minigame"]'},
      {label:'Rooms',ico:'rooms',color:'#7c5cff',sel:'[data-cat="rooms"]'}]);
    foldToSidebar('win-tokenterm','crTokTabs','RESEARCH',[
      {label:'All',ico:'grid',color:'#5b83c0',sel:'[data-toktab="all"]'},
      {label:'Winners',ico:'star',color:'#2fa855',sel:'[data-toktab="winners"]'},
      {label:'Losers',ico:'down',color:'#e0556f',sel:'[data-toktab="losers"]'},
      {label:'Watchlist',ico:'starO',color:'#e0a326',sel:'[data-toktab="watchlist"]'}]);
  }
  function init(){ try{ try{ window.CR_BOTTERM_TO_COACH=false; }catch(e){}  /* Bot Terminal opens win-bot, not Profile→COACH */
    addTray(); addFilesIcon(); addWalletIcon(); addMarketIcon(); addWorkbenchIcon(); addBotIcon(); hookToasts(); buildDock(); setInterval(buildDock, 1000); startAlarmMonitor(); foldApps(); setTimeout(foldApps,1500); injectLaserCard(); arrangeProfile(); setInterval(function(){ injectLaserCard(); arrangeProfile(); }, 2000); applyDrawerMode(drawerMode()); setupDrawers(); setInterval(setupDrawers, 1000); lightenWindows(); setInterval(lightenWindows, 1000); if(isUnlocked()) setTimeout(applyUnlock, 700);
    var wl=D.getElementById('crOsWidgets'); if(wl) wl.remove();
    pushNote('ChartRunnerOS ready','Press Cmd/Ctrl+K to search · click Local Dev in the menubar to unlock the economy.');
  }catch(e){ try{console.warn('CROSNative',e);}catch(_){}} }
  if(D.readyState==='loading') D.addEventListener('DOMContentLoaded',function(){ setTimeout(init,600); }); else setTimeout(init,600);
  D.addEventListener('keydown',function(e){ if((e.metaKey||e.ctrlKey)&&(e.key==='k'||e.key==='K'||e.key==='/')){ e.preventDefault(); openPalette(); }
    if(e.key==='Escape'&&_laserWin&&!_laserWin.classList.contains('cr-hidden')) closeLaserTools(); });
  D.addEventListener('click',function(e){ if(_laserWin&&!_laserWin.classList.contains('cr-hidden')&&!e.target.closest('#crLaserTools')&&!e.target.closest('#crLaserCard')) closeLaserTools();
    if(pal&&!pal.classList.contains('cr-hidden')&&!e.target.closest('#crPalette')&&!e.target.closest('#crMenuSearch')) pal.classList.add('cr-hidden');
    if(cc&&!cc.classList.contains('cr-hidden')&&!e.target.closest('#crCCpop')&&!e.target.closest('#crMenuCC')) cc.classList.add('cr-hidden');
    if(np&&!np.classList.contains('cr-hidden')&&!e.target.closest('#crNotePop')&&!e.target.closest('#crMenuNotif')) np.classList.add('cr-hidden'); });

  window.CROS={ palette:openPalette, cc:toggleCC, notify:pushNote, setTheme:setTheme, files:openFiles, localDev:localDevConnect };
})();
