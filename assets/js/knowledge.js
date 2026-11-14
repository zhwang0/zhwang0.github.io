(function () {
  "use strict";

  var films = Array.prototype.slice.call(document.querySelectorAll(".learning-film video"));

  films.forEach(function (film) {
    var article = film.closest(".learning-film");
    var trigger = article.querySelector("[data-film-play]");
    var notice = article.querySelector(".film-error");

    function showError() {
      if (notice) notice.hidden = false;
      if (trigger) trigger.hidden = true;
      film.controls = true;
    }

    // Native controls remain the default when JavaScript is unavailable.
    if (trigger) {
      film.controls = false;
      trigger.hidden = false;
      trigger.addEventListener("click", function () {
        trigger.hidden = true;
        film.controls = true;
        if (notice) notice.hidden = true;
        film.focus();
        var playback = film.play();
        if (playback && typeof playback.catch === "function") {
          playback.catch(function () {
            if (film.error) {
              showError();
            } else if (film.paused) {
              // A rejected play request must leave a usable way to try again.
              film.controls = false;
              trigger.hidden = false;
            }
          });
        }
      });
    }

    film.addEventListener("play", function () {
      if (trigger) trigger.hidden = true;
      film.controls = true;
      films.forEach(function (other) {
        if (other !== film) other.pause();
      });
    });

    film.addEventListener("error", showError);
    var source = film.querySelector("source");
    if (source) source.addEventListener("error", showError);
  });
})();
