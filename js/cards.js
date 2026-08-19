// Loads cards/manifest.json, fetches + parses each markdown card, and
// builds the connection graph (forward links from frontmatter, plus
// automatically-computed backlinks so you never have to link both ways).

const Cards = (() => {
  const CATEGORY_VAR = {
    topic: "--cat-topic",
    family: "--cat-family",
    place: "--cat-place",
    event: "--cat-event",
    person: "--cat-person",
  };

  function categoryColor(category) {
    const varName = CATEGORY_VAR[category] || "--cat-default";
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  // Cards are translated by adding cards/{id}.{lang}.md next to the base
  // cards/{id}.md — a translation is optional per card; if it's missing,
  // the base file is used instead, so nothing has to be translated all at
  // once.
  async function fetchCard(id, lang) {
    if (lang) {
      const translated = await fetch(`cards/${id}.${lang}.md`);
      if (translated.ok) return translated;
    }
    return fetch(`cards/${id}.md`);
  }

  async function loadAll(lang) {
    const manifestRes = await fetch("cards/manifest.json");
    if (!manifestRes.ok) throw new Error("Could not load cards/manifest.json");
    const ids = await manifestRes.json();

    const results = await Promise.all(
      ids.map(async (id) => {
        const res = await fetchCard(id, lang);
        if (!res.ok) {
          console.warn(`Mycelium: manifest lists "${id}" but cards/${id}.md is missing.`);
          return null;
        }
        const raw = await res.text();
        const { data, content } = parseFrontmatter(raw);
        return {
          id: data.id || id,
          title: data.title || id,
          category: (data.category || "topic").toLowerCase(),
          image: data.image || "",
          emoji: data.emoji || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          links: Array.isArray(data.links) ? data.links : [],
          people: Array.isArray(data.people) ? data.people : [],
          date: data.date || "",
          body: content,
          html: (window.marked ? marked.parse(content) : content),
        };
      })
    );

    const cards = results.filter(Boolean);
    const byId = new Map(cards.map((c) => [c.id, c]));

    // Backlinks: if A links to B, B is "referenced by" A, even if B doesn't
    // list A back. This is what makes interconnection cheap to author.
    for (const card of cards) card.backlinks = [];
    for (const card of cards) {
      for (const targetId of [...card.links, ...card.people]) {
        const target = byId.get(targetId);
        if (target && !target.backlinks.includes(card.id) && card.id !== targetId) {
          target.backlinks.push(card.id);
        }
      }
    }

    // Unique, deduped set of "connected" ids per card (forward + people + backlinks).
    for (const card of cards) {
      const all = new Set([...card.links, ...card.people, ...card.backlinks]);
      all.delete(card.id);
      card.connections = [...all].filter((id) => byId.has(id));
    }

    return { cards, byId };
  }

  return { loadAll, categoryColor };
})();
