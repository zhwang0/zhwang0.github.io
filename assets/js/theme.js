(function () {
  "use strict";

  var root = document.documentElement;
  var storageKey = "zhihao-color-theme";
  var systemPreference = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var savedPreference = readPreference();

  function readPreference() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function savePreference(value) {
    try {
      window.localStorage.setItem(storageKey, value);
    } catch (error) {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }

  function systemTheme() {
    return systemPreference && systemPreference.matches ? "dark" : "light";
  }

  function updateToggle(button, theme) {
    var dark = theme === "dark";
    var action = dark ? "Switch to light mode" : "Switch to dark mode";
    var icon = button.querySelector("i");

    button.setAttribute("aria-label", action);
    button.setAttribute("aria-pressed", String(dark));
    button.title = action;

    if (icon) {
      icon.className = dark ? "fas fa-sun" : "fas fa-moon";
    }
  }

  function applyTheme(theme, announce) {
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]")).forEach(function (button) {
      updateToggle(button, theme);
    });

    if (announce) {
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
    }
  }

  applyTheme(savedPreference || systemTheme(), false);

  function initializeToggles() {
    Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]")).forEach(function (button) {
      updateToggle(button, root.getAttribute("data-theme"));
      button.addEventListener("click", function () {
        var nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        savedPreference = nextTheme;
        savePreference(nextTheme);
        applyTheme(nextTheme, true);
      });
    });

    window.requestAnimationFrame(function () {
      root.classList.add("theme-ready");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToggles, { once: true });
  } else {
    initializeToggles();
  }

  if (systemPreference) {
    var handleSystemChange = function () {
      if (!savedPreference) {
        applyTheme(systemTheme(), true);
      }
    };

    if (systemPreference.addEventListener) {
      systemPreference.addEventListener("change", handleSystemChange);
    } else if (systemPreference.addListener) {
      systemPreference.addListener(handleSystemChange);
    }
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== storageKey) {
      return;
    }
    savedPreference = event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
    applyTheme(savedPreference || systemTheme(), true);
  });
})();
