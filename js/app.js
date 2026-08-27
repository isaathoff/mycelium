// Wires up the PIN gate, data loading, the feed view (flip cards), the
// brain/graph view, search + category filters, the language switcher, and
// simple #hash deep-linking to a card.

(async function () {
  const feedEl = document.getElementById("feed");
  const emptyStateEl = document.getElementById("empty-state");
  const searchEl = document.getElementById("search");
  const filtersEl = document.getElementById("filters");
  const langSwitcherEl = document.getElementById("lang-switcher");
  const statusEl = document.getElementById("status-text");
  const graphCanvas = document.getElementById("graph-canvas");

  let cardsData = { cards: [], byId: new Map() };
  let activeCategory = "all";
  let query = "";
  let lang = getLang();

  function matches(card) {
    if (activeCategory !== "all" && card.category !== activeCategory) return false;
    if (!query) return true;
    const haystack = [card.title, card.id, ...card.tags].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  function cardEl(card) {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.id = card.id;
    el.style.setProperty("--card-accent", Cards.categoryColor(card.category));

    const frontImage = card.image
      ? `<div class="card-image" style="background-image:url('${card.image}')"></div>`
      : `<div class="card-image">${card.emoji || "🔗"}</div>`;

    const connections = card.connections
      .map((id) => cardsData.byId.get(id))
      .filter(Boolean);

    const connChips = connections
      .map((c) => `<button class="conn-chip" data-goto="${c.id}">${c.emoji ? c.emoji + " " : ""}${c.title}</button>`)
      .join("");

    const tagChips = card.tags.map((tag) => `<span class="tag-chip">#${tag}</span>`).join("");

    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">
          ${frontImage}
          <div class="card-title-bar">
            <h3>${card.title}</h3>
            <div class="card-badge-row">
              <span class="card-badge">${categoryLabel(card.category, lang)}</span>
              <span class="card-links-count">${connections.length ? "🔗 " + connections.length : ""}</span>
            </div>
          </div>
        </div>
        <div class="card-face card-back">
          <div class="card-back-inner">
            <div class="card-back-title">${card.title}</div>
            ${tagChips ? `<div class="tag-row">${tagChips}</div>` : ""}
            ${card.html}
            ${connChips ? `<h4>${t("connections", lang)}</h4><div class="link-row">${connChips}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    el.addEventListener("click", (e) => {
      const gotoBtn = e.target.closest("[data-goto]");
      if (gotoBtn) {
        e.stopPropagation();
        openCard(gotoBtn.dataset.goto);
        return;
      }
      el.classList.toggle("flipped");
    });

    return el;
  }

  function renderFeed() {
    feedEl.innerHTML = "";
    let visibleCount = 0;
    for (const card of cardsData.cards) {
      const el = cardEl(card);
      if (!matches(card)) el.style.display = "none";
      else visibleCount++;
      feedEl.appendChild(el);
    }
    emptyStateEl.hidden = visibleCount !== 0;
  }

  function applyFilters() {
    for (const el of feedEl.children) {
      const card = cardsData.byId.get(el.dataset.id);
      el.style.display = matches(card) ? "" : "none";
    }
    const visible = [...feedEl.children].some((el) => el.style.display !== "none");
    emptyStateEl.hidden = visible;
    Graph.setFilter(matches_id);
  }

  function matches_id(id) {
    const card = cardsData.byId.get(id);
    return card ? matches(card) : true;
  }

  function styleFilterChip(btn, isActive) {
    btn.classList.toggle("active", isActive);
    if (isActive && btn.dataset.cat !== "all") {
      btn.style.background = Cards.categoryColor(btn.dataset.cat);
      btn.style.borderColor = "transparent";
      btn.style.color = "#0f1216";
    } else {
      btn.style.background = "";
      btn.style.borderColor = "";
      btn.style.color = "";
    }
  }

  function renderFilters() {
    const categories = ["all", ...new Set(cardsData.cards.map((c) => c.category))];
    filtersEl.innerHTML = categories
      .map((cat) => {
        const label = cat === "all" ? t("filter_all", lang) : categoryLabel(cat, lang);
        return `<button class="filter-chip${cat === activeCategory ? " active" : ""}" data-cat="${cat}">${label}</button>`;
      })
      .join("");

    filtersEl.querySelectorAll(".filter-chip").forEach((btn) => {
      styleFilterChip(btn, btn.dataset.cat === activeCategory);
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        filtersEl.querySelectorAll(".filter-chip").forEach((b) => styleFilterChip(b, b === btn));
        applyFilters();
      });
    });
  }

  function openCard(id) {
    const card = cardsData.byId.get(id);
    if (!card) return;

    // Reveal it even if a filter/search is currently hiding it.
    if (!matches(card)) {
      query = "";
      searchEl.value = "";
      activeCategory = "all";
      filtersEl.querySelectorAll(".filter-chip").forEach((b) => styleFilterChip(b, b.dataset.cat === "all"));
      applyFilters();
    }

    switchView("feed");
    const el = feedEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.add("flipped");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
    location.hash = `card-${id}`;
  }

  function switchView(view) {
    document.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.getElementById("feed-view").classList.toggle("active", view === "feed");
    document.getElementById("graph-view").classList.toggle("active", view === "graph");
    if (view === "graph") Graph.resize();
  }

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
      if (btn.dataset.view === "graph") location.hash = "graph";
      else if (!location.hash.startsWith("#card-")) location.hash = "";
    });
  });

  searchEl.addEventListener("input", () => {
    query = searchEl.value.trim().toLowerCase();
    applyFilters();
  });

  window.addEventListener("hashchange", handleHash);

  function handleHash() {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "graph") switchView("graph");
    else if (hash.startsWith("card-")) openCard(hash.slice("card-".length));
  }

  function renderStaticText() {
    document.documentElement.lang = lang;
    document.querySelector('[data-view="feed"]').textContent = t("nav_feed", lang);
    document.querySelector('[data-view="graph"]').textContent = t("nav_brain", lang);
    searchEl.placeholder = t("search_placeholder", lang);
    emptyStateEl.textContent = t("empty_state", lang);
  }

  function renderLangSwitcher() {
    langSwitcherEl.innerHTML = SUPPORTED_LANGS
      .map((code) => `<button class="lang-btn${code === lang ? " active" : ""}" data-lang="${code}">${I18N[code].lang_name}</button>`)
      .join("");
    langSwitcherEl.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lang === lang) return;
        lang = btn.dataset.lang;
        setLang(lang);
        switchLanguage();
      });
    });
  }

  async function loadCardsAndRender() {
    try {
      cardsData = await Cards.loadAll(lang);
    } catch (err) {
      statusEl.textContent = `${t("error_prefix", lang)} ${err.message}`;
      console.error(err);
      return false;
    }
    renderFilters();
    renderFeed();
    statusEl.textContent = t("status_cards", lang, cardsData.cards.length);
    return true;
  }

  async function switchLanguage() {
    renderStaticText();
    renderLangSwitcher();
    activeCategory = "all";
    query = "";
    searchEl.value = "";
    statusEl.textContent = t("loading", lang);
    const ok = await loadCardsAndRender();
    if (ok) {
      Graph.setData(cardsData.cards);
      Graph.setFilter(matches_id);
    }
  }

  statusEl.textContent = t("loading", lang);
  await Gate.init(lang);

  renderStaticText();
  renderLangSwitcher();

  Graph.init(graphCanvas, { onNodeClick: openCard });

  const loaded = await loadCardsAndRender();
  if (!loaded) return;

  Graph.setData(cardsData.cards);
  Graph.setFilter(matches_id);
  Graph.start();

  handleHash();
})();
