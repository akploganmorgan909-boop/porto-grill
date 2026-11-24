(function () {
  "use strict";

  var btn = document.getElementById("installBtn");
  var evenementDiffere = null;

  // Déjà installé (le site tourne en mode application) : pas besoin du bouton.
  var dejaInstalle =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true; // Safari iOS
  if (dejaInstalle) { return; }

  // Le service worker est obligatoire pour que Chrome et Edge acceptent l’installation.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* tant pis, pas bloquant */ });
  }

  // Chrome / Edge / Android : le navigateur prévient quand l’installation est possible.
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    evenementDiffere = e;
    if (btn) { btn.hidden = false; }
  });

  if (btn) {
    btn.addEventListener("click", async function () {
      if (!evenementDiffere) { return; }
      evenementDiffere.prompt();
      var choix = await evenementDiffere.userChoice;
      // On cache le bouton dès que la personne confirme, sans attendre l'évènement "appinstalled"
      // qui n'est pas toujours déclenché de façon fiable sur tous les navigateurs.
      if (choix && choix.outcome === "accepted") {
        btn.hidden = true;
      }
      evenementDiffere = null;
    });
  }

  // Une fois installé, le bouton n’a plus de raison d’être.
  window.addEventListener("appinstalled", function () {
    if (btn) { btn.hidden = true; }
    evenementDiffere = null;
  });
})();
