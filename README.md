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

## How it's built

- `index.html` / `css/styles.css` — shell, card flip animation, layout.
- `js/frontmatter.js` — tiny hand-rolled frontmatter parser (no YAML
  dependency, since cards only ever use strings and simple lists).
- `js/cards.js` — loads the manifest + markdown files, computes
  connections/backlinks.
- `js/graph.js` — the Brain view: a small dependency-free force-directed
  graph on `<canvas>` (drag nodes, scroll to zoom, click to open a card).
- `js/app.js` — glues it together: rendering, search/filter, view
  switching, `#card-id` deep links.
- `js/vendor/marked.js` — the [marked](https://marked.js.org) markdown
  parser, vendored locally (not loaded from a CDN) so the whole app works
  offline and doesn't depend on any external service being reachable.
