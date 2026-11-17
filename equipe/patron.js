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
  var moi = await PG.exiger(["patron"]);
  if (!moi) { return; }

  var $ = function (id) { return document.getElementById(id); };
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

  // Entoure une action : en cas d'erreur, un message clair s'affiche
  function agir(fonction) {
    return async function (e) {
      try { await fonction(e); }
      catch (err) { toast(messageErreur(err), true); }
    };
  }

  // Date du jour au Bénin ("2026-11-15"), avec un décalage en jours (0 = aujourd'hui)
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


  /* =========================================================
     2. ONGLETS
     ========================================================= */
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
    if (nom === "tableau") { agir(chargerTableau)(); agir(chargerClotures)(); }
  }

  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirOnglet(b.getAttribute("data-tab")); });
  });


  /* =========================================================
     3. TABLEAU DE BORD
     ========================================================= */
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

  // Dernières clôtures de journée faites par le caissier (traçabilité)
  async function chargerClotures() {
    var r = await sb.from("journees").select("jour, ferme_le, caissier_id, encaisse, non_encaisse, points_manquants, ecart_total").order("jour", { ascending: false }).limit(7);
    var boite = $("clotures-jours");
    if (!boite || r.error) { return; }   // tant que le script etape-8 n'est pas exécuté : on n'affiche rien
    var p = await sb.from("profiles").select("id, nom");
    var noms = {};
    (p.data || []).forEach(function (x) { noms[x.id] = x.nom; });
    boite.replaceChildren(el("h2", { "class": "step-title", text: "Clôtures de journée (caisse)" }));
    if (!r.data.length) { boite.appendChild(el("p", { text: "Aucune journée clôturée pour l'instant." })); }
    r.data.forEach(function (j) {
      var ok = j.ecart_total === 0 && j.points_manquants === 0;
      boite.appendChild(el("p", { "class": "cloture-ligne " + (ok ? "ok" : "ko"),
        text: j.jour + " · clôturée à " + PG.heure(j.ferme_le) + " par " + (noms[j.caissier_id] || "?") + " · encaissé " + PG.argent(j.encaisse) +
          " · non encaissé " + PG.argent(j.non_encaisse) + " · écart " + PG.argent(j.ecart_total) + (j.points_manquants ? " · " + j.points_manquants + " point(s) non clôturé(s)" : "") }));
    });
  }

  async function chargerTableau() {
    var auj = dateBenin(0);
    var debut = dateBenin(6);

    var r = await Promise.all([
      sb.from("ventes_par_jour").select("jour, nb_commandes, total, total_encaisse").gte("jour", debut).order("jour"),
      sb.from("plats_vendus").select("nom, quantite, montant").eq("jour", auj).order("quantite", { ascending: false }).limit(5)
    ]);
    if (r[0].error) { throw r[0].error; }
    if (r[1].error) { throw r[1].error; }

    var parJour = {};
    r[0].data.forEach(function (x) { parJour[x.jour] = x; });
    var j = parJour[auj] || { nb_commandes: 0, total: 0, total_encaisse: 0 };

    $("dateJour").textContent = jourLisible(auj, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("kpiVentes").textContent = PG.argent(j.total);
    $("kpiEncaisse").textContent = PG.argent(j.total_encaisse);
    $("kpiCommandes").textContent = String(j.nb_commandes);
    $("kpiPanier").textContent = PG.argent(j.nb_commandes ? Math.round(j.total / j.nb_commandes) : 0);

    dessinerGraphique(parJour);

    var liste = $("topPlats");
    liste.replaceChildren();
    if (!r[1].data.length) {
      liste.appendChild(el("li", { "class": "vide", text: "Aucune vente pour l’instant aujourd’hui." }));
    }
    r[1].data.forEach(function (p) {
      liste.appendChild(el("li", {}, [
        el("span", { text: p.nom }),
        el("span", { "class": "qte", text: p.quantite + " vendus · " + PG.argent(p.montant) })
      ]));
    });
  }


  /* =========================================================
     4. MENU ET PRIX
     ========================================================= */
  var CATEGORIES = {
    beninois: "Cuisine béninoise", grillades: "Grillades", francais: "Plats français",
    partager: "À partager", desserts: "Desserts", boissons: "Boissons"
  };

  function prixDe(plat) {
    var x = plat.plat_prix;
    if (Array.isArray(x)) { x = x[0]; }
    return x ? x.prix : null;
  }

  function lignePlat(p) {
    var prix = prixDe(p);
    var champ = el("input", { type: "number", "class": "prix-input", min: "0", step: "50", "aria-label": "Prix de " + p.nom, value: prix === null ? "" : prix });

    var enregistrer = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: "Enregistrer le prix" });
    enregistrer.addEventListener("click", agir(async function () {
      var n = parseInt(champ.value, 10);
      if (isNaN(n) || n < 0) { toast("Entrez un prix valide.", true); return; }
      var r = await sb.from("plat_prix").upsert({ plat_id: p.id, prix: n }, { onConflict: "plat_id" });
      if (r.error) { throw r.error; }
      toast("Prix de « " + p.nom + " » enregistré : " + PG.argent(n) + ".");
    }));

    var dispo = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: p.disponible ? "Marquer épuisé" : "Remettre en vente" });
    dispo.addEventListener("click", agir(async function () {
      var r = await sb.from("plats").update({ disponible: !p.disponible }).eq("id", p.id);
      if (r.error) { throw r.error; }
      await chargerMenu();
    }));

    var suppr = el("button", { type: "button", "class": "btn btn-danger btn-small", text: "Supprimer" });
    suppr.addEventListener("click", agir(async function () {
      if (!window.confirm("Supprimer « " + p.nom + " » ?")) { return; }
      var r = await sb.from("plats").delete().eq("id", p.id);
      if (r.error) {
        if (r.error.code === "23503") { toast("Ce plat a déjà été commandé. Marquez-le épuisé plutôt que de le supprimer.", true); return; }
        throw r.error;
      }
      toast("Plat supprimé.");
      await chargerMenu();
    }));

    var infos = el("div", {}, [
      el("p", { "class": "plat-nom", text: p.nom }),
      el("span", { "class": "badge" + (p.disponible ? "" : " badge-off"), text: p.disponible ? "En vente" : "Épuisé" })
    ]);
    if (p.description) { infos.appendChild(el("p", { "class": "plat-desc", text: p.description })); }
    if (prix === null) { infos.appendChild(el("p", { "class": "plat-desc", text: "Pas encore de prix : ce plat ne peut pas être commandé." })); }

    return el("div", { "class": "plat" + (p.disponible ? "" : " is-off") }, [
      infos,
      el("div", { "class": "plat-actions" }, [champ, enregistrer, dispo, suppr])
    ]);
  }

  async function chargerMenu() {
    var r = await sb.from("plats").select("id, nom, description, categorie, disponible, plat_prix(prix)").order("nom");
    if (r.error) { throw r.error; }

    var boite = $("listePlats");
    boite.replaceChildren();
    if (!r.data.length) {
      boite.appendChild(el("p", { "class": "vide", text: "Aucun plat pour l’instant. Ajoutez le premier avec le formulaire ci-dessus." }));
      return;
    }
    Object.keys(CATEGORIES).forEach(function (cat) {
      var plats = r.data.filter(function (p) { return p.categorie === cat; });
      if (!plats.length) { return; }
      boite.appendChild(el("h2", { text: CATEGORIES[cat] }));
      plats.forEach(function (p) { boite.appendChild(lignePlat(p)); });
    });
  }

  $("formPlat").addEventListener("submit", agir(async function (e) {
    e.preventDefault();
    var nom = $("platNom").value.trim();
    var prix = parseInt($("platPrix").value, 10);
    var description = $("platDescription").value.trim();

    if (nom.length < 2) { toast("Écrivez le nom du plat.", true); return; }
    if (isNaN(prix) || prix < 0) { toast("Entrez un prix valide.", true); return; }

    var a = await sb.from("plats").insert({ nom: nom, categorie: $("platCategorie").value, description: description || null }).select("id").single();
    if (a.error) { throw a.error; }

    var b = await sb.from("plat_prix").insert({ plat_id: a.data.id, prix: prix });
    if (b.error) {
      await sb.from("plats").delete().eq("id", a.data.id); // on annule : pas de plat sans prix
      throw b.error;
    }

    $("formPlat").reset();
    toast("« " + nom + " » ajouté au menu.");
    await chargerMenu();
  }));


  /* =========================================================
     5. TABLES
     ========================================================= */
  var ZONES = { salle: "Salle", terrasse: "Terrasse", bar: "Bar", vip: "VIP" };

  function ligneTable(t) {
    var actif = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: t.actif ? "Désactiver" : "Réactiver" });
    actif.addEventListener("click", agir(async function () {
      var r = await sb.from("tables_salle").update({ actif: !t.actif }).eq("id", t.id);
      if (r.error) { throw r.error; }
      await chargerTables();
    }));

    var suppr = el("button", { type: "button", "class": "btn btn-danger btn-small", text: "Supprimer" });
    suppr.addEventListener("click", agir(async function () {
      if (!window.confirm("Supprimer la table « " + t.nom + " » ?")) { return; }
      var r = await sb.from("tables_salle").delete().eq("id", t.id);
      if (r.error) {
        if (r.error.code === "23503") { toast("Cette table a déjà des commandes. Désactivez-la plutôt.", true); return; }
        throw r.error;
      }
      toast("Table supprimée.");
      await chargerTables();
    }));

    return el("div", { "class": "table-item" + (t.actif ? "" : " is-off") }, [
      el("div", {}, [
        el("p", { "class": "plat-nom", text: "Table " + t.nom }),
        el("p", { "class": "plat-desc", text: t.places + " places · " + (ZONES[t.zone] || t.zone) + (t.actif ? "" : " · désactivée") })
      ]),
      el("div", { "class": "plat-actions" }, [actif, suppr])
    ]);
  }

  async function chargerTables() {
    var r = await sb.from("tables_salle").select("id, nom, places, zone, actif").order("nom");
    if (r.error) { throw r.error; }
    var boite = $("listeTables");
    boite.replaceChildren();
    if (!r.data.length) {
      boite.appendChild(el("p", { "class": "vide", text: "Aucune table pour l’instant. Ajoutez la première avec le formulaire ci-dessus." }));
      return;
    }
    r.data.forEach(function (t) { boite.appendChild(ligneTable(t)); });
  }

  $("formTable").addEventListener("submit", agir(async function (e) {
    e.preventDefault();
    var nom = $("tableNom").value.trim();
    var places = parseInt($("tablePlaces").value, 10);
    if (!nom) { toast("Écrivez le nom ou le numéro de la table.", true); return; }
    if (isNaN(places) || places < 1 || places > 60) { toast("Le nombre de places doit être entre 1 et 60.", true); return; }

    var r = await sb.from("tables_salle").insert({ nom: nom, places: places, zone: $("tableZone").value });
    if (r.error) { throw r.error; }
    $("formTable").reset();
    $("tablePlaces").value = 4;
    toast("Table « " + nom + " » ajoutée.");
    await chargerTables();
  }));


  /* =========================================================
     6. TEMPS RÉEL ET DÉMARRAGE
     ========================================================= */

  // Le tableau de bord se met à jour tout seul quand une commande arrive
  try {
    var attente = null;
    var rafraichir = function () {
      clearTimeout(attente);
      attente = setTimeout(function () { agir(chargerTableau)(); }, 800);
    };
    sb.channel("patron-ventes")
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "commande_lignes" }, rafraichir)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "journees" }, async function (payload) {
        var n = payload.new || {};
        var p = await sb.from("profiles").select("nom").eq("id", n.caissier_id).maybeSingle();
        toast("🔒 Journée du " + n.jour + " clôturée à " + PG.heure(n.ferme_le) + " par " + ((p.data && p.data.nom) || "le caissier") +
          " · encaissé " + PG.argent(n.encaisse) + " · écart " + PG.argent(n.ecart_total) + (n.points_manquants ? " · " + n.points_manquants + " point(s) non clôturé(s)" : ""));
        clearTimeout(minuteur);   // le message reste affiché jusqu'à ce qu'on le touche
        $("toast").onclick = function () { $("toast").hidden = true; };
        agir(chargerClotures)();
      })
      .subscribe();
  } catch (e) {
    console.warn("Temps réel indisponible :", e);
  }

  ouvrirOnglet("tableau");
})();
