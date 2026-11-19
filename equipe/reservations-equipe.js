/* PORTO GRILL - Réservations (code commun à tous les espaces de l'équipe) */
(function () {
  "use strict";
  var sb = PG.sb;

  function el(tag, props, enfants) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") { e.textContent = props[k]; }
      else if (k === "class") { e.className = props[k]; }
      else { e.setAttribute(k, props[k]); }
    });
    (enfants || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function un(x) { return Array.isArray(x) ? x[0] : x; }

  function dateBenin() {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }
  function jourSuivant(iso) {
    return new Date(new Date(iso + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10);
  }
  function titreJour(iso, aujourdhui) {
    if (iso === aujourdhui) { return "Aujourd’hui"; }
    if (iso === jourSuivant(aujourdhui)) { return "Demain"; }
    var t = new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  var ETATS = { en_attente: "En attente de confirmation", confirmee: "Confirmée", arrivee: "Client arrivé" };

  window.PGResa = {
    monter: function (opts) {
      var boite = document.getElementById(opts.liste);
      var pastille = opts.compteur ? document.getElementById(opts.compteur) : null;
      if (!boite) { return null; }
      var toast = opts.toast || function () {};
      var bip = opts.bip || function () {};
      var attente = null;

      async function modifier(id, valeurs) {
        var r = await sb.from("reservations").update(valeurs).eq("id", id).select("id");
        if (r.error) { throw r.error; }
        if (!r.data || !r.data.length) { throw new Error("permission denied"); }
      }
      async function supprimer(id) {
        var r = await sb.from("reservations").delete().eq("id", id).select("id");
        if (r.error) { throw r.error; }
        if (!r.data || !r.data.length) { throw new Error("permission denied"); }
      }

      function bouton(texte, classe, action) {
        var b = el("button", { type: "button", "class": "btn " + classe + " btn-small", text: texte });
        b.addEventListener("click", async function () {
          try { await action(); await charger(); }
          catch (err) { toast(PG.erreur(err), true); }
        });
        return b;
      }

      function carte(x) {
        var table = un(x.tables_salle);
        var actions = el("div", { "class": "order-actions" });

        if (x.statut === "en_attente") {
          actions.appendChild(bouton("Confirmer", "btn-primary", function () { return modifier(x.id, { statut: "confirmee" }); }));
          actions.appendChild(bouton("Refuser", "btn-ghost", function () {
            if (window.confirm("Refuser la réservation de " + x.nom + " ?")) { return modifier(x.id, { statut: "refusee" }); }
          }));
        }
        if (x.statut === "confirmee") {
          actions.appendChild(bouton("Client arrivé", "btn-primary", function () { return modifier(x.id, { statut: "arrivee" }); }));
          actions.appendChild(bouton("Annuler", "btn-ghost", function () {
            if (window.confirm("Annuler la réservation de " + x.nom + " ?")) { return modifier(x.id, { statut: "refusee" }); }
          }));
        }
        actions.appendChild(bouton("Supprimer", "btn-danger", function () {
          if (window.confirm("Supprimer définitivement la réservation de " + x.nom + " ?")) { return supprimer(x.id); }
        }));

        var tel = el("a", { href: "tel:" + String(x.telephone).replace(/[^\d+]/g, ""), text: x.telephone });
        var c = el("article", { "class": "resa" }, [
          el("p", { "class": "resa-heure", text: String(x.heure || "").slice(0, 5) }),
          el("p", { text: x.nom + " • " + x.personnes + (x.personnes > 1 ? " personnes" : " personne") }),
          el("p", { text: (table ? "Table : " + table.nom + " • " : "") + (ETATS[x.statut] || x.statut) }),
          el("p", {}, [document.createTextNode("Tél. : "), tel])
        ]);
        if (x.message) { c.appendChild(el("p", { "class": "ticket-note", text: x.message })); }
        c.appendChild(actions);
        return c;
      }

      async function charger() {
        try {
          var aujourdhui = dateBenin();
          var r = await sb.from("reservations")
            .select("id, nom, telephone, date_reservation, heure, personnes, message, statut, tables_salle(nom, zone)")
            .gte("date_reservation", aujourdhui)
            .in("statut", ["en_attente", "confirmee", "arrivee"])
            .order("date_reservation", { ascending: true })
            .order("heure", { ascending: true });
          if (r.error) { throw r.error; }

          boite.replaceChildren();
          var nouvelles = 0, dernierJour = null;
          if (!r.data.length) {
            boite.appendChild(el("p", { "class": "vide", text: "Aucune réservation à venir." }));
          }
          r.data.forEach(function (x) {
            if (x.statut === "en_attente") { nouvelles += 1; }
            if (x.date_reservation !== dernierJour) {
              dernierJour = x.date_reservation;
              boite.appendChild(el("h2", { "class": "step-title", style: "grid-column:1/-1", text: titreJour(dernierJour, aujourdhui) }));
            }
            boite.appendChild(carte(x));
          });
          if (pastille) { pastille.textContent = String(nouvelles); pastille.hidden = nouvelles === 0; }
        } catch (err) {
          boite.replaceChildren(el("p", { "class": "vide", text: PG.erreur(err) }));
        }
      }

      try {
        sb.channel("resa-" + opts.liste + "-" + Date.now())
          .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, function (payload) {
            if (payload.eventType === "INSERT") {
              bip();
              toast("📅 Nouvelle réservation : " + ((payload.new && payload.new.nom) || "Client"));
            }
            clearTimeout(attente);
            attente = setTimeout(charger, 500);
          })
          .subscribe();
      } catch (e) { /* temps réel indisponible : la liste se recharge toute seule chaque minute */ }

      setInterval(charger, 60000);
      charger();
      return { recharger: charger };
    }
  };
})();
