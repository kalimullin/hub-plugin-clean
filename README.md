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

## Keys while recording a voice message

Only while Clean is the active theme and a recording is running:

- **Enter** stops the recording and sends it (like the stop button). Works in the message field and outside text fields; Enter in any other field is left alone.
- **Esc twice within 0.4 s** cancels the recording (like “Cancel”).
- A single **Esc** does nothing: the recording keeps going.

Tests: `node --test tests/*.test.mjs`.

## What's inside

- `clean.json`, `clean-dark.json` — colors, font, icons (`i/`, `id/` for dark), avatars (`a/`).
- `clean.css` + `main.js` — layout; active only while Clean or Clean Dark is selected.

## Credits

- Icons by [Icons8](https://icons8.com) (Forma Regular).
- [Geist](https://vercel.com/font) and [Lora](https://github.com/cyrealtype/Lora-Cyrillic) fonts — SIL Open Font
  License 1.1 (`f/Geist-OFL.txt`, `f/Lora-OFL.txt`).
- Code — MIT (`LICENSE`).
