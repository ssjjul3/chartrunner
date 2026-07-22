/* ChartRunnerOS core — window-manager kernel + dock indicators + desktop widgets (v1, 2026-07-17)
   Additive & defensive: hooks the EXISTING os-window (.on toggle), traffic dots (.dot.yel/.grn),
   dock (.dockBtn[data-prog]) and widget layer (#crWidgetLayer). Wires the previously-decorative
   yellow (minimize) + green (maximize) dots, adds dock running/minimized indicators, and populates
   the empty widget layer. Nothing here touches the game canvas or existing close (red) handler. */
(function CROS(){
  if (window.__CROS_CORE__) return; window.__CROS_CORE__ = 1;
  var D = document;
  var LS = 'cr_os_core_v1';
  var state = { min:{}, max:{} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(LS) || '{}')); } catch(e){}
  function save(){ try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e){} }
  function winFor(prog){ return D.getElementById('win-' + prog); }
  function progOf(win){ return (win && win.id || '').replace(/^win-/, ''); }

  // ---- maximize / restore (green dot) ----
  function toggleMax(win){
    if (!win) return;
    if (win.classList.contains('cr-max')){
      win.classList.remove('cr-max');
      if (win.__prevCss != null){ win.style.cssText = win.__prevCss; win.__prevCss = null; }
      delete state.max[win.id];
    } else {
      win.__prevCss = win.style.cssText; win.classList.add('cr-max'); state.max[win.id] = 1;
    }
    save();
  }

  // ---- minimize / restore (yellow dot -> dock) ----
  function minimize(win){
    if (!win) return; var prog = progOf(win);
    win.classList.remove('on'); win.classList.add('cr-min-hidden');
    state.min[prog] = 1; save(); syncDock();
  }
  function restore(prog){
    var win = winFor(prog); if (!win) return;
    win.classList.remove('cr-min-hidden'); delete state.min[prog];
    try { if (typeof osOpenWindow === 'function') osOpenWindow(prog); else win.classList.add('on'); }
    catch(e){ win.classList.add('on'); }
    save(); syncDock();
  }

  // delegated: wire yellow/green dots (red left to the existing close handler)
  D.addEventListener('click', function(e){
    var dot = e.target.closest && e.target.closest('.os-window .os-wbar .dots .dot');
    if (!dot) return;
    var win = dot.closest('.os-window'); if (!win) return;
    if (dot.classList.contains('yel')){ e.preventDefault(); e.stopPropagation(); minimize(win); }
    else if (dot.classList.contains('grn')){ e.preventDefault(); e.stopPropagation(); toggleMax(win); }
  }, true);

  // ---- dock running/minimized indicators + restore-on-click ----
  function syncDock(){
    var btns = D.querySelectorAll('.dockBtn[data-prog]');
    for (var i=0;i<btns.length;i++){
      var b = btns[i], prog = b.getAttribute('data-prog'), win = winFor(prog);
      var open = !!(win && win.classList.contains('on'));
      var mini = !!state.min[prog];
      b.classList.toggle('cr-run', open || mini);
      b.classList.toggle('cr-run-min', mini && !open);
    }
  }
  D.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.dockBtn[data-prog]');
    if (!b) return; var prog = b.getAttribute('data-prog');
    if (state.min[prog]) restore(prog);
  }, false);

  // keep dock in sync when any window's .on toggles (e.g. via existing osOpenWindow)
  try {
    var mo = new MutationObserver(function(){ syncDock(); });
    D.querySelectorAll('.os-window').forEach(function(w){ mo.observe(w, {attributes:true, attributeFilter:['class']}); });
  } catch(e){}

  function applyPersist(){
    D.querySelectorAll('.os-window').forEach(function(w){
      if (state.max[w.id]){ w.__prevCss = w.style.cssText; w.classList.add('cr-max'); }
    });
    Object.keys(state.min).forEach(function(prog){
      var w = winFor(prog); if (w){ w.classList.remove('on'); w.classList.add('cr-min-hidden'); }
    });
  }

  // ---- desktop widgets (populate the existing empty #crWidgetLayer) ----
  function el(tag, cls, html){ var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(sel){ try { var n = D.querySelector(sel); return n ? (n.textContent||'').trim() : ''; } catch(e){ return ''; } }
  function buildWidgets(){
    var layer = D.getElementById('crWidgetLayer'); if (!layer) return;
    var host = D.getElementById('crOsWidgets');
    if (!host){ host = el('div'); host.id = 'crOsWidgets'; layer.appendChild(host); }
    host.innerHTML = '';
    // clock / session
    var wc = el('div', 'crw-widget crw-clock'); host.appendChild(wc);
    function tick(){ var d = new Date(); wc.innerHTML = '<div class="crw-time">' +
      d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + '</div><div class="crw-sub">ChartRunnerOS</div>'; }
    tick(); setInterval(tick, 15000);
    // watchlist (current symbol)
    var sym = txt('#crTvSymTxt') || 'BTC/USDT';
    host.appendChild(el('div', 'crw-widget crw-watch',
      '<div class="crw-h">WATCHLIST</div><div class="crw-row"><span>' + sym +
      '</span><span class="crw-spark">▁▂▄▆▅▇</span></div>'));
    // run / status
    host.appendChild(el('div', 'crw-widget crw-run',
      '<div class="crw-h">RUN</div><div class="crw-run-b" id="crwRunBody">—</div>'));
    function runTick(){
      var b = D.getElementById('crwRunBody'); if (!b) return;
      var s = txt('#win-run .os-body') || txt('#win-run');
      b.textContent = s ? s.slice(0, 64) : 'No active run';
    }
    runTick(); setInterval(runTick, 4000);
  }

  function init(){ try { applyPersist(); syncDock(); /* desktop widgets removed — integrate into existing apps, no extra surfaces */ } catch(e){ try{ console.warn('CROS', e); }catch(_){}} }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();

  window.CRWM = { minimize:minimize, restore:restore, toggleMax:toggleMax, sync:syncDock, state:state };
})();
