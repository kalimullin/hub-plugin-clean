#!/usr/bin/env python3
"""Icons for chats in the session list of the Clean theme (a local map, not published).

A direction (and the Hub, if it has no character of its own) gets a Forma Regular icon on the grey tile instead of the
compass. The icons live in chat-icons/ next to main.js: <icon>.svg and map.json, the folder is in .gitignore, so
chat names never reach the published copy. Without a map every direction keeps the compass.

  chat-icons.py need  [--url http://127.0.0.1:8787]    directions that have no icon yet, with their description
  chat-icons.py add   <chat> <file.svg|-> [--as stem]  put an SVG (stdin with "-") and map the chat name to it
  chat-icons.py word  <word> <file.svg|->  [--as stem] the same for a word: any chat with this whole word in its name or description
  chat-icons.py list                                   the map
  chat-icons.py remove <chat|word>                     take a rule out (the SVG stays if another rule uses it)

The step for a session that has the icons8 MCP: `need`, then for each name search_icons(query=<what the chat is about>,
platform="forma-regular", animated=False), look at the previews, get_icon_svg only for the chosen ones (paid format,
100 an hour), pipe the SVG into `add`. Reload the page: the map is read once.
"""
import argparse, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(os.path.dirname(HERE), "chat-icons")
BAD = re.compile(r"<\s*(script|image|foreignObject|use|style)\b|\son\w+\s*=|javascript:|href\s*=", re.I)


def load():
    try:
        with open(os.path.join(DIR, "map.json"), encoding="utf-8") as f:
            m = json.load(f)
    except FileNotFoundError:
        m = {}
    return {"names": dict(m.get("names", {})), "words": dict(m.get("words", {}))}


def save(m):
    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, "map.json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")


def put_svg(src, stem):
    svg = (sys.stdin.read() if src == "-" else open(src, encoding="utf-8").read()).strip()
    if svg.startswith("{"):   # the MCP answer as is: {"svg": "..."}
        svg = json.loads(svg).get("svg", "").strip()
    if not svg.startswith("<svg") or not svg.endswith("</svg>"):
        sys.exit("not an SVG (get_icon_svg answers {\"svg\": \"\"} for a wrong id)")
    if len(svg) > 20000 or BAD.search(svg):
        sys.exit("the SVG is too big or has scripts, images, styles or links: take another icon")
    stem = re.sub(r"[^a-z0-9-]+", "-", stem.lower()).strip("-") or "icon"
    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, stem + ".svg"), "w", encoding="utf-8") as f:
        f.write(svg + "\n")
    return stem + ".svg"


def need(url):
    with urllib.request.urlopen(url.rstrip("/") + "/api/snapshot", timeout=20) as r:
        snap = json.load(r)
    m, rows = load(), {s["name"]: s for s in snap.get("sessions", [])}
    for name in snap.get("directions", []):
        toks = re.split(r"[^a-z0-9а-яё]+", (name + " " + (rows.get(name, {}).get("about") or "")).lower())
        if name in m["names"] or any(w in toks for w in m["words"]):
            continue
        print(name + (" — " + rows[name]["about"][:120] if rows.get(name, {}).get("about") else ""))


def main():
    global DIR
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", help="the folder of the icons (default: chat-icons/ next to main.js)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("need"); n.add_argument("--url", default="http://127.0.0.1:8787")
    for c in ("add", "word"):
        a = sub.add_parser(c); a.add_argument("key"); a.add_argument("svg"); a.add_argument("--as", dest="stem")
    sub.add_parser("list")
    r = sub.add_parser("remove"); r.add_argument("key")
    a = ap.parse_args()
    if a.dir:
        DIR = os.path.abspath(a.dir)
    m = load()
    if a.cmd == "need":
        need(a.url)
    elif a.cmd in ("add", "word"):
        part = "names" if a.cmd == "add" else "words"
        key = a.key if part == "names" else a.key.lower()
        m[part][key] = put_svg(a.svg, a.stem or key)
        save(m); print(part, key, "→", m[part][key])
    elif a.cmd == "list":
        print(json.dumps(m, ensure_ascii=False, indent=1))
    elif a.cmd == "remove":
        gone = [p for p in ("names", "words") if m[p].pop(a.key, None) or m[p].pop(a.key.lower(), None)]
        if not gone:
            sys.exit("no such rule")
        save(m); print("removed", a.key)


if __name__ == "__main__":
    main()
