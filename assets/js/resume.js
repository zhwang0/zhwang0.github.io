(function () {
  "use strict";
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-document]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".document-panel"));
  if (tabs.length !== 2 || panels.length !== 2) return;

  function selectedDocument() {
    if (window.location.hash === "#academic-cv") return "academic-cv";
    if (!window.location.hash || window.location.hash === "#industry-resume") return "industry-resume";
    return null;
  }
  function selectDocument(id, updateHistory) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-document") === id;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.id !== id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", panel.id === "academic-cv" ? "cv-tab" : "resume-tab");
    });
    if (updateHistory && window.location.hash !== "#" + id) {
      window.history.pushState(null, "", "#" + id);
    }
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      selectDocument(tab.getAttribute("data-document"), true);
    });
    tab.addEventListener("keydown", function (event) {
      var next;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      selectDocument(tabs[next].getAttribute("data-document"), true);
    });
  });
  selectDocument(selectedDocument() || "industry-resume", false);
  document.documentElement.classList.add("documents-ready");
  function syncSelection() {
    var id = selectedDocument();
    if (id) selectDocument(id, false);
  }
  window.addEventListener("hashchange", syncSelection);
  window.addEventListener("popstate", syncSelection);
})();
