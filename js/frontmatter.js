// Minimal YAML-frontmatter parser. Supports the small subset Mycelium cards
// actually use: scalar strings, inline lists ([a, b, c]), and block lists
// ("- item" on following lines). Not a general YAML parser on purpose —
// keep this dependency-free so cards stay easy to hand-edit.

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseInlineList(s) {
  const inner = s.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner.split(",").map((x) => stripQuotes(x.trim())).filter(Boolean);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, fmBlock, content] = match;
  const lines = fmBlock.split("\n");
  const data = {};
  let currentKey = null;

  for (let rawLine of lines) {
    if (!rawLine.trim()) continue;

    const listItemMatch = rawLine.match(/^\s*-\s*(.*)$/);
    if (listItemMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(stripQuotes(listItemMatch[1]));
      continue;
    }

    const kvMatch = rawLine.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const [, key, valueRaw] = kvMatch;
      currentKey = key;
      const value = valueRaw.trim();
      if (value === "") {
        data[key] = []; // may be filled by following "- item" lines
      } else if (value.startsWith("[")) {
        data[key] = parseInlineList(value);
      } else {
        data[key] = stripQuotes(value);
      }
    }
  }

  return { data, content: content.replace(/^\s+/, "") };
}
