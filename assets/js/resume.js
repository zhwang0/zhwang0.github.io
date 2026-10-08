(function () {
  "use strict";
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-document]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".document-panel"));
  if (tabs.length !== 2 || panels.length !== 2) return;

  function initPreview(panel) {
    var stage = panel.querySelector(".document-stage[data-page-count]");
    if (!stage) return;
    var image = stage.querySelector(".paper-preview img");
    var previewLink = stage.querySelector(".paper-preview");
    var openLink = panel.querySelector(".document-open");
    var status = stage.querySelector(".preview-page-status");
    var error = stage.querySelector(".preview-error");
    var buttons = Array.prototype.slice.call(stage.querySelectorAll("[data-page-step]"));
    var pageCount = Number(stage.getAttribute("data-page-count"));
    var prefix = stage.getAttribute("data-preview-prefix");
    var label = stage.getAttribute("data-document-label");
    var pdf = previewLink.getAttribute("href").split("#")[0];
    var currentPage = 1;
    var loading = false;

    function updateControls() {
      buttons.forEach(function (button) {
        var target = currentPage + Number(button.getAttribute("data-page-step"));
        button.disabled = target < 1 || target > pageCount;
        button.setAttribute("aria-disabled", String(loading || button.disabled));
      });
    }
    function showPage(target) {
      if (loading || target < 1 || target > pageCount) return;
      loading = true;
      error.hidden = true;
      previewLink.setAttribute("aria-busy", "true");
      status.textContent = "Loading page " + target + " of " + pageCount + "…";
      updateControls();
      var nextImage = new Image();
      nextImage.onload = function () {
        currentPage = target;
        image.src = nextImage.src;
        image.alt = "Page " + currentPage + " of Zhihao Wang’s " + label;
        previewLink.href = pdf + "#page=" + currentPage;
        previewLink.setAttribute("aria-label", "Open page " + currentPage + " of " + label);
        openLink.href = previewLink.href;
        finish();
      };
      nextImage.onerror = function () {
        error.hidden = false;
        finish();
      };
      function finish() {
        loading = false;
        previewLink.setAttribute("aria-busy", "false");
        status.textContent = "Page " + currentPage + " of " + pageCount;
        updateControls();
      }
      nextImage.src = prefix + (target === 1 ? "" : "-" + target) + ".webp";
    }
    buttons.forEach(function (button) {
      button.hidden = false;
      button.addEventListener("click", function () {
        showPage(currentPage + Number(button.getAttribute("data-page-step")));
      });
    });
    updateControls();
  }
  panels.forEach(initPreview);

  function selectedDocument() {
    if (window.location.hash === "#academic-cv") return "academic-cv";
    if (!window.location.hash || window.location.hash === "#industry-resume") return "industry-resume";
    var saved = window.history.state && window.history.state.resumeDocument;
    if (saved === "industry-resume" || saved === "academic-cv") return saved;
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
    var state = Object.assign({}, window.history.state, { resumeDocument: id });
    if (updateHistory && window.location.hash !== "#" + id) {
      window.history.pushState(state, "", "#" + id);
    } else {
      window.history.replaceState(state, "");
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
    var activeTab = tabs.filter(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    })[0];
    selectDocument(id || activeTab.getAttribute("data-document"), false);
  }
  window.addEventListener("hashchange", syncSelection);
  window.addEventListener("popstate", syncSelection);
})();
