(function () {
  "use strict";

  var frame = document.getElementById("visitor-map-frame");
  if (!frame) return;
  var shell = document.getElementById("visitor-map-shell");
  var status = document.getElementById("visitor-map-status");
  var preview = document.getElementById("visitor-map-preview");
  var started = false;
  var timer;

  function sendTheme() {
    if (!started || !frame.contentWindow) return;
    // The sandbox has an opaque origin. Restrict the receiver to this frame.
    frame.contentWindow.postMessage({
      type: "visitor-map-theme",
      theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
    }, "*");
  }

  function loadMap() {
    if (started) return;
    started = true;
    preview.hidden = true;
    status.textContent = "Loading visitor map…";
    frame.hidden = false;
    var theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    frame.src = "/assets/widgets/visitor-map.html?theme=" + theme;
    timer = window.setTimeout(function () {
      status.textContent = "The visitor map is temporarily unavailable.";
    }, 15000);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== frame.contentWindow || !event.data) return;
    if (event.data.type === "visitor-map-ready") {
      window.clearTimeout(timer);
      shell.classList.add("is-ready");
      status.hidden = true;
      sendTheme();
    } else if (event.data.type === "visitor-map-error") {
      status.textContent = "The visitor map is temporarily unavailable.";
    }
  });
  frame.addEventListener("load", sendTheme);
  window.addEventListener("themechange", sendTheme);

  // Do not register developer visits on every localhost reload.
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (local || window.location.protocol === "file:") {
    status.textContent = "Local preview: load the live map when ready. MapMyVisitors may count this visit.";
    preview.hidden = false;
    preview.addEventListener("click", loadMap);
  } else if (document.readyState === "complete") {
    loadMap();
  } else {
    window.addEventListener("load", loadMap, { once: true });
  }
})();
