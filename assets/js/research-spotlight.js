(function () {
  "use strict";

  var spotlight = document.getElementById("carbon-spotlight");
  if (!spotlight) return;

  // Keep the intro variant available locally while reviewing the inline design.
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  var previewPlacement = new URLSearchParams(window.location.search).get("spotlight");
  var useIntroPlacement = isLocal && previewPlacement === "intro";
  spotlight.hidden = !useIntroPlacement;

  function placeUnderPaper() {
    var paper = document.getElementById("carbon-globe");
    if (!paper) return;
    paper.appendChild(spotlight);
    spotlight.classList.add("spotlight-inline");
    spotlight.hidden = false;
  }

  if (!useIntroPlacement) {
    // The homepage imports its first-author papers asynchronously.
    document.addEventListener("homepage:publications-ready", placeUnderPaper);
    document.addEventListener("homepage:publications-failed", function () {
      // Keep the project reachable if the publication archive is unavailable.
      spotlight.hidden = false;
    });
    placeUnderPaper();
  }

  var teaser = spotlight.querySelector(".spotlight-teaser");
  var motionButton = spotlight.querySelector(".spotlight-motion");
  var motionIcon = motionButton.querySelector("i");
  var watchLink = spotlight.querySelector("[data-carbon-film]");
  var dialog = document.querySelector(".carbon-film-dialog");
  var film = dialog.querySelector(".carbon-full-film");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection = navigator.connection;
  var userMotionChoice = null;
  var inView = false;

  function wantsMotion() {
    if (userMotionChoice !== null) return userMotionChoice;
    return !reducedMotion.matches && !(connection && connection.saveData);
  }

  function syncMotionButton() {
    var playing = !teaser.paused;
    motionButton.setAttribute("aria-label", playing ? "Pause video preview" : "Play video preview");
    motionButton.title = playing ? "Pause preview" : "Play preview";
    motionIcon.className = playing ? "fas fa-pause" : "fas fa-play";
  }

  function updatePlayback() {
    if (!inView || document.hidden || dialog.open || !wantsMotion()) {
      teaser.pause();
      return;
    }
    // No video bytes are requested until the teaser is visible and motion is allowed.
    if (!teaser.getAttribute("src")) teaser.src = teaser.getAttribute("data-src");
    var playRequest = teaser.play();
    if (playRequest) playRequest.catch(syncMotionButton);
  }

  motionButton.hidden = false;
  motionButton.addEventListener("click", function () {
    userMotionChoice = teaser.paused;
    updatePlayback();
  });
  teaser.addEventListener("play", syncMotionButton);
  teaser.addEventListener("pause", syncMotionButton);
  teaser.addEventListener("error", function () {
    // Keep the poster and project links useful if video delivery fails.
    motionButton.hidden = true;
    teaser.removeAttribute("src");
    teaser.load();
    userMotionChoice = false;
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      updatePlayback();
    }, { threshold: 0.15 });
    observer.observe(teaser);
  } else {
    // Older browsers retain a poster and opt-in playback, without downloading on load.
    inView = true;
    userMotionChoice = false;
  }

  document.addEventListener("visibilitychange", updatePlayback);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", updatePlayback);
  if (connection && connection.addEventListener) connection.addEventListener("change", updatePlayback);

  if (typeof dialog.showModal === "function") {
    watchLink.addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      dialog.showModal();
      document.body.classList.add("carbon-film-open");
      updatePlayback();
      // The full-resolution film loads only after this explicit user action.
      film.src = watchLink.href;
      var playRequest = film.play();
      if (playRequest) playRequest.catch(function () { /* Native controls remain available. */ });
    });
    dialog.querySelector(".carbon-film-close").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener("close", function () {
      film.pause();
      film.removeAttribute("src");
      film.load();
      document.body.classList.remove("carbon-film-open");
      watchLink.focus({ preventScroll: true });
      updatePlayback();
    });
  }

  if (!spotlight.hidden && window.location.hash === "#carbon-spotlight") {
    window.requestAnimationFrame(function () { spotlight.scrollIntoView(); });
  }
})();
