/* =========================================================
   PORTO GRILL - Espace serveur
   Sommaire
   1. Départ et outils     2. Onglets
   3. Nouvelle commande    4. Mes commandes
   5. Temps réel et démarrage
   ========================================================= */
(async function () {
  "use strict";

  /* =========================================================
     1. DÉPART ET OUTILS
     ========================================================= */
  var sb = PG.sb;

  // Le serveur entre ici. Le patron aussi (pour tester).
  var moi = await PG.exiger(["serveur", "patron"]);
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
    if (erreur) { t.textContent = texte + " (touchez ce message pour le fermer)"; t.onclick = function () { t.hidden = true; }; }
    else { t.onclick = null; minuteur = setTimeout(function () { t.hidden = true; }, 4500); }
  }

  function messageErreur(err) {
    var texte = String((err && err.message) || "");
    if (/envoyer_commande/i.test(texte) && /could not find|not found/i.test(texte)) {
      return "La fonction d’envoi n’est pas installée. Exécutez le script etape-3-commande.sql dans Supabase.";
    }
    if (/relance impossible/i.test(texte)) { return "Relance impossible : déjà faite il y a moins d'une minute, ou commande terminée."; }
    if (/prix manquant/i.test(texte)) { return "Le prix d'un plat est manquant ou invalide."; }
    if (/pas encore de prix/i.test(texte)) { return "Un des plats n’a pas de prix. Prévenez le patron."; }
    if (/pas disponible/i.test(texte)) { return "Un des plats est épuisé. Retirez-le du panier."; }
    return PG.erreur(err);
  }

  function agir(fonction) {
    return async function (e) {
      try { await fonction(e); }
      catch (err) { toast(messageErreur(err), true); }
    };
  }

  // Petit son quand une commande est prête (le navigateur peut le bloquer avant le premier clic)
  function bip() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      var ctx = new C();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch (e) { /* pas de son possible */ }
  }

  function dateBenin() {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .forEach(function (p) { o[p.type] = p.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }

  // Une relation 1-1 peut arriver sous forme d'objet ou de liste selon la version
  function un(x) { return Array.isArray(x) ? x[0] : x; }

  // Texte sans accents ni majuscules (pour la recherche et les noms de tables)
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }

  // Commandes non payées du jour, par table : identifiant de table -> { nb, total, nom }
  var enCours = {};
  var vues = {};   // commande -> dernier état déjà annoncé (évite de répéter les notifications)

  function totalCommande(c) {
    var total = 0;
    c.commande_lignes.forEach(function (l) {
      var prix = un(l.ligne_prix);
      total += prix ? prix.prix_unitaire * l.quantite : 0;
    });
    return total;
  }


  /* =========================================================
     2. ONGLETS
     ========================================================= */
  function ouvrirOnglet(nom) {
    document.querySelectorAll(".tab").forEach(function (b) {
      var actif = b.getAttribute("data-tab") === nom;
      b.classList.toggle("is-active", actif);
      b.setAttribute("aria-pressed", actif ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) { p.hidden = p.id !== "tab-" + nom; });
    $("cartBar").hidden = nom !== "nouvelle";
    if (nom === "nouvelle") { agir(chargerMenu)(); }
    if (nom === "commandes") { agir(chargerCommandes)(); }
  }

  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirOnglet(b.getAttribute("data-tab")); });
  });


  /* =========================================================
     3. NOUVELLE COMMANDE
     ========================================================= */
  var CATEGORIES = {
    beninois: "Cuisine béninoise", grillades: "Grillades", francais: "Plats français",
    partager: "À partager", desserts: "Desserts", boissons: "Boissons"
  };

  var tables = [];
  var plats = [];
  var tableChoisie = null;
  var panier = {};            // identifiant du plat -> quantité
  var libres = [];            // plats saisis à la main : { nom, prix, quantite }
  var categorie = "all";

  function majPanier() {
    var nb = 0, total = 0;
    libres.forEach(function (l) { nb += l.quantite; total += l.quantite * l.prix; });
    plats.forEach(function (p) {
      var q = panier[p.id] || 0;
      nb += q;
      total += q * p.prix;
    });

    var resume = $("cartResume");
    resume.replaceChildren();
    if (!nb) {
      resume.textContent = "Panier vide";
    } else {
      resume.appendChild(document.createTextNode(nb + (nb > 1 ? " plats · " : " plat · ") + PG.argent(total)));
      resume.appendChild(el("small", { text: tableChoisie ? "Table " + tableChoisie.nom : "Choisissez une table" }));
    }
    $("envoyer").disabled = !nb || !tableChoisie;
  }

  var ZONES = { salle: "Salle", terrasse: "Terrasse", bar: "Bar", vip: "VIP / Salon" };

  function dessinerTables() {
    majBoutonRetirer();
    var boite = $("tablesGrid");
    boite.replaceChildren();
    if (!tables.length) {
      boite.appendChild(el("p", { "class": "vide", text: "Aucune table. Le patron doit en ajouter dans son espace." }));
      return;
    }
    var derniere = null;
    tables.slice().sort(function (a, b) {
      var za = Object.keys(ZONES).indexOf(a.zone), zb = Object.keys(ZONES).indexOf(b.zone);
      return za - zb || a.nom.localeCompare(b.nom, "fr", { numeric: true });
    }).forEach(function (t) {
      if (t.zone !== derniere) { derniere = t.zone; boite.appendChild(el("h3", { "class": "zone-titre", text: ZONES[t.zone] || t.zone })); }
      var bouton = el("button", {
        type: "button",
        "class": "table-btn" + (tableChoisie && tableChoisie.id === t.id ? " is-selected" : ""),
        "aria-pressed": tableChoisie && tableChoisie.id === t.id ? "true" : "false"
      }, [
        el("strong", { text: t.nom }),
        el("span", { text: enCours[t.id] ? enCours[t.id].nb + (enCours[t.id].nb > 1 ? " commandes" : " commande") + " · " + PG.argent(enCours[t.id].total) : "Libre" })
      ]);
      bouton.addEventListener("click", function () { tableChoisie = t; dessinerTables(); majPanier(); });
      boite.appendChild(bouton);
    });
  }

  function majBoutonRetirer() {
    $("retirerTable").hidden = !(tableChoisie && tableChoisie.temporaire && !enCours[tableChoisie.id]);
  }

  // Recharge la liste des tables (après un retrait)
  async function rechargerTables() {
    var r = await sb.from("tables_salle").select("id, nom, places, zone, temporaire").eq("actif", true).order("nom");
    if (r.error) { throw r.error; }
    tables = r.data;
    if (tableChoisie && !tables.some(function (t) { return t.id === tableChoisie.id; })) { tableChoisie = null; }
    dessinerTables();
    majPanier();
  }

  function carteDePlat(p) {
    var qte = el("span", { "class": "qte", text: String(panier[p.id] || 0) });
    var moins = el("button", { type: "button", "class": "step", "aria-label": "Retirer " + p.nom, text: "−" });
    var plus = el("button", { type: "button", "class": "step", "aria-label": "Ajouter " + p.nom, text: "+" });

    var carte = el("div", { "class": "plat-card" + (panier[p.id] ? " is-in" : "") }, [
      el("div", {}, [
        el("p", { "class": "plat-nom", text: p.nom }),
        el("p", { "class": "plat-prix", text: PG.argent(p.prix) })
      ]),
      el("div", { "class": "stepper" }, [moins, qte, plus])
    ]);

    function maj() {
      var n = panier[p.id] || 0;
      qte.textContent = String(n);
      carte.classList.toggle("is-in", n > 0);
      majPanier();
    }
    moins.addEventListener("click", function () {
      if (!panier[p.id]) { return; }
      panier[p.id] -= 1;
      if (panier[p.id] === 0) { delete panier[p.id]; }
      maj();
    });
    plus.addEventListener("click", function () {
      panier[p.id] = Math.min((panier[p.id] || 0) + 1, 50);
      maj();
    });
    return carte;
  }

  function dessinerPlats() {
    var boite = $("menuPlats");
    boite.replaceChildren();

    // Boutons de catégories
    var chips = $("chips");
    chips.replaceChildren();
    var presentes = Object.keys(CATEGORIES).filter(function (c) {
      return plats.some(function (p) { return p.categorie === c; });
    });
    [["all", "Tout"]].concat(presentes.map(function (c) { return [c, CATEGORIES[c]]; })).forEach(function (paire) {
      var b = el("button", { type: "button", "class": "chip", "aria-pressed": categorie === paire[0] ? "true" : "false", text: paire[1] });
      b.addEventListener("click", function () { categorie = paire[0]; dessinerPlats(); });
      chips.appendChild(b);
    });

    var sug = $("suggestions");
    sug.replaceChildren();
    plats.forEach(function (p) { sug.appendChild(el("option", { value: p.nom })); });

    var cherche = norm($("recherchePlat").value);
    var visibles = plats.filter(function (p) {
      return (categorie === "all" || p.categorie === categorie) && (!cherche || norm(p.nom).indexOf(cherche) >= 0);
    });
    if (!visibles.length) {
      boite.appendChild(el("p", { "class": "vide", text: "Aucun plat enregistré ne correspond. Utilisez la saisie ci-dessus." }));
      return;
    }
    visibles.forEach(function (p) { boite.appendChild(carteDePlat(p)); });
  }

  async function chargerMenu() {
    var r = await Promise.all([
      sb.from("tables_salle").select("id, nom, places, zone, temporaire").eq("actif", true).order("nom"),
      sb.from("plats").select("id, nom, categorie, plat_prix(prix)").eq("disponible", true).order("nom")
    ]);
    if (r[0].error) { throw r[0].error; }
    if (r[1].error) { throw r[1].error; }

    tables = r[0].data;
    if (tableChoisie && !tables.some(function (t) { return t.id === tableChoisie.id; })) { tableChoisie = null; }

    // On ne montre que les plats qui ont un prix
    plats = r[1].data.map(function (p) {
      var prix = un(p.plat_prix);
      return { id: p.id, nom: p.nom, categorie: p.categorie, prix: prix ? prix.prix : null };
    }).filter(function (p) { return p.prix !== null; });

    // On retire du panier les plats devenus indisponibles
    Object.keys(panier).forEach(function (id) {
      if (!plats.some(function (p) { return String(p.id) === id; })) { delete panier[id]; }
    });

    dessinerTables();
    dessinerPlats();
    majPanier();
  }

  // Liste des plats saisis à la main (avec bouton pour retirer)
  function dessinerLibres() {
    var ul = $("listeLibres");
    ul.replaceChildren();
    libres.forEach(function (l, i) {
      var retirer = el("button", { type: "button", "class": "step", "aria-label": "Retirer " + l.nom, text: "×" });
      retirer.addEventListener("click", function () { libres.splice(i, 1); dessinerLibres(); majPanier(); });
      ul.appendChild(el("li", { "class": "libre-ligne" }, [
        el("span", { text: l.quantite + " × " + l.nom + " · " + PG.argent(l.prix) }),
        retirer
      ]));
    });
  }

  $("ajouterLibre").addEventListener("click", function () {
    var nom = $("nomLibre").value.trim().replace(/\s+/g, " ");
    var prix = Math.round(Number($("prixLibre").value));
    var qte = Math.round(Number($("qteLibre").value) || 1);
    if (nom.length < 2) { toast("Écrivez le nom du plat.", true); return; }
    if (!$("prixLibre").value || !isFinite(prix) || prix < 0 || prix > 1000000) { toast("Écrivez le prix du plat (en F).", true); return; }
    if (qte < 1 || qte > 50) { toast("Quantité entre 1 et 50.", true); return; }
    libres.push({ nom: nom, prix: prix, quantite: qte });
    $("nomLibre").value = ""; $("prixLibre").value = ""; $("qteLibre").value = "1";
    dessinerLibres();
    majPanier();
    $("nomLibre").focus();
  });

  // Si le nom tapé est un plat enregistré, on propose son prix (modifiable)
  $("nomLibre").addEventListener("input", function () {
    var v = norm(this.value);
    var trouve = plats.filter(function (p) { return norm(p.nom) === v; })[0];
    if (trouve && !$("prixLibre").value) { $("prixLibre").value = String(trouve.prix); }
  });

  // Le serveur écrit le nom d'une table ou d'un client : on la crée (ou on retrouve celle qui existe)
  $("ajouterTable").addEventListener("click", agir(async function () {
    var champ = $("nomNouvelleTable");
    var nom = champ.value.trim().replace(/\s+/g, " ");
    if (!nom) { toast("Écrivez le nom de la table ou du client.", true); return; }

    var table = tables.filter(function (t) { return norm(t.nom) === norm(nom); })[0];
    if (!table) {
      var r = await sb.from("tables_salle").insert({ nom: nom, zone: $("zoneNouvelleTable").value, temporaire: true }).select("id, nom, places, zone, temporaire").single();
      if (r.error) {
        if (/duplicate|unique/i.test(r.error.message || "")) { throw new Error("Ce nom existe déjà mais n'est pas utilisable. Choisissez un autre nom."); }
        throw r.error;
      }
      table = r.data;
      tables.push(table);
    }
    tableChoisie = table;
    champ.value = "";
    dessinerTables();
    majPanier();
  }));
  $("nomNouvelleTable").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("ajouterTable").click(); }
  });
  $("retirerTable").addEventListener("click", agir(async function () {
    if (!tableChoisie || !window.confirm("Retirer la table « " + tableChoisie.nom + " » ? Le nom pourra être réutilisé.")) { return; }
    var r = await sb.rpc("liberer_table", { p_id: tableChoisie.id });
    if (r.error) { throw r.error; }
    toast("Table retirée.");
    await rechargerTables();
  }));
  $("recherchePlat").addEventListener("input", function () { dessinerPlats(); });

  $("envoyer").addEventListener("click", agir(async function () {
    var lignes = Object.keys(panier).map(function (id) { return { plat_id: Number(id), quantite: panier[id] }; });
    if (!tableChoisie) { toast("Choisissez une table.", true); return; }
    libres.forEach(function (l) { lignes.push({ nom: l.nom, prix: l.prix, quantite: l.quantite }); });
    if (!lignes.length) { toast("Le panier est vide.", true); return; }

    var bouton = $("envoyer");
    bouton.disabled = true;
    bouton.textContent = "Envoi...";
    try {
      var r = await sb.rpc("envoyer_commande", {
        p_table_id: tableChoisie.id,
        p_note: $("noteCommande").value.trim(),
        p_lignes: lignes
      });
      if (r.error) { throw r.error; }

      toast("Commande envoyée à la cuisine (table " + tableChoisie.nom + ").");
      panier = {};
      libres = [];
      dessinerLibres();
      $("noteCommande").value = "";
      dessinerPlats();
      majPanier();
      await chargerCommandes();
    } finally {
      bouton.textContent = "Envoyer à la cuisine";
      majPanier();
    }
  }));


  /* =========================================================
     4. MES COMMANDES
     ========================================================= */
  var STATUTS = { envoyee: "Envoyée", en_preparation: "En préparation", prete: "Prête", servie: "Servie", annulee: "Annulée" };
  var MODES = { especes: "Espèces", mobile_money: "Mobile Money", carte: "Carte" };

  async function changer(id, valeurs) {
    var r = await sb.from("commandes").update(valeurs).eq("id", id);
    if (r.error) { throw r.error; }
    await chargerCommandes();
  }

  // NOTE DE TABLE : toutes les commandes non payées d'une table, réunies avec un seul total
  function dessinerNotes(boite, data) {
    var groupes = {};
    data.slice().reverse().forEach(function (c) {
      if (c.paye || c.statut === "annulee") { return; }
      (groupes[c.table_id] = groupes[c.table_id] || []).push(c);
    });
    var ids = Object.keys(groupes);
    if (!ids.length) { return; }
    boite.appendChild(el("h2", { "class": "step-title", text: "Notes de table à encaisser" }));

    ids.forEach(function (tid) {
      var cmds = groupes[tid];
      var t = un(cmds[0].tables_salle);
      var fusion = {}, ordre = [], total = 0;
      cmds.forEach(function (c) {
        c.commande_lignes.forEach(function (l) {
          var pr = un(l.ligne_prix), unit = pr ? pr.prix_unitaire : 0;
          var plat = un(l.plats), nom = l.nom_libre || (plat ? plat.nom : "Plat");
          var cle = nom.toLowerCase() + "|" + unit;   // même plat au même prix = regroupé ; autre prix = ligne séparée
          if (!fusion[cle]) { fusion[cle] = { nom: nom, unit: unit, q: 0 }; ordre.push(cle); }
          fusion[cle].q += l.quantite;
          total += unit * l.quantite;
        });
      });

      var lignes = ordre.map(function (cle) {
        var f = fusion[cle];
        return el("li", {}, [
          el("span", {}, [document.createTextNode(f.q + " × " + f.nom), el("small", { text: " · " + PG.argent(f.unit) + " l'unité" })]),
          el("span", { text: PG.argent(f.q * f.unit) })
        ]);
      });

      var choix = el("select", { "aria-label": "Mode de paiement" }, Object.keys(MODES).map(function (m) { return el("option", { value: m, text: MODES[m] }); }));
      var encaisser = el("button", { type: "button", "class": "btn btn-primary", text: "Encaisser toute la table" });
      encaisser.addEventListener("click", agir(async function () {
        var pasServies = cmds.filter(function (c) { return c.statut !== "servie"; }).length;
        var msg = "Encaisser " + PG.argent(total) + " pour « " + (t ? t.nom : "la table") + " » (" + MODES[choix.value] + ") ?" +
          (pasServies ? "\n\nAttention : " + pasServies + " commande(s) pas encore marquée(s) servie(s)." : "");
        if (!window.confirm(msg)) { return; }
        var r = await sb.from("commandes").update({ paye: true, mode_paiement: choix.value }).in("id", cmds.map(function (c) { return c.id; }));
        if (r.error) { throw r.error; }
        var fixe = t && tables.filter(function (x) { return String(x.id) === tid; })[0];
        if (fixe && fixe.temporaire) { await sb.rpc("liberer_table", { p_id: Number(tid) }); }   // la table redevient vierge
        toast("Table encaissée.");
        await rechargerTables();
        await chargerCommandes();
      }));

      boite.appendChild(el("article", { "class": "note-table" }, [
        el("h3", { text: "Table " + (t ? t.nom : "?") }),
        el("p", { "class": "order-time", text: cmds.length + (cmds.length > 1 ? " commandes réunies" : " commande") }),
        el("ul", {}, lignes),
        el("p", { "class": "note-total", text: "TOTAL DE LA TABLE : " + PG.argent(total) }),
        el("div", { "class": "order-actions" }, [choix, encaisser])
      ]));
    });
    boite.appendChild(el("h2", { "class": "step-title", text: "Détail des commandes (suivi et cloche)" }));
  }

  function carteCommande(c) {
    var total = 0;
    var lignes = c.commande_lignes.map(function (l) {
      var prix = un(l.ligne_prix);
      var montant = prix ? prix.prix_unitaire * l.quantite : 0;
      total += montant;
      var plat = un(l.plats);
      return el("li", {}, [
        el("span", {}, [document.createTextNode(l.quantite + " × " + (l.nom_libre || (plat ? plat.nom : "Plat"))), el("small", { text: " · " + PG.argent(prix ? prix.prix_unitaire : 0) + " l'unité" })]),
        el("span", { text: PG.argent(montant) })
      ]);
    });

    var table = un(c.tables_salle);
    var entete = el("div", { "class": "order-head" }, [
      el("div", {}, [
        el("p", { "class": "order-title", text: "Table " + (table ? table.nom : "?") }),
        el("p", { "class": "order-time", text: PG.heure(c.created_at) + (c.relances ? " · relancée " + c.relances + " fois" : "") + (c.statut === "en_preparation" && c.pris_par_nom ? " · pris par " + c.pris_par_nom : "") + ((c.statut === "prete" || c.statut === "servie") && (c.prete_par_nom || c.pris_par_nom) ? " · préparée par " + (c.prete_par_nom || c.pris_par_nom) : "") + (c.paye ? " · payée (" + (MODES[c.mode_paiement] || "") + ")" : "") })
      ]),
      el("span", { "class": "st st-" + c.statut, text: STATUTS[c.statut] || c.statut })
    ]);

    var actions = el("div", { "class": "order-actions" });

    if (c.statut === "envoyee") {
      var annuler = el("button", { type: "button", "class": "btn btn-danger btn-small", text: "Annuler" });
      annuler.addEventListener("click", agir(async function () {
        if (window.confirm("Annuler cette commande ?")) { await changer(c.id, { statut: "annulee" }); }
      }));
      actions.appendChild(annuler);
    }

    // La cloche : relancer la cuisine quand une commande tarde
    if (c.statut === "envoyee" || c.statut === "en_preparation") {
      var cloche = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: "🔔 Relancer la cuisine" });
      cloche.addEventListener("click", agir(async function () {
        var r = await sb.rpc("relancer_commande", { p_id: c.id });
        if (r.error) { throw r.error; }
        toast("La cuisine a été relancée (table " + (table ? table.nom : "?") + ").");
        await chargerCommandes();
      }));
      actions.appendChild(cloche);
    }

    if (c.statut === "prete") {
      var servie = el("button", { type: "button", "class": "btn btn-primary btn-small", text: "Marquer servie" });
      servie.addEventListener("click", agir(function () { return changer(c.id, { statut: "servie" }); }));
      actions.appendChild(servie);
    }

    if (!c.paye && c.statut !== "annulee") {
      var choix = el("select", { "aria-label": "Mode de paiement" }, Object.keys(MODES).map(function (m) {
        return el("option", { value: m, text: MODES[m] });
      }));
      var encaisser = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: "Encaisser" });
      encaisser.addEventListener("click", agir(function () { return changer(c.id, { paye: true, mode_paiement: choix.value }); }));
      actions.appendChild(choix);
      actions.appendChild(encaisser);
    }

    var carte = el("div", { "class": "order" }, [entete, el("ul", {}, lignes)]);
    if (c.note) { carte.appendChild(el("p", { "class": "order-note", text: "Note : " + c.note })); }
    carte.appendChild(el("p", { "class": "order-total", text: "Total : " + PG.argent(total) }));
    carte.appendChild(actions);
    return carte;
  }

  async function chargerCommandes() {
    var debut = dateBenin() + "T00:00:00+01:00";   // minuit au Bénin
    var r = await sb.from("commandes")
      .select("id, table_id, relances, statut, note, paye, mode_paiement, created_at, pris_par_nom, prete_par_nom, tables_salle(nom, zone), commande_lignes(quantite, nom_libre, plats(nom), ligne_prix(prix_unitaire))")
      .gte("created_at", debut)
      .order("created_at", { ascending: false });
    if (r.error) { throw r.error; }

    r.data.forEach(function (c) { if (c.statut === "prete" || c.statut === "servie") { vues[c.id] = "prete"; } });

    // Total à encaisser par table (commandes non payées et non annulées)
    enCours = {};
    r.data.forEach(function (c) {
      if (c.paye || c.statut === "annulee") { return; }
      var t = un(c.tables_salle);
      var e = enCours[c.table_id] || (enCours[c.table_id] = { nb: 0, total: 0, nom: t ? t.nom : "?" });
      e.nb += 1;
      e.total += totalCommande(c);
    });
    dessinerTables();

    var boite = $("listeCommandes");
    boite.replaceChildren();
    dessinerNotes(boite, r.data);
    if (!r.data.length) {
      boite.appendChild(el("p", { "class": "vide", text: "Aucune commande aujourd’hui pour l’instant." }));
    }
    r.data.forEach(function (c) { boite.appendChild(carteCommande(c)); });

    // Pastille : nombre de commandes prêtes à servir
    var pretes = r.data.filter(function (c) { return c.statut === "prete"; }).length;
    var pastille = $("compteur");
    pastille.textContent = String(pretes);
    pastille.hidden = pretes === 0;
  }


  /* =========================================================
     5. TEMPS RÉEL ET DÉMARRAGE
     ========================================================= */
  try {
    var attente = null;
    sb.channel("serveur-commandes")
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, function (payload) {
        var n = payload.new || {};
        if (payload.eventType === "UPDATE" && n.serveur_id === moi.id) {
          if (n.statut === "en_preparation" && n.pris_par_nom && vues[n.id] !== "pris:" + n.pris_par_nom) {
            vues[n.id] = "pris:" + n.pris_par_nom;
            toast(n.pris_par_nom + " a pris votre commande.");
          } else if (n.statut === "prete" && vues[n.id] !== "prete") {
            vues[n.id] = "prete";
            bip();
            toast("Commande prête, préparée par " + (n.prete_par_nom || n.pris_par_nom || "la cuisine") + ".");
          }
        }
        clearTimeout(attente);
        attente = setTimeout(function () { agir(chargerCommandes)(); }, 500);
      })
      .subscribe();
  } catch (e) {
    console.warn("Temps réel indisponible :", e);
  }
   // ===== RÉSERVATIONS (code commun : reservations-equipe.js) =====
  PGResa.monter({ liste: "listeResa", compteur: "compteurResa", toast: toast, bip: bip });
  dessinerLibres();
  ouvrirOnglet("nouvelle");
  agir(chargerCommandes)();   // pour afficher la pastille dès le début
})();
