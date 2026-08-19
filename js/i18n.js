// UI text in every supported language, plus the small t() helper. Card
// *content* (titles, tags, markdown bodies) lives in per-language card
// files instead — see js/cards.js and README.md.

const I18N = {
  en: {
    lang_name: "English",
    nav_feed: "Feed",
    nav_brain: "Brain",
    search_placeholder: "Search cards, tags, people…",
    filter_all: "All",
    cat_topic: "Topic",
    cat_family: "Family",
    cat_event: "Event",
    cat_place: "Place",
    cat_person: "Person",
    tap_to_flip: "tap to flip back",
    connections: "Connections",
    empty_state: "No cards match your search.",
    loading: "Loading cards…",
    error_prefix: "Couldn't load cards:",
    status_cards: (n) => `${n} card${n === 1 ? "" : "s"} · Mycelium`,
    gate_prompt: "Enter the family PIN to continue",
    gate_placeholder: "PIN",
    gate_button: "Unlock",
    gate_error: "That's not it — try again.",
    lang_switcher_label: "Language",
  },
  de: {
    lang_name: "Deutsch",
    nav_feed: "Feed",
    nav_brain: "Gehirn",
    search_placeholder: "Karten, Tags, Personen durchsuchen…",
    filter_all: "Alle",
    cat_topic: "Thema",
    cat_family: "Familie",
    cat_event: "Ereignis",
    cat_place: "Ort",
    cat_person: "Person",
    tap_to_flip: "antippen zum Umdrehen",
    connections: "Verbindungen",
    empty_state: "Keine Karten gefunden.",
    loading: "Karten werden geladen…",
    error_prefix: "Karten konnten nicht geladen werden:",
    status_cards: (n) => `${n} Karte${n === 1 ? "" : "n"} · Mycelium`,
    gate_prompt: "Familien-PIN eingeben, um fortzufahren",
    gate_placeholder: "PIN",
    gate_button: "Entsperren",
    gate_error: "Das war's nicht — nochmal versuchen.",
    lang_switcher_label: "Sprache",
  },
  es: {
    lang_name: "Español",
    nav_feed: "Inicio",
    nav_brain: "Cerebro",
    search_placeholder: "Buscar tarjetas, etiquetas, personas…",
    filter_all: "Todas",
    cat_topic: "Tema",
    cat_family: "Familia",
    cat_event: "Evento",
    cat_place: "Lugar",
    cat_person: "Persona",
    tap_to_flip: "toca para voltear",
    connections: "Conexiones",
    empty_state: "No hay tarjetas que coincidan con tu búsqueda.",
    loading: "Cargando tarjetas…",
    error_prefix: "No se pudieron cargar las tarjetas:",
    status_cards: (n) => `${n} tarjeta${n === 1 ? "" : "s"} · Mycelium`,
    gate_prompt: "Ingresa el PIN familiar para continuar",
    gate_placeholder: "PIN",
    gate_button: "Desbloquear",
    gate_error: "No es correcto — intenta de nuevo.",
    lang_switcher_label: "Idioma",
  },
};

const SUPPORTED_LANGS = ["de", "en", "es"];
const DEFAULT_LANG = "de";
const LANG_STORAGE_KEY = "mycelium-lang";

function getLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  return DEFAULT_LANG;
}

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

function t(key, lang, ...args) {
  const dict = I18N[lang] || I18N[DEFAULT_LANG];
  const entry = dict[key] ?? I18N[DEFAULT_LANG][key] ?? key;
  return typeof entry === "function" ? entry(...args) : entry;
}

function categoryLabel(category, lang) {
  const key = `cat_${category}`;
  const dict = I18N[lang] || I18N[DEFAULT_LANG];
  if (dict[key]) return dict[key];
  return category.charAt(0).toUpperCase() + category.slice(1);
}
