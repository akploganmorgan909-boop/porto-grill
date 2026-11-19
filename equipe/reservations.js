(function () {
  "use strict";
  // Valeurs publiques (les mêmes que dans config.js). Jamais de clé "secret" ici.
  var URL_BASE = "https://mjzyatbvfucfaoyrthqb.supabase.co";
  var CLE = "sb_publishable_lHURNmtF6J4B9bP_BxsBeQ_GjzN3QJS";

  window.enregistrerReservation = function (r) {
    var nb = parseInt(r.personnes, 10), msg = r.message || "";
    if (isNaN(nb)) { nb = 11; msg = ("Plus de 10 personnes. " + msg).trim(); }
    return fetch(URL_BASE + "/rest/v1/reservations", {
      method: "POST",
      headers: { "apikey": CLE, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        nom: r.nom.slice(0, 100),
        telephone: r.telephone.replace(/[^\d+]/g, ""),
        date_reservation: r.date,
        heure: r.heure,
        personnes: nb,
        message: msg ? msg.slice(0, 500) : null,
        source: "site"
      })
    }).then(function (rep) { return rep.ok; }).catch(function () { return false; });
  };
})();
