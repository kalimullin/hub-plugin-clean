# Check: the session list scrolled to the bottom stays there when the hub sends fresh snapshots ("Detailed list" on).
# The core rebuilds rows on every snapshot and erases foreign attributes (reconcile.js), so for a moment the rows
# are single-line, the list is shorter and the browser clamps the scroll; the theme has to put it back.
# Second check ("Sort by last message" is on by default): a chat that wrote last and sits below the window rises above it, and
# the rows in view stay where they are (the list is scrolled by the shift).
# Run: python3 tests/scroll-check.py <core repo> [sidebar-groups plugin folder]. Exit code 1 — the list was thrown up.
# Chrome and the core's own page server are started here (an empty hub state, sessions are injected as a stream mock).
import json, os, socket, subprocess, sys, tempfile, time
core = os.path.abspath(sys.argv[1])
sys.path.insert(0, core)
from modules.proof import cdp

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda name, state, ago: {"name": name, "state": state, "kind": "work", "role": "worker", "cwd": f"/home/u/dev/{name}", "since": time.time() - ago,
    "info": {"model": "claude-opus-5-5"}, "background": [], "icon": None, "own_icon": None, "about": None, "raised_by": None,
    "gist": {"text": f"Done: step one of {name}, next the second"}, "pending": [], "tools": [], "requests": [], "answered": []}
M = [{**S("hub-core", "idle", 30), "kind": "hub"}] + [S(f"session-{i:02d}", ["idle", "busy", "idle", "asleep"][i % 4], (i + 1) * 977) for i in range(60)]
PRE = """(()=>{ window.__M = %s; const E = window.EventSource; window.__H = {};
 window.EventSource = class extends E { addEventListener(t, f, o) {
   if (t === 'snapshot' || t === 'patch') { window.__H[t] = f; return super.addEventListener(t, (e) => { const d = JSON.parse(e.data); if (t === 'snapshot' || d.sessions) d.sessions = window.__M; f({ data: JSON.stringify(d) }); }, o); }
   return super.addEventListener(t, f, o); } } })()""" % json.dumps(M)
FLIP = """(()=>{ const n = %d; window.__M.forEach((s, i) => { if (i %% 3 === n %% 3) { s.since = Date.now() / 1000 - (n * 37 + i * 11); s.state = ['idle', 'busy', 'idle'][(i + n) %% 3]; } });
  window.__H.patch({ data: JSON.stringify({ sessions: window.__M.map((s) => ({ ...s })) }) }); return 1 })()"""
INFO = "(() => { const l = document.getElementById('list'); return [Math.round(l.scrollTop), l.scrollHeight - l.clientHeight]; })()"

with tempfile.TemporaryDirectory() as tmp:
    ext = {"clean": {"path": HERE, "themes": ["clean.json", "clean-dark.json"], "web": "main.js"}}
    if len(sys.argv) > 2: ext = {"sidebar-groups": {"path": os.path.abspath(sys.argv[2]), "web": "main.js"}, **ext}
    os.mkdir(tmp + "/state")
    cfg = tmp + "/hub.json"
    json.dump({"extensions": ext}, open(cfg, "w"))
    with socket.socket() as s0:
        s0.bind(("127.0.0.1", 0)); port = s0.getsockname()[1]
    env = {**os.environ, "HUB_STATE_DIR": tmp + "/state", "HUB_CONFIG": cfg, "HUB_WEB_PORT": str(port)}
    srv = subprocess.Popen([sys.executable, core + "/modules/web/server.py"], cwd=core, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    p = None
    try:
        for _ in range(100):
            if socket.socket().connect_ex(("127.0.0.1", port)) == 0: break
            time.sleep(0.1)
        p = cdp.Page()
        p.call("Page.enable"); p.call("Page.addScriptToEvaluateOnNewDocument", {"source": PRE})
        p.viewport(1440, 900)
        url = f"http://127.0.0.1:{port}/"
        p.goto("about:blank", wait=0.2); p.goto(url + "#/__r", wait=0.3)
        p.js("localStorage.clear(); localStorage.setItem('hub.feed','compact'); localStorage.setItem('hub.opt.clean', JSON.stringify({detail:true}))")
        p.js("fetch('/api/themes').then(r=>r.json()).then(j=>{const t=(j.themes||[]).find(x=>x.id==='clean:clean.json'); localStorage.setItem('hub.theme', JSON.stringify({id:t.id, theme:t.theme}));})"); p.pump(0.8)
        p.goto("about:blank", wait=0.2); p.goto(url + "#/s/session-00", wait=3.0); p.pump(1.5)
        if not p.js("document.documentElement.classList.contains('th-clean-detail')"): print("the theme is not on"); sys.exit(2)
        box = p.js("(()=>{const r=document.getElementById('list').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]})()")
        for _ in range(60):
            p.call("Input.dispatchMouseEvent", {"type": "mouseWheel", "x": box[0], "y": box[1], "deltaX": 0, "deltaY": 120}); p.pump(0.03)
        p.pump(0.5)
        placed = p.js(INFO)
        print("at the bottom", placed)
        if placed[1] < 500 or placed[0] < placed[1] - 2: print("the list did not reach the bottom"); sys.exit(2)
        bad = 0
        for n in range(1, 6):
            p.js(FLIP % n); p.pump(0.8)
            now = p.js(INFO)
            bad += now[0] < now[1] - 2
            print("snapshot", n, now)
        # a chat from below the window gets a new message: it rises to the top of its group, above the rows in view
        FIRST = "(() => { const l = document.getElementById('list'), r = l.getBoundingClientRect(); for (const li of l.querySelectorAll('li[data-s]')) { const b = li.firstElementChild.getBoundingClientRect(); if (b.top >= r.top) return [li.dataset.s, Math.round(b.top - r.top), Math.round(l.scrollTop)]; } })()"
        p.js("document.getElementById('list').scrollTop = 1200"); p.pump(0.8)
        before = p.js(FIRST)
        for n in range(3):
            p.js("(() => { const last = [...document.querySelectorAll('#list li[data-s]')].at(-1 - %d).dataset.s, s = window.__M.find((x) => x.name === last); s.since = Date.now() / 1000; window.__H.patch({ data: JSON.stringify({ sessions: window.__M.map((x) => ({ ...x })) }) }); })()" % n); p.pump(0.8)
            now = p.js(FIRST)
            print("a chat rose", n, before, "->", now)
            bad += now[0] != before[0] or abs(now[1] - before[1]) > 2
        sys.exit(1 if bad else 0)
    finally:
        if p: p.close()
        srv.terminate()
