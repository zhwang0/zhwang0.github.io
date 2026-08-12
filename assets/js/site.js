(function () {
  "use strict";

  var navbar = document.getElementById("navbar");
  var toggler = navbar ? navbar.querySelector(".navbar-toggler") : null;
  var navigation = null;
  var progress = document.getElementById("progress");
  var frameRequested = false;

  if (toggler) {
    var targetSelector = toggler.getAttribute("data-target");
    navigation = targetSelector ? document.querySelector(targetSelector) : null;
  }

  function closeNavigation() {
    if (!toggler || !navigation) {
      return;
    }
    navigation.classList.remove("show");
    toggler.setAttribute("aria-expanded", "false");
  }

  function updateLayout() {
    var navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
    document.body.style.paddingTop = navbarHeight + "px";

    if (progress) {
      var maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      progress.style.top = navbarHeight + "px";
      progress.max = maximum;
      progress.value = Math.min(window.scrollY, maximum);
    }
    frameRequested = false;
  }

  function requestLayoutUpdate() {
    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(updateLayout);
    }
  }

  if (toggler && navigation) {
    toggler.addEventListener("click", function () {
      var expanded = toggler.getAttribute("aria-expanded") === "true";
      navigation.classList.toggle("show", !expanded);
      toggler.setAttribute("aria-expanded", String(!expanded));
      requestLayoutUpdate();
    });

    Array.prototype.slice.call(navigation.querySelectorAll("a")).forEach(function (link) {
      link.addEventListener("click", closeNavigation);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeNavigation();
      }
    });
  }

  updateLayout();
  window.addEventListener("load", updateLayout, { once: true });
  window.addEventListener("scroll", requestLayoutUpdate, { passive: true });
  window.addEventListener("resize", requestLayoutUpdate);
})();
