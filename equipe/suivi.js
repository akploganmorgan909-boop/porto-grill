/* =========================================================
   PORTO GRILL - Espace patron : bloc « Suivi »
   Trois parties dans un seul onglet :
     1. Statistiques (par mois, par serveur, plats) + export Excel
     2. Qui a fait quoi en cuisine (traçabilité des commandes)
     3. Journal d'activité (prix, plats, comptes, caisse, annulations)
   Les chiffres viennent de vues protégées dans la base (etape-suivi.sql) :
   seuls le patron et le super admin y ont accès.
   ========================================================= */
(function () {
  "use strict";

  var sb = window.PG && PG.sb;
  var boite = document.getElementById("suiviContenu");
  if (!sb || !boite) { return; }

  /* ---------- Outils ---------- */
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
    var t = document.getElementById("toast");
    if (!t) { return; }
    t.textContent = texte;
    t.className = "toast" + (erreur ? " is-error" : "");
    t.hidden = false;
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { t.hidden = true; }, 4500);
  }

  function messageErreur(err) {
    var t = String((err && err.message) || "");
    if (/stats_|journal_activite|tracabilite_commandes|schema cache|does not exist|could not find/i.test(t)) {
      return "Le suivi n'est pas encore installé. Exécutez etape-tracabilite.sql puis etape-suivi.sql dans Supabase.";
    }
    return PG.erreur(err);
  }

  function dateBenin() {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }

  function decalerMois(mois, n) {
    var d = new Date(mois + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  function nomMois(mois) {
    var t = new Date(mois + "T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function dateHeure(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Porto-Novo" }) + " · " + PG.heure(iso);
  }

  function minutesEntre(a, b) {
    return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  }

  // Lit toutes les lignes d'une vue, page par page (la base en renvoie 1000 à la fois)
  async function lireTout(construire) {
    var tout = [], pas = 1000;
    for (var i = 0; i < 30; i++) {
      var r = await construire().range(i * pas, (i + 1) * pas - 1);
      if (r.error) { throw r.error; }
      tout = tout.concat(r.data);
      if (r.data.length < pas) { break; }
    }
    return tout;
  }

  function agir(fonction) {
    return async function (e) {
      try { await fonction(e); }
      catch (err) { toast(messageErreur(err), true); }
    };
  }

  /* ---------- Squelette : sous-onglets ---------- */
  var SOUS = [["stats", "📊 Statistiques"], ["cuisine", "👨‍🍳 Qui a fait quoi"], ["journal", "📝 Journal d’activité"]];
  var sousActif = "stats";

  var barre = el("div", { "class": "suivi-onglets", role: "group", "aria-label": "Parties du suivi" });
  var zones = {};
  SOUS.forEach(function (s) {
    var b = el("button", { type: "button", "class": "btn btn-ghost btn-small", "aria-pressed": s[0] === sousActif ? "true" : "false", text: s[1] });
    b.dataset.sous = s[0];
    b.addEventListener("click", function () { ouvrirSous(s[0]); });
    barre.appendChild(b);
    zones[s[0]] = el("div", { "class": "suivi-zone", id: "suivi-" + s[0] });
  });
  boite.appendChild(barre);
  SOUS.forEach(function (s) { boite.appendChild(zones[s[0]]); });

  function ouvrirSous(nom) {
    sousActif = nom;
    barre.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.sous === nom ? "true" : "false"); });
    SOUS.forEach(function (s) { zones[s[0]].hidden = s[0] !== nom; });
    if (nom === "stats") { agir(chargerStats)(); }
    if (nom === "cuisine") { agir(chargerCuisine)(); }
    if (nom === "journal") { agir(chargerJournal)(); }
  }

  /* =========================================================
     1. STATISTIQUES
     ========================================================= */
  var periodeChoisie = "m0";
  var derniereStats = null;   // gardé pour l'export

  function periodes() {
    var cur = dateBenin().slice(0, 7) + "-01";
    return [
      { id: "m0", label: nomMois(cur), debut: cur, fin: cur },
      { id: "m1", label: nomMois(decalerMois(cur, -1)), debut: decalerMois(cur, -1), fin: decalerMois(cur, -1) },
      { id: "m2", label: nomMois(decalerMois(cur, -2)), debut: decalerMois(cur, -2), fin: decalerMois(cur, -2) },
      { id: "t3", label: "3 derniers mois", debut: decalerMois(cur, -2), fin: cur },
      { id: "t12", label: "12 derniers mois", debut: decalerMois(cur, -11), fin: cur }
    ];
  }

  function carteKpi(label, valeur) {
    return el("div", { "class": "kpi" }, [el("p", { "class": "kpi-label", text: label }), el("p", { "class": "kpi-value", text: valeur })]);
  }

  function ligneBarre(nom, detail, valeur, max) {
    var pct = max > 0 ? Math.max(2, Math.round((valeur / max) * 100)) : 0;
    var barreEl = el("span", { "class": "suivi-barre-remplie" });
    barreEl.style.width = pct + "%";
    return el("li", { "class": "suivi-ligne" }, [
      el("div", { "class": "suivi-ligne-texte" }, [el("strong", { text: nom }), el("span", { text: detail })]),
      el("span", { "class": "suivi-barre" }, [barreEl])
    ]);
  }

  async function chargerStats() {
    var zone = zones.stats;
    var liste = periodes();
    var p = liste.filter(function (x) { return x.id === periodeChoisie; })[0] || liste[0];

    var choix = el("select", { "aria-label": "Période" }, liste.map(function (x) {
      var o = el("option", { value: x.id, text: x.label });
      if (x.id === p.id) { o.selected = true; }
      return o;
    }));
    choix.addEventListener("change", function () { periodeChoisie = choix.value; agir(chargerStats)(); });
    var exporter = el("button", { type: "button", "class": "btn btn-primary btn-small", text: "⬇ Exporter pour Excel" });
    exporter.addEventListener("click", agir(async function () { exporterCsv(p); }));
    var barreOutils = el("div", { "class": "suivi-outils" }, [
      el("label", { text: "Période " }, [choix]), exporter
    ]);

    var r = await Promise.all([
      lireTout(function () { return sb.from("stats_mensuel").select("mois, nb_commandes, total").gte("mois", p.debut).lte("mois", p.fin).order("mois"); }),
      lireTout(function () { return sb.from("stats_serveurs").select("mois, serveur, nb_commandes, total").gte("mois", p.debut).lte("mois", p.fin); }),
      lireTout(function () { return sb.from("stats_plats").select("mois, plat, categorie, quantite, montant").gte("mois", p.debut).lte("mois", p.fin); }),
      sb.from("plats").select("nom, categorie").eq("disponible", true)
    ]);
    if (r[3].error) { throw r[3].error; }
    var parMois = r[0], parServeurLignes = r[1], parPlatLignes = r[2], catalogue = r[3].data || [];

    // Total par serveur sur la période
    var serveurs = {};
    parServeurLignes.forEach(function (x) {
      var s = serveurs[x.serveur] || (serveurs[x.serveur] = { nom: x.serveur, nb: 0, total: 0 });
      s.nb += x.nb_commandes; s.total += Number(x.total);
    });
    var tabServeurs = Object.keys(serveurs).map(function (k) { return serveurs[k]; }).sort(function (a, b) { return b.total - a.total; });

    // Quantités par plat sur la période
    var plats = {};
    parPlatLignes.forEach(function (x) {
      var s = plats[x.plat] || (plats[x.plat] = { nom: x.plat, categorie: x.categorie, quantite: 0, montant: 0 });
      s.quantite += Number(x.quantite); s.montant += Number(x.montant);
    });
    var tabPlats = Object.keys(plats).map(function (k) { return plats[k]; }).sort(function (a, b) { return b.quantite - a.quantite; });

    // Les moins vendus : tous les plats en vente, y compris ceux jamais commandés
    var moins = catalogue.map(function (c) { return { nom: c.nom, quantite: plats[c.nom] ? plats[c.nom].quantite : 0 }; })
      .sort(function (a, b) { return a.quantite - b.quantite || a.nom.localeCompare(b.nom, "fr"); }).slice(0, 10);

    var total = parMois.reduce(function (s, x) { return s + Number(x.total); }, 0);
    var nbCmd = parMois.reduce(function (s, x) { return s + x.nb_commandes; }, 0);

    derniereStats = { periode: p, parMois: parMois, serveurs: tabServeurs, plats: tabPlats, moins: moins };

    zone.replaceChildren(barreOutils);
    zone.appendChild(el("div", { "class": "kpis" }, [
      carteKpi("Ventes (" + p.label.toLowerCase() + ")", PG.argent(total)),
      carteKpi("Commandes", String(nbCmd)),
      carteKpi("Panier moyen", PG.argent(nbCmd ? Math.round(total / nbCmd) : 0)),
      carteKpi("Serveurs actifs", String(tabServeurs.length))
    ]));

    if (!nbCmd) {
      zone.appendChild(el("p", { "class": "vide", text: "Aucune vente sur cette période." }));
    }

    if (parMois.length > 1) {
      var maxMois = Math.max.apply(null, parMois.map(function (x) { return Number(x.total); }).concat([1]));
      zone.appendChild(el("div", { "class": "card suivi-carte" }, [
        el("h2", { text: "Ventes par mois" }),
        el("ul", { "class": "suivi-liste" }, parMois.map(function (x) {
          return ligneBarre(nomMois(x.mois), PG.argent(x.total) + " · " + x.nb_commandes + " commandes", Number(x.total), maxMois);
        }))
      ]));
    }

    var maxServ = tabServeurs.length ? tabServeurs[0].total : 0;
    zone.appendChild(el("div", { "class": "card suivi-carte" }, [
      el("h2", { text: "Ventes par serveur" }),
      tabServeurs.length
        ? el("ul", { "class": "suivi-liste" }, tabServeurs.map(function (s) {
            return ligneBarre(s.nom, PG.argent(s.total) + " · " + s.nb + " commandes · panier moyen " + PG.argent(s.nb ? Math.round(s.total / s.nb) : 0), s.total, maxServ);
          }))
        : el("p", { "class": "vide", text: "Pas de vente sur cette période." })
    ]));

    var haut = tabPlats.slice(0, 5);
    var maxPlat = haut.length ? haut[0].quantite : 0;
    zone.appendChild(el("div", { "class": "grid-2" }, [
      el("div", { "class": "card suivi-carte" }, [
        el("h2", { text: "Plats les plus vendus" }),
        haut.length
          ? el("ul", { "class": "suivi-liste" }, haut.map(function (x) { return ligneBarre(x.nom, x.quantite + " vendus · " + PG.argent(x.montant), x.quantite, maxPlat); }))
          : el("p", { "class": "vide", text: "Aucune vente." })
      ]),
      el("div", { "class": "card suivi-carte" }, [
        el("h2", { text: "Plats les moins vendus" }),
        el("p", { "class": "intro", text: "Parmi les plats en vente. Ceux à 0 ne sont jamais commandés : à retirer ou à mettre en avant ?" }),
        el("ul", { "class": "suivi-liste suivi-liste-simple" }, moins.map(function (x) {
          return el("li", { "class": x.quantite === 0 ? "suivi-zero" : "" }, [el("span", { text: x.nom }), el("strong", { text: x.quantite + (x.quantite > 1 ? " vendus" : " vendu") })]);
        }))
      ])
    ]));
  }

  /* ---------- Export CSV (s'ouvre dans Excel) ---------- */
  function cellule(v) {
    var t = String(v === null || v === undefined ? "" : v);
    // Protège contre les « formules » : un nom de plat saisi à la main ne doit jamais s'exécuter dans Excel
    if (/^[=+\-@\t\r]/.test(t)) { t = "'" + t; }
    return '"' + t.replace(/"/g, '""') + '"';
  }

  function exporterCsv(p) {
    if (!derniereStats) { toast("Rien à exporter pour l'instant.", true); return; }
    var d = derniereStats, lignes = [];
    function ligne(tab) { lignes.push(tab.map(cellule).join(";")); }

    ligne(["Porto Grill", "Période : " + p.label]); lignes.push("");
    ligne(["VENTES PAR MOIS"]); ligne(["Mois", "Commandes", "Ventes (F)"]);
    d.parMois.forEach(function (x) { ligne([nomMois(x.mois), x.nb_commandes, x.total]); });
    lignes.push("");
    ligne(["VENTES PAR SERVEUR"]); ligne(["Serveur", "Commandes", "Ventes (F)"]);
    d.serveurs.forEach(function (s) { ligne([s.nom, s.nb, s.total]); });
    lignes.push("");
    ligne(["PLATS VENDUS"]); ligne(["Plat", "Quantité", "Montant (F)"]);
    d.plats.forEach(function (x) { ligne([x.nom, x.quantite, x.montant]); });
    lignes.push("");
    ligne(["PLATS LES MOINS VENDUS"]); ligne(["Plat", "Quantité"]);
    d.moins.forEach(function (x) { ligne([x.nom, x.quantite]); });

    var blob = new Blob(["\uFEFF" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: "porto-grill-stats-" + p.debut.slice(0, 7) + (p.debut === p.fin ? "" : "-a-" + p.fin.slice(0, 7)) + ".csv" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("Fichier prêt : ouvrez-le avec Excel.");
  }

  /* =========================================================
     2. QUI A FAIT QUOI EN CUISINE
     ========================================================= */
  var jourCuisine = dateBenin();
  var STATUTS = { envoyee: "Envoyée", en_preparation: "En préparation", prete: "Prête", servie: "Servie", annulee: "Annulée" };

  async function chargerCuisine() {
    var zone = zones.cuisine;
    var champ = el("input", { type: "date", value: jourCuisine, "aria-label": "Jour" });
    champ.addEventListener("change", function () { if (champ.value) { jourCuisine = champ.value; agir(chargerCuisine)(); } });
    var suivant = new Date(new Date(jourCuisine + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10);

    var r = await sb.from("tracabilite_commandes")
      .select("id, table_nom, statut, serveur_nom, envoyee_a, cuisinier_prise, pris_a, cuisinier_prete, prete_a")
      .gte("envoyee_a", jourCuisine + "T00:00:00+01:00")
      .lt("envoyee_a", suivant + "T00:00:00+01:00")
      .order("envoyee_a", { ascending: false })
      .limit(300);
    if (r.error) { throw r.error; }

    zone.replaceChildren(el("div", { "class": "suivi-outils" }, [el("label", { text: "Jour " }, [champ])]));
    zone.appendChild(el("p", { "class": "intro", text: "Pour chaque commande : quel serveur l'a envoyée, quel cuisinier l'a prise et terminée, et le temps que ça a pris. Utile si un plat est mal préparé." }));

    if (!r.data.length) { zone.appendChild(el("p", { "class": "vide", text: "Aucune commande ce jour-là." })); return; }

    var liste = el("div", { "class": "suivi-cartes" });
    r.data.forEach(function (c) {
      var lignes = [
        el("p", { text: "Envoyée à " + PG.heure(c.envoyee_a) + " par " + (c.serveur_nom || "?") })
      ];
      lignes.push(el("p", { text: c.cuisinier_prise ? "Prise à " + PG.heure(c.pris_a) + " par " + c.cuisinier_prise : "Pas encore prise par un cuisinier" }));
      if (c.prete_a) {
        var duree = c.pris_a ? " · préparée en " + minutesEntre(c.pris_a, c.prete_a) + " min" : "";
        lignes.push(el("p", { text: "Prête à " + PG.heure(c.prete_a) + " par " + (c.cuisinier_prete || "?") + duree + " · attente totale " + minutesEntre(c.envoyee_a, c.prete_a) + " min" }));
      }
      liste.appendChild(el("article", { "class": "card suivi-trace" }, [
        el("h3", { text: "Table " + (c.table_nom || "?") }),
        el("span", { "class": "st st-" + c.statut, text: STATUTS[c.statut] || c.statut })
      ].concat(lignes)));
    });
    zone.appendChild(liste);
  }

  /* =========================================================
     3. JOURNAL D'ACTIVITÉ
     ========================================================= */
  var filtreJournal = "tout";
  var FILTRES = [
    ["tout", "Tout", null],
    ["prix", "Prix", /prix/i],
    ["plats", "Plats", /^plat\b/i],
    ["comptes", "Comptes", /compte/i],
    ["caisse", "Caisse", /caisse/i],
    ["commandes", "Commandes annulées", /commande/i],
    ["depenses", "Dépenses", /dépense/i]
  ];

  async function chargerJournal() {
    var zone = zones.journal;
    var r = await sb.from("journal_activite").select("id, created_at, acteur_nom, action, detail").order("created_at", { ascending: false }).limit(300);
    if (r.error) { throw r.error; }

    var choix = el("select", { "aria-label": "Type d'événement" }, FILTRES.map(function (f) {
      var o = el("option", { value: f[0], text: f[1] });
      if (f[0] === filtreJournal) { o.selected = true; }
      return o;
    }));
    var recherche = el("input", { type: "search", placeholder: "Chercher (nom, plat…)", "aria-label": "Chercher dans le journal" });

    var liste = el("div", { "class": "suivi-journal" });
    function dessiner() {
      var f = FILTRES.filter(function (x) { return x[0] === choix.value; })[0];
      var mot = recherche.value.trim().toLowerCase();
      liste.replaceChildren();
      var n = 0;
      r.data.forEach(function (x) {
        if (f[2] && !f[2].test(x.action)) { return; }
        if (mot && (x.action + " " + (x.detail || "") + " " + (x.acteur_nom || "")).toLowerCase().indexOf(mot) < 0) { return; }
        n += 1;
        liste.appendChild(el("div", { "class": "suivi-evt" }, [
          el("p", { "class": "suivi-evt-date", text: dateHeure(x.created_at) }),
          el("p", { "class": "suivi-evt-action", text: x.action }),
          el("p", { "class": "suivi-evt-detail", text: (x.detail || "") + (x.acteur_nom ? " — par " + x.acteur_nom : "") })
        ]));
      });
      if (!n) { liste.appendChild(el("p", { "class": "vide", text: r.data.length ? "Aucun événement ne correspond." : "Le journal est vide : il se remplit à partir de maintenant." })); }
    }
    choix.addEventListener("change", function () { filtreJournal = choix.value; dessiner(); });
    recherche.addEventListener("input", dessiner);

    zone.replaceChildren(el("div", { "class": "suivi-outils" }, [el("label", { text: "Type " }, [choix]), recherche]));
    zone.appendChild(el("p", { "class": "intro", text: "Qui a changé un prix, supprimé un plat, bloqué un compte, annulé une commande ou clôturé la caisse, et à quelle heure. Les 300 derniers événements. Ce journal ne peut être ni modifié ni effacé depuis l'application." }));
    zone.appendChild(liste);
    dessiner();
  }

  /* ---------- Démarrage : au clic sur l'onglet « Suivi » ---------- */
  var tabBouton = document.querySelector('.tab[data-tab="suivi"]');
  if (tabBouton) { tabBouton.addEventListener("click", function () { ouvrirSous(sousActif); }); }
  SOUS.forEach(function (s) { zones[s[0]].hidden = s[0] !== sousActif; });
})();
