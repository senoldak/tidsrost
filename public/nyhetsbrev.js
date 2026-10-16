// Ukesbrev: /nyhetsbrev/?durum=... adresindeki duruma uygun mesajı gösterir.
// JavaScript kapalıysa sayfadaki genel açıklama kalır. Satır içi script yok (CSP).
(function () {
  var durum;
  try {
    durum = new URLSearchParams(window.location.search).get('durum');
  } catch (e) {
    return;
  }
  if (!durum || !/^[a-z]+$/.test(durum)) return;
  var kutu = document.querySelector('.bulten-status[data-durum="' + durum + '"]');
  if (!kutu) return;
  kutu.hidden = false;
  var genel = document.querySelector('.bulten-generell');
  if (genel) genel.hidden = true;
  kutu.focus();
})();
