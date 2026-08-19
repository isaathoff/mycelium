# Mycelium

A card-based feed for ideas, places, events, and people — like Pokémon
cards for your family's shared brain. Tap a card to flip it and read more,
see how it connects to other cards, or jump straight to a linked one. The
**Brain** view lays every card out as a connected graph.

No build step, no database, no framework. Every card is a plain markdown
file with a little frontmatter. Add a file, list it in the manifest,
refresh the page.

## Running it locally

Browsers block `fetch()` of local files opened via `file://`, so serve the
folder over plain HTTP:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Adding a card

1. Copy `cards/_template.md` to `cards/your-card-id.md`.
2. Fill in the frontmatter and write the body in markdown.
3. Add `"your-card-id"` to the array in `cards/manifest.json`.
4. If you have a photo, drop it in `assets/images/` and point `image:` at
   it (e.g. `assets/images/cabin-2025.jpg`). Otherwise leave `image:`
   blank and pick an `emoji:` — that's the placeholder front.
5. Refresh the page.

### Frontmatter reference

```yaml
---
id: your-card-id          # must match the filename and manifest entry
title: Display Title
category: topic            # topic | family | event | place | person | (anything you want)
image: assets/images/x.jpg # optional — leave blank to use emoji instead
emoji: 🍄                  # shown on the front if there's no image
tags: [some, tags]
links: [other-card-id, another-card-id]   # cards this one explicitly connects to
people: [person-card-id]   # shorthand for linking to person cards (e.g. from an event/photo)
date: 2025-07-12           # optional, free text
---
```

Everything after the second `---` is the markdown body shown on the back
of the card.

### Translating a card

The interface (nav, search, filters, the PIN screen) supports German,
English, and Spanish (Latin America) out of the box, switchable from the
🌐 buttons in the header. Card *content* is translated per file:

- `cards/your-card-id.md` — the base/fallback version.
- `cards/your-card-id.de.md`, `cards/your-card-id.en.md`,
  `cards/your-card-id.es.md` — optional translations.

If a translation is missing, the base file is shown instead — so you
never have to translate everything at once, and existing untranslated
cards keep working exactly as before. Only `title`, `tags`, and the body
need translating; keep `id`, `category`, `links`, and `people` identical
across every language file for a card, since those are what keep
connections and the Brain view consistent regardless of language.

**Connections are automatic in both directions.** If card A lists card B
in `links` or `people`, B will show A as a connection too — you never
have to link back manually. The Brain view draws an edge between any two
cards that reference each other this way.

You can also link to a card from inside the markdown body itself using
`#card-your-card-id` as a link target — clicking it (or visiting that URL
directly) opens straight to that card. The `decomposition` sample card
does this.

### Categories

Categories are just a string — use whatever taxonomy fits your family
(`topic`, `family`, `event`, `place`, `person`, or make up your own). Five
have built-in accent colors (`topic`, `family`, `place`, `event`,
`person`); anything else falls back to a neutral gray. Add more colors in
`css/styles.css` under `:root` (`--cat-yourcategory`) and in
`CATEGORY_VAR` in `js/cards.js` if you want a new category to get its own
color.

## Deploying / sharing

It's static files, so any static host works. The easiest is GitHub Pages:

1. Push this repo to GitHub.
2. Repo Settings → Pages → deploy from the `main` branch (root).
3. Share the resulting URL with your family.

Editing after that is just: edit/add a markdown file, commit, push — the
site updates itself.

The repo includes a `.nojekyll` file — don't delete it. GitHub Pages
normally runs everything through Jekyll, which processes `.md` files as
pages (mangling the frontmatter and moving them to a different URL)
instead of serving them raw; `.nojekyll` turns that off so cards load
correctly.

## The PIN screen

The site is gated behind a PIN, set in `js/config.js` as a SHA-256 hash
rather than plain text. **Be clear-eyed about what this is:** it's a
static site with no server, so this only hides the rendered page from
casual visitors and search engines (there's also a `robots.txt` and a
`noindex` tag doing the same job). It does **not** prevent someone with
a direct link, or anyone who opens their browser's dev tools, from
reading the raw card files — they're still plain public files on GitHub
Pages. Treat it as a "keep this off Google and out of casual view" gate,
not a real login wall. If you ever need genuine access control (a real
"nothing loads without signing in"), that means moving hosting to
something like Cloudflare Pages with Cloudflare Access in front of it —
a bigger change, worth a separate conversation if you want it.

**Changing the PIN:**

1. Open the deployed site (or `index.html` locally), open the browser
   console, and run:
   ```js
   await hashPin("your-new-pin")
   ```
2. Copy the resulting hash into `js/config.js` as `SITE_PIN_HASH`.
3. Commit and push. Everyone's saved unlock is tied to the old hash, so
   they'll be asked for the new PIN once after you change it.

## How it's built

- `index.html` / `css/styles.css` — shell, card flip animation, layout,
  the PIN overlay.
- `js/config.js` — the PIN hash. Yours to edit.
- `js/i18n.js` — UI text in German/English/Spanish, plus the `t()` helper.
- `js/gate.js` — the PIN screen (hashes the input client-side with
  `crypto.subtle`, compares it, remembers the unlock in `localStorage`).
- `js/frontmatter.js` — tiny hand-rolled frontmatter parser (no YAML
  dependency, since cards only ever use strings and simple lists).
- `js/cards.js` — loads the manifest + markdown files (in the current
  language, falling back to the base file), computes connections/backlinks.
- `js/graph.js` — the Brain view: a small dependency-free force-directed
  graph on `<canvas>` (drag nodes, scroll to zoom, click to open a card).
- `js/app.js` — glues it together: rendering, search/filter, view
  switching, the language switcher, `#card-id` deep links.
- `js/vendor/marked.js` — the [marked](https://marked.js.org) markdown
  parser, vendored locally (not loaded from a CDN) so the whole app works
  offline and doesn't depend on any external service being reachable.
