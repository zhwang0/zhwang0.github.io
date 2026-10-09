(function () {
  "use strict";

  var root = document.documentElement;
  var theme = new URLSearchParams(window.location.search).get("theme") === "dark" ? "dark" : "light";
  var ready = false;
  var background;
  root.setAttribute("data-theme", theme);

  function styleMap() {
    var map = document.querySelector(".mapmyvisitors-map");
    if (!map) return;
    // Recolor only the background asset, never reload the counting script.
    var source = map.style.backgroundImage;
    if (source && source.indexOf("/generated_content/backs/bg-") !== -1) {
      var ocean = theme === "dark" ? "0d1520" : "ffffff";
      var land = theme === "dark" ? "45576b" : "cbd5e1";
      var next = source.replace('url("//', 'url("https://').replace(/co_[0-9a-f]{6}/i, "co_" + ocean).replace(/cl_[0-9a-f]{6}/i, "cl_" + land);
      if (next !== background) {
        background = next;
        root.style.setProperty("--map-background", next);
      }
    }
    // Keep zoom/pan interactions, without allowing the provider to navigate the host page.
    var link = document.getElementById("mapmyvisitors-widget");
    if (link && link.hasAttribute("href")) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.setAttribute("role", "img");
      link.setAttribute("aria-label", "Approximate geographic distribution of website visitors");
    }
    var loading = map.querySelector(".mapmyvisitors-loading");
    if (!ready && map.querySelector("svg") && (!loading || window.getComputedStyle(loading).display === "none")) {
      ready = true;
      window.parent.postMessage({ type: "visitor-map-ready" }, "*");
    }
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data || event.data.type !== "visitor-map-theme") return;
    theme = event.data.theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    styleMap();
  });

  var observer = new MutationObserver(styleMap);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "href"] });

  var script = document.createElement("script");
  script.id = "mapmyvisitors";
  script.async = true;
  script.src = "https://mapmyvisitors.com/map.js?cl=cbd5e1&w=a&t=n&d=CYhyNTHPj1Ie9sYb5rYTzp_1Vd1KyhyzGxR6QHbmsjE&co=ffffff&cmo=1769aa&cmn=ff7043&ct=667085";
  script.onerror = function () {
    window.parent.postMessage({ type: "visitor-map-error" }, "*");
  };
  document.body.appendChild(script);
})();
