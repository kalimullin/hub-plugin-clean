# Clean — design principles

Clean is a quiet theme. It has three core traits, and a change that weakens one of them is a regression even if it
looks nice on its own:

1. **Light** — few lines, no shadows at rest, nothing shouting. Depth is a soft fill, not a frame.
2. **Modern** — one sans family, thin line icons, small radii, flat surfaces, hover and focus that stay grey.
3. **Consistent** — the same control looks and measures the same everywhere; new parts are built from existing ones.

Every rule below is taken from `clean.css` / `main.js` as they are. A PR may add or change a rule here, but only
together with the code that follows it, and with a reason.

## 1. Light

- **No chrome at rest.** Buttons have no border and no shadow in their resting state (`box-shadow: none`). The
  hover state is a fill (`--c-hover`, `--c-fill`) or darker text, never an underline or a frame.
- **Shadows only where something floats.** Menus and popups use `--shadow-lift` plus a 1px `--border` ring; the
  composer uses `--c-field`. Nothing else gets a shadow. Do not add a new shadow value, a glow or a blurred halo.
- **No gradients as decoration.** The only gradients are masks that fade a scroll edge, the fade behind the composer and flat `--c-fill` layers;
  a gradient wash on a card, a button or a header is not accepted.
- **Fills are translucent black or white.** Surfaces are `--c-fill`, `--c-hover`, `--c-badge`; borders are
  `--c-line`, `--c-line-soft`, `--c-line-strong`. A new grey is a new alpha of those, not a new hex.
- **One header row.** The session header stays on one line on desktop (`flex-wrap: nowrap`): the title, chips and
  notes shrink with an ellipsis (full text in the tooltip) instead of wrapping or pushing a control off. On a phone
  the header may take two lines; a new chip must fit in 108px there, or go into the “More” menu.
- **Nothing new in the list rows.** The row is a 40px line: name on the left, status on the right in a 16px box.
  A new indicator replaces an existing one or lives in the row menu.

## 2. Modern

- **Type scale: two sizes.** `14/20` for text and controls, `12/16` for secondary text, badges and captions;
  weights 400 and 500 (600 only for the avatar letter). Set the whole `font` shorthand, not the size alone.
  One deliberate exception: the session title is Lora Bold `18/24` (shipped in `f/`).
- **Families.** Geist (shipped in `f/`, `font_scope: all`) for everything; Geist Mono, taken from the hub core
  (`--font-code`), for code and paths only. No third family, no `text-transform: uppercase`, no letter-spaced
  eyebrow labels. Numbers keep `font-variant-numeric: normal`.
- **Icons are Icons8 Forma Regular, drawn as a mask.** `background: currentColor` plus `mask: url("x.svg")` at
  12, 16 or 20px; the color comes from the text, never from the asset. Hover, active and disabled change the
  color in CSS, not the file. Dark theme icons are the white set in `id/`. One family: no emoji or text glyphs
  doing an icon's job, no second icon set. If Forma has no glyph, draw it in the same stroke (2px on a 24 grid)
  and say so in the PR.
- **Radii: 4, 6, 8, 12, 16, 20.** 4 — badges; 6 — avatars; 8 — buttons, fields, rows, menu items; 12 — menus and
  cards in the feed; 16 — windows; 20 — composer and bubbles; `9999px` — pills and dots. Nested radius is the
  outer radius minus the padding. A new value in this list is not accepted.
- **Hover is for a mouse only.** Every `:hover` rule sits inside `@media (hover: hover) and (pointer: fine)`.
  A bare `:hover` sticks on touch screens.
- **Quiet focus, no blue.** Keyboard focus is `outline: 2px solid var(--c-ring)` with `outline-offset: 2px`
  (`-2px` where the parent clips). A focused text field gets a 1px `--c-line-strong` frame, not a ring or a halo.
  No `--primary` or `--ring` blue in hover or focus. Never `outline: none` without a replacement.
- **Motion is short and sparse.** Color and background fades are 150ms ease at most, the chevron turn is 120–160ms;
  every animation has a `prefers-reduced-motion: reduce` branch. Menu buttons have no transition and no press scale.
- **Phone.** Fields are 16px (no zoom on iOS), no tap highlight, `touch-action: manipulation` on buttons,
  `100dvh` instead of `100vh`, safe-area padding under the composer.

## 3. Consistent

- **Colors come from tokens.** In rules use `var(--c-*)` or the core variables (`--background`, `--foreground`,
  `--muted-foreground`, `--border`, `--accent`). A hex or `rgb()` in a rule is a finding. Allowed: the token block
  at the top of `clean.css`, the theme files (`clean.json`, `clean-dark.json`), and `#fff` on the red `--c-alert`
  fill. Each token is a `light-dark(...)` pair, so the dark theme is never an afterthought.
- **Text color roles.** `--c-t1` for text, `--c-t2` for secondary text, `--c-t3` only for time, group labels and
  other non-essential marks (it is not readable enough for anything the user must read). Times and captions in the
  feed (`.row .meta`) are read, so they use `--c-meta` (≥4.5:1 in both themes), not `--c-t3`.
- **Executors toggle.** The row shows only the chevron (16×16, `--c-t1` at .7); the executor count is hidden by the
  theme and stays in the button title and its screen-reader name.
- **Same control, same size.**
  - Icon buttons: 36px in the sidebar (search row, fold, menu), 24px in the header (the search lupa is the model:
    `24×24`, radius 8, 16px icon), 24px close/clear buttons, 16px glyph inside.
  - Header menus and selects open from a `.menu-btn`: 24px high, radius 8, a 12px chevron that turns when open.
  - Menus: padding 4, radius 12, items 32px high, radius 8, `14/20` text, no title row.
  - Text buttons: 32px, radius 8, `--c-fill` background, `12/16` weight 500.
  - Badges: 16px high, radius 4. Pills and chips follow the status colors only.
  - Count badges on session rows (red): 18px high, 12px semibold tabular figures, white on `--c-alert-fill` (≥4.5:1);
    one digit is a circle, two or more a capsule (6px each side), 100 and over reads `99+`.
  - Send arrow: Icons8 SF Black «up» (`Mq3eLYjKvHcI`), 20px glyph in a 36px button, a mask over `currentColor`.
  - Long session lists show about ten rows and add ten more as the list is scrolled (`data-clean-lazy`); while a search
    is active, for the current session and for lists of 13 or fewer, nothing is hidden.
  - A caption under a sent picture keeps the width of the feed bubble (the core's, almost the whole feed), not the picture's; `14/20` in `--c-t1`.
  - The red badge stays full red on a dimmed row: the list's bottom fade mask has a second layer that does not fade the
    right 56px column.
  - Filter tabs («All», «Now») and group headers show no totals; only unread/waiting numbers are shown (`.c-n`, `.gcount` hidden).
- **Nothing overlaps in the composer row.** Between neighbours in the bottom row of the card («+», status chips, plugin
  buttons, camera, mic, send) there are 8px at every width and for any number of plugin buttons. Room is shared by
  the measured width (`fit.js`), not by a button count or a container step: chip labels shorten, then ellipsize, then
  effort goes into the model menu, then the model, then the executors give way; plugin buttons that do not fit one
  row move to a row above. A new element in that row is checked by `tests/status-row.test.mjs` and the width matrix
  (0/1/3/5 plugin buttons at 1440…320, light and dark), and a PR that changes the row shows the table.
- **Status colors are fixed.** Red `--c-alert`, green `--c-free`, orange `--c-busy`, yellow `--c-eco`. A new state
  reuses one of them; it does not get its own hue. A band that states a status
  (the MCP login band above the chat) is tinted with `--c-busy-bg` or `--c-free-bg`, with no border.
- **Reuse before you build.** Before a new control, find the existing one that looks like it and copy its box:
  size, radius, padding, icon size, hover fill, focus ring. A new component that matches none of them needs a
  reason in the PR.
- **Part of the page that Clean does not own** (`Files` panel, plugin views) is left alone; do not style it from
  Clean unless the hub core hands it a theme key.
- **Language of the repo.** Code comments and docs are in English.

## Pull request checklist

Attach:

- [ ] A “now / with PR” screenshot of every changed screen at 1440px, **light and dark**; at 390px if it touches
      the layout or anything on a phone. One image per state is enough; a before/after pair side by side is best.
- [ ] The states the change touches: empty, long text (a 200-character title or caption), loading, error,
      hover (mouse), keyboard focus (Tab, not a script `.focus()`).
- [ ] A line on the hub core version the change needs (plugin API, new core feature) if it is not the current one.
- [ ] `node --test tests/*.test.mjs` passes, and a test for new logic in `main.js`.

Not accepted:

- A new color literal, shadow, gradient, radius, font size or font family outside the lists above.
- A bare `:hover`; a focus or hover color that is blue; a removed outline.
- Icons from another set, emoji used as icons, a colored icon file instead of a mask.
- A second header row on desktop, a new always-visible element in a list row, a control that does not match the
  size of its neighbours.
- Several unrelated changes in one PR: one PR, one question.
- Text outside English in code comments; personal names, tickets or dates in code and docs.

A PR that changes a principle on purpose says so in its description, shows the screenshots, and edits this file.
