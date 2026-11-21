/* =========================================================
   PORTO GRILL - Espace patron
   Sommaire
   1. Départ et outils      2. Onglets
   3. Tableau de bord       4. Menu et prix
   5. Tables                6. Temps réel et démarrage
   ========================================================= */
(async function () {
  "use strict";

  /* =========================================================
     1. DÉPART ET OUTILS
     ========================================================= */
  var sb = PG.sb;

  // Seul le patron entre ici. Sinon, retour à la page de connexion.
  var moi = await PG.exiger(["patron", "super_admin"]);
  if (!moi) { return; }

   var $ = function (id) { return document.getElementById(id) || document.createElement("div"); };
  $("userName").textContent = moi.nom;
  $("logout").addEventListener("click", PG.deconnexion);

  // Crée un élément HTML sans jamais interpréter le texte comme du code (sécurité)
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

  var minuteur = null;
  function toast(texte, erreur) {
    var t = $("toast");
    t.textContent = texte;
    t.className = "toast" + (erreur ? " is-error" : "");
    t.hidden = false;
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { t.hidden = true; }, 4000);
  }

  function messageErreur(err) {
    if (err && err.code === "23505") { return "Ce nom existe déjà."; }
    return PG.erreur(err);
  }

  function agir(fonction) {
    return async function (e) {
      try { await fonction(e); }
      catch (err) { toast(messageErreur(err), true); }
    };
  }

  function dateBenin(decalage) {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .forEach(function (p) { o[p.type] = p.value; });
    var d = new Date(o.year + "-" + o.month + "-" + o.day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - (decalage || 0));
    return d.toISOString().slice(0, 10);
  }

  function jourLisible(iso, options) {
    options.timeZone = "UTC";
    return new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", options);
  }

  var charge = { tableau: false, menu: false, tables: false };

  function ouvrirOnglet(nom) {
    document.querySelectorAll(".tab").forEach(function (b) {
      var actif = b.getAttribute("data-tab") === nom;
      b.classList.toggle("is-active", actif);
      b.setAttribute("aria-pressed", actif ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.hidden = p.id !== "tab-" + nom;
    });
    if (nom === "menu") { agir(chargerMenu)(); }
    if (nom === "tables") { agir(chargerTables)(); }
    if (nom === "personnel") { agirP(chargerPersonnel)(); }
    if (nom === "tableau") { agir(chargerTableau)(); agir(chargerClotures)(); }
  }

  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirOnglet(b.getAttribute("data-tab")); });
  });

  function svg(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function courtMontant(v) {
    if (v >= 1000) { return (Math.round(v / 100) / 10).toLocaleString("fr-FR") + " k"; }
    return String(v);
  }

  function dessinerGraphique(parJour) {
    var jours = [];
    for (var i = 6; i >= 0; i--) { jours.push(dateBenin(i)); }
    var valeurs = jours.map(function (j) { return parJour[j] ? parJour[j].total : 0; });
    var max = Math.max.apply(null, valeurs.concat([1]));

    var W = 560, H = 230, bas = 190, haut = 34, colonne = W / 7;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H });
    s.appendChild(svg("line", { x1: 0, y1: bas, x2: W, y2: bas, "class": "axis" }));

    jours.forEach(function (j, k) {
      var h = Math.round((valeurs[k] / max) * (bas - haut));
      var x = k * colonne + colonne * 0.2;
      var w = colonne * 0.6;

      s.appendChild(svg("rect", {
        x: x, y: bas - Math.max(h, 2), width: w, height: Math.max(h, 2), rx: 4,
        "class": k === 6 ? "bar bar-today" : "bar"
      }));

      var etiquette = svg("text", { x: x + w / 2, y: bas + 20, "text-anchor": "middle" });
      etiquette.textContent = jourLisible(j, { weekday: "short", day: "numeric" });
      s.appendChild(etiquette);

      if (valeurs[k] > 0) {
        var val = svg("text", { x: x + w / 2, y: bas - h - 7, "text-anchor": "middle", "class": "val" });
        val.textContent = courtMontant(valeurs[k]);
        s.appendChild(val);
      }
    });

    $("graph").replaceChildren(s);
  }

  async function chargerClotures() {
    var r = await sb.from("journees").select("jour, ferme_le, caissier_id, encaisse, non_encaisse, points_manquants, ecart_total").order("jour", { ascending: false }).limit(7);
    var boite = $("clotures-jours");
    if (!boite || r.error) { return; }
    var p = await sb.from("profiles").select("id, nom");
    var noms = {};
    (p.data || []).forEach(function (x) { noms[x.id] = x.nom; });
    boite.replaceChildren(el("h2", { "class": "step-title", text: "Clôtures de journée (caisse)" }));
    if (!r.data.length) { boite.appendChild(el("p", { text: "Aucune journée clôturée pour l'instant." })); }
    r.data.forEach(function (j) {
      var ok = j.ecart_total === 0 && j.points_manquants === 0;
      boite.appendChild(el("p", { "class": "cloture-ligne " + (ok ? "ok" : "ko"),
        text: j.jour + " · clôturée à " + PG.heure(j.ferme_le) + "
