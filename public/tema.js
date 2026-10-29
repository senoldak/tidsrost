// Lyst/mørkt tema: leserens valg i menyen huskes i nettleseren (localStorage 'tema' = 'lys' | 'mork').
// Uten valg følger siden enhetens innstilling (prefers-color-scheme). Lastes i <head> før siden tegnes,
// som egen fil fordi CSP ikke tillater innebygde skript.
(function () {
  var rot = document.documentElement;
  var lagret = null;
  try {
    lagret = localStorage.getItem('tema');
  } catch (e) {}
  if (lagret === 'lys' || lagret === 'mork') rot.setAttribute('data-tema', lagret);

  var morkMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var erMork = function () {
    var valgt = rot.getAttribute('data-tema');
    if (valgt) return valgt === 'mork';
    return !!(morkMedia && morkMedia.matches);
  };
  var oppdaterMeta = function () {
    var farge = erMork() ? '#171612' : '#fdfdfb';
    var metaer = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metaer.length; i++) metaer[i].setAttribute('content', farge);
  };
  var oppdaterKnapper = function () {
    var knapper = document.querySelectorAll('.tema-bryter');
    for (var i = 0; i < knapper.length; i++) knapper[i].setAttribute('aria-pressed', erMork() ? 'true' : 'false');
  };

  document.addEventListener('DOMContentLoaded', function () {
    oppdaterKnapper();
    if (rot.getAttribute('data-tema')) oppdaterMeta();
    var knapper = document.querySelectorAll('.tema-bryter');
    for (var i = 0; i < knapper.length; i++) {
      knapper[i].addEventListener('click', function () {
        var nytt = erMork() ? 'lys' : 'mork';
        rot.setAttribute('data-tema', nytt);
        try {
          localStorage.setItem('tema', nytt);
        } catch (e) {}
        oppdaterMeta();
        oppdaterKnapper();
      });
    }
  });
})();
