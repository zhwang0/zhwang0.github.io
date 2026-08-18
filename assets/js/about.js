(function () {
  "use strict";

  var page = document.querySelector(".about-page");
  if (!page) {
    return;
  }

  function secureExternalLinks(root) {
    Array.prototype.slice.call(root.querySelectorAll('a[target="_blank"]')).forEach(function (link) {
      link.rel = "noopener noreferrer";
    });
  }

  function enhanceNews() {
    var news = page.querySelector(".about-news");
    var newsItems = news ? Array.prototype.slice.call(news.children).filter(function (element) {
      return element.classList.contains("row");
    }) : [];
    var visibleItems = 6;

    if (newsItems.length <= visibleItems) {
      return;
    }

    var olderItems = newsItems.slice(visibleItems);
    olderItems.forEach(function (item) {
      item.classList.add("is-older-news");
      item.hidden = true;
    });

    var toggle = document.createElement("button");
    toggle.className = "news-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<span>Show earlier news</span><i class="fas fa-chevron-down" aria-hidden="true"></i>';

    news.appendChild(toggle);

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      olderItems.forEach(function (item) {
        item.hidden = expanded;
      });
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.querySelector("span").textContent = expanded ? "Show earlier news" : "Hide earlier news";
      window.dispatchEvent(new Event("resize"));
    });
  }

  function loadPublications() {
    var publications = document.getElementById("publications");
    var loading = publications ? publications.querySelector(".publication-loading") : null;
    if (!publications || !loading || publications.getAttribute("data-load-started") === "true") {
      return;
    }
    publications.setAttribute("data-load-started", "true");

    fetch("/publications/?v=20260818-ijgis1")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load publications");
        }
        return response.text();
      })
      .then(function (html) {
        var source = new DOMParser().parseFromString(html, "text/html");
        var sourceHeadings = Array.prototype.slice.call(source.querySelectorAll(".bibliography-year"));
        if (sourceHeadings.length === 0) {
          throw new Error("No publication records found");
        }

        var fragment = document.createDocumentFragment();
        sourceHeadings.forEach(function (heading) {
          fragment.appendChild(document.importNode(heading.closest(".row"), true));
        });

        loading.replaceWith(fragment);
        window.initPublications(publications);
        publications.setAttribute("aria-busy", "false");
        secureExternalLinks(publications);

        if (window.location.hash === "#publications") {
          publications.scrollIntoView();
        } else if (window.location.hash.indexOf("#year-") === 0) {
          var target = document.querySelector(window.location.hash);
          if (target) {
            target.scrollIntoView();
          }
        } else if (window.location.hash === "#teaching" || window.location.hash === "#service") {
          var downstreamSection = document.querySelector(window.location.hash);
          if (downstreamSection) {
            downstreamSection.scrollIntoView();
          }
        }
        window.dispatchEvent(new Event("resize"));
      })
      .catch(function () {
        loading.classList.add("publication-loading-error");
        loading.innerHTML = 'The publication archive could not be loaded. <a href="/publications/">Open the publications page</a>.';
        publications.setAttribute("aria-busy", "false");
        window.dispatchEvent(new Event("resize"));
      });
  }

  function observeOnce(element, callback, rootMargin) {
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        callback();
      }
    }, { rootMargin: rootMargin || "400px 0px" });

    observer.observe(element);
  }

  function deferPublications() {
    var publications = document.getElementById("publications");
    if (!publications) {
      return;
    }

    if (window.location.hash === "#publications" || window.location.hash === "#teaching" || window.location.hash === "#service" || window.location.hash.indexOf("#year-") === 0) {
      loadPublications();
      return;
    }

    observeOnce(publications, loadPublications, "700px 0px");
  }

  function initSectionNavigation() {
    var navItems = Array.prototype.slice.call(document.querySelectorAll("[data-section-nav]"));
    var sectionTargets = navItems.map(function (item) {
      var name = item.getAttribute("data-section-nav");
      return {
        name: name,
        element: document.getElementById(name)
      };
    }).filter(function (section) {
      return section.element;
    });

    if (sectionTargets.length === 0) {
      return;
    }

    function setActiveSection(sectionName) {
      navItems.forEach(function (item) {
        var active = item.getAttribute("data-section-nav") === sectionName;
        item.classList.toggle("navbar-active", active);
        item.classList.toggle("font-weight-bold", active);
        var link = item.querySelector("a");
        if (link) {
          if (active) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        }
      });
    }

    function updateActiveSection() {
      var navbar = document.getElementById("navbar");
      var threshold = window.scrollY + (navbar ? navbar.offsetHeight : 0) + 100;
      var activeSection = sectionTargets[0].name;
      sectionTargets.forEach(function (section) {
        if (threshold >= section.element.offsetTop) {
          activeSection = section.name;
        }
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        activeSection = sectionTargets[sectionTargets.length - 1].name;
      }
      setActiveSection(activeSection);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
  }

  secureExternalLinks(page);
  enhanceNews();
  deferPublications();
  initSectionNavigation();
})();
