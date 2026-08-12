(function () {
  "use strict";

  function initPublications(page) {
    if (!page || page.getAttribute("data-publications-ready") === "true") {
      return false;
    }

    var status = page.querySelector("#publication-results-status");
    var yearHeadings = Array.prototype.slice.call(page.querySelectorAll(".bibliography-year"));
    if (!status || yearHeadings.length === 0) {
      return false;
    }

    var publicationList = page.querySelector(".publication-list");
    if (!publicationList) {
      publicationList = document.createElement("div");
      publicationList.className = "publication-list";
      status.insertAdjacentElement("afterend", publicationList);
    }

    var sections = [];

    yearHeadings.forEach(function (heading) {
      try {
        var section = heading.closest(".row");
        var year = heading.textContent.trim();
        var sectionCards = Array.prototype.slice.call(section.querySelectorAll(".bibliography > li"));

        section.classList.add("publication-year-section");
        section.id = "year-" + year;
        publicationList.appendChild(section);
        sectionCards.forEach(function (card) {
          var venueBadge = card.querySelector(".abbr .badge");
          var type = venueBadge && venueBadge.classList.contains("green") ? "journal" : "conference";

          card.classList.add("publication-card", "type-" + type);
          card.setAttribute("data-type", type);

          Array.prototype.slice.call(card.querySelectorAll('a[data-toggle="collapse"]')).forEach(function (toggle) {
            var actionGroup = toggle.parentElement;
            toggle.remove();
            if (actionGroup && actionGroup.children.length === 0 && !actionGroup.textContent.trim()) {
              actionGroup.remove();
            }
          });

          Array.prototype.slice.call(card.querySelectorAll(".collapse")).forEach(function (collapse) {
            var abstractGroup = collapse.parentElement;
            collapse.remove();
            if (abstractGroup && abstractGroup.children.length === 0 && !abstractGroup.textContent.trim()) {
              abstractGroup.remove();
            }
          });
        });

        sections.push({ element: section, cards: sectionCards });
      } catch (error) {
        document.documentElement.setAttribute("data-publications-error", heading.textContent.trim() + ": " + error.message);
      }
    });

    Array.prototype.slice.call(page.querySelectorAll('a[target="_blank"]')).forEach(function (link) {
      link.rel = "noopener noreferrer";
    });

    var filterButtons = Array.prototype.slice.call(page.querySelectorAll(".publication-filter"));
    var activeFilter = "all";

    function updatePublications() {
      var visibleTotal = 0;

      sections.forEach(function (section) {
        var visibleInSection = 0;

        section.cards.forEach(function (card) {
          var visible = activeFilter === "all" || card.getAttribute("data-type") === activeFilter;
          card.hidden = !visible;
          if (visible) {
            visibleInSection += 1;
            visibleTotal += 1;
          }
        });

        section.element.hidden = visibleInSection === 0;
      });

      status.textContent = visibleTotal + (visibleTotal === 1 ? " publication shown" : " publications shown");
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.getAttribute("data-filter");
        filterButtons.forEach(function (candidate) {
          var active = candidate === button;
          candidate.classList.toggle("is-active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
        updatePublications();
      });
    });

    page.setAttribute("data-publications-ready", "true");
    updatePublications();
    return true;
  }

  window.initPublications = initPublications;
  Array.prototype.slice.call(document.querySelectorAll(".publications-page")).forEach(initPublications);
})();
