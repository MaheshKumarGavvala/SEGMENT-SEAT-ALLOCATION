(() => {
  const root = document.documentElement;
  const STORAGE_KEY = "smartSegmentTheme";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");

  // Prevent a flash of the wrong theme before the UI is painted.
  root.dataset.theme = initial;

  const sync = (mode) => {
    root.dataset.theme = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const dark = mode === "dark";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("title", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  };

  const ready = () => {
    sync(root.dataset.theme);
    document.documentElement.classList.add("theme-ready");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, {once:true});
  } else ready();

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button || button.disabled) return;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.classList.add("theme-is-changing");
    sync(next);
    clearTimeout(window.__smartThemeTimer);
    window.__smartThemeTimer = setTimeout(() => {
      root.classList.remove("theme-is-changing");
    }, 420);
  });
})();