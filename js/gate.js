// A lightweight PIN screen. IMPORTANT: this is a static site with no
// server, so this is a deterrent, not real access control — it hides the
// UI behind a PIN and keeps casual visitors/search engines out, but the
// raw card files are still plain public URLs to anyone who has a direct
// link or opens dev tools. See README.md for the honest version of this.

const Gate = (() => {
  let resolveReady;
  const readyPromise = new Promise((resolve) => { resolveReady = resolve; });

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function unlock(hash) {
    localStorage.setItem("mycelium-unlock-hash", hash);
    document.body.classList.remove("locked");
    resolveReady();
  }

  function renderStrings(lang) {
    document.getElementById("gate-prompt").textContent = t("gate_prompt", lang);
    document.getElementById("gate-pin").placeholder = t("gate_placeholder", lang);
    document.getElementById("gate-submit").textContent = t("gate_button", lang);
  }

  function init(lang) {
    renderStrings(lang);

    const storedHash = localStorage.getItem("mycelium-unlock-hash");
    if (storedHash && storedHash === SITE_PIN_HASH) {
      document.body.classList.remove("locked");
      resolveReady();
      return readyPromise;
    }

    const form = document.getElementById("gate-form");
    const input = document.getElementById("gate-pin");
    const errorEl = document.getElementById("gate-error");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hash = await sha256Hex(input.value);
      if (hash === SITE_PIN_HASH) {
        errorEl.hidden = true;
        unlock(hash);
      } else {
        errorEl.textContent = t("gate_error", lang);
        errorEl.hidden = false;
        input.value = "";
        input.focus();
      }
    });

    input.focus();
    return readyPromise;
  }

  // Console helper for setting/changing the PIN — see README.md.
  window.hashPin = sha256Hex;

  return { init, renderStrings, ready: () => readyPromise };
})();
