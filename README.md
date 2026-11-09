# Clean — a theme for Agents Hub

A quiet light and dark theme for the Agents Hub page: grey shell, white window, Geist type, thin Icons8 Forma icons,
character avatars for agents in the feed, session status on the right of each row, a composer with its buttons below
the text.

![Clean, light](docs/light.png)

![Clean Dark](docs/dark.png)

## Install

Settings → Plugins → paste `https://github.com/kalimullin/hub-plugin-clean` (or search for “clean”) → Check and
install. Then Settings → Look → Theme → Clean or Clean Dark.

Needs a hub with plugin API 1.30 or newer.

## Avatars

Sessions with one of these emoji get a character instead (`avatars` in `clean.json`):

🤖 🧭 🧑‍💻 🔬 🎨 🧪 🧩 🖌️ ✍️ ⚙️ 🛠 💬 📊 🔎 🚀 ⚡ 🧊 🌙 🌊 🎉 🐛 🎧 🔮 🐜

To give an agent another character, change its icon: the session row menu → Icon, or
`hub session icon <name> <emoji>`. Your own pictures: put a file in `a/` and add an “emoji → file” pair to `avatars`
in both theme files.

### Chat avatars in the session list

Settings → Look → Clean theme → “Chat avatars” (on by default). Specialists and executors get a character, the Hub is
the same size as a specialist with the same ring (its own icon, or the theme's picture `avatar-hub.png`), directions get
a Forma tile. Click a picture to change the icon (the core's picker). In the detailed list the Hub has the preview of its
last message like every other chat.

A direction's tile shows a compass until you give it an icon. Icons are picked by a session that has the Icons8 MCP and
are kept on your machine, not in this repository (`chat-icons/` is git-ignored: the map holds your chat names):

    python3 tools/chat-icons.py need                         # directions without an icon (default http://127.0.0.1:8787)
    python3 tools/chat-icons.py add <chat> <file.svg|->      # SVG from get_icon_svg, platform "forma-regular"
    python3 tools/chat-icons.py word <word> <file.svg|->     # any chat with this whole word in its name or description

Reload the page after a change. No map, or a chat that is not in it — the compass. The Hub can have an entry too
(`add hub …`): it shows when the Hub has no icon of its own.

## Detailed session list

Settings → Look → Clean theme → “Detailed session list” (off by default, so the list stays compact). Each row then
shows the start of the session's last message under the name (one line, plain text, like a messenger preview) and the
time of the last activity on the right (now, 2m, 3h, 5d). The open session is a card. A session with no message yet has
no second line. The text comes from the session snapshot the core already sends (`out_head`, or `gist` when the session has not written to you); the working directory
stays in the row's tooltip. The choice is stored in the browser.

## Chat avatars

Settings → Look → Clean theme → “Chat avatars” (on by default). Every chat in the session list gets a picture in front of its
name, in two sizes by level, not by type: first level (specialists, directions, anything in a group) and second level
(executors under their parent). Compact list: 16 and 12; detailed list: 32 and 24, centred on the two lines. Specialists and
executors show a character from the theme's kit: the session's own icon, else the icon of whoever started it, else one
picked by the name. A direction is not an agent, so it gets a compass icon on a grey tile of the same size and shape. Click a
picture to change the icon (not for directions). Off — names only.

## Sort by last message

Settings → Look → Clean theme → “Sort by last message” (on by default). Inside each group of the session list (specialists,
directions, executors, sleeping ones) the chat with the newest message is on top, like in a messenger; a chat that gets a
message rises to the top of its group. The Hub stays first, groups keep their order, and executors stay under their chat and
move with it. The time is the later of `since` (the turn the owner started, the end of a turn, the moment it fell asleep) and
`out_head_ts` (the last result for the owner) from the session snapshot. The sorting is the core's own order hook
(`hub.addOrder`); the rows you see do not jump when a chat rises above the window. Rows are not dragged while the sorting is on
(a row would spring back); use the row menu → Move to… for another group. The “Now” tab keeps its own order by state. Off — the
hub's order.

## Paused by limit

A session that hit its provider's limit window waits for the reset, and the core resumes it by itself. Clean shows that like
the native apps: two bars instead of the row's status, “Resumes at 03:00” (tomorrow, a weekday or a date when later) in the
second line of the detailed list and on the status pill of the open chat, and the model with the reason in the tooltip. The
data is the core's `session.quota_hold` feature and the `sessions_extra` record of the quota-hold module; without them nothing
changes. There is no “Resume” item yet: the core has no endpoint that resumes the cut turn now.

## Keys while recording a voice message

Only while Clean is the active theme and a recording is running:

- **Enter** stops the recording and sends it (like the stop button). Works in the message field and outside text fields; Enter in any other field is left alone.
- **Esc twice within 0.4 s** cancels the recording (like “Cancel”).
- A single **Esc** does nothing: the recording keeps going.

Tests: `node --test tests/*.test.mjs`.

## What's inside

- `clean.json`, `clean-dark.json` — colors, font, icons (`i/`, `id/` for dark), avatars (`a/`).
- `clean.css` + `main.js` — layout; active only while Clean or Clean Dark is selected.

## Contributing

Read [DESIGN.md](DESIGN.md) first: it lists the rules the theme keeps (light, modern, consistent) and what a pull
request has to include — screenshots of every changed screen, light and dark. One pull request, one question.

## Credits

- Icons by [Icons8](https://icons8.com) (Forma Regular).
- [Geist](https://vercel.com/font) and [Lora](https://github.com/cyrealtype/Lora-Cyrillic) fonts — SIL Open Font
  License 1.1 (`f/Geist-OFL.txt`, `f/Lora-OFL.txt`).
- Code — MIT (`LICENSE`).
