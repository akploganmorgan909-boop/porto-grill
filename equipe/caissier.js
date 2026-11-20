/* =========================================================
   PORTO GRILL - Espace caisse
   1. Départ et outils   2. Chargement de la journée
   3. Point de caisse    4. Transactions   5. Temps réel
   Le caissier LIT tout, ne modifie aucune commande. Il clôture des points.
   ========================================================= */
(async function () {
  "use strict";

  /* ---------- 1. DÉPART ET OUTILS ---------- */
  var sb = PG.sb;
  var moi = await PG.exiger(["caissier", "patron"]);
  if (!moi) { return; }
  var $ = function (id) { return document.getElementById(id); };
  $("userName").textContent = moi.nom;
  $("logout").addEventListener("click", PG.deconnexion);

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
  var minuteurToast = null;
  function toast(texte, erreur) {
    var t = $("toast");
    t.textContent = erreur ? texte + " (touchez ce message pour le fermer)" : texte;
    t.className = "toast" + (erreur ? " is-error" : "");
    t.hidden = false;
    clearTimeout(minuteurToast);
    if (erreur) { t.onclick = function () { t.hidden = true; }; }
    else { t.onclick = null; minuteurToast = setTimeout(function () { t.hidden = true; }, 4500); }
  }
  function messageErreur(err) {
    var t = String((err && err.message) || "");
    if (/journees/i.test(t) && /duplicate|unique/i.test(t)) { return "Cette journée est déjà clôturée."; }
    if (/duplicate|unique/i.test(t)) { return "Ce point est déjà clôturé : il ne peut plus être modifié."; }
    if (/cloturer_journee/i.test(t) && /could not find|not found/i.test(t)) { return "Le script etape-8-cloture-journee.sql n'est pas encore exécuté dans Supabase."; }
    if (/cloturer_point/i.test(t) && /could not find|not found/i.test(t)) { return "Le script etape-7-caissier.sql n'est pas encore exécuté dans Supabase."; }
    return PG.erreur(err);
  }
  function agir(f) { return async function (e) { try { await f(e); } catch (err) { toast(messageErreur(err), true); } }; }
  function un(x) { return Array.isArray(x) ? x[0] : x; }

  // Horaires de service : EXEMPLE (10 h à 3 h du matin), à confirmer avec le restaurant.
  // Ils servent seulement à rappeler au caissier de clôturer. Rien ne se ferme tout seul.
  var SERVICE = { ouverture: 10, fermeture: 3 };

  var MODES = { especes: "Espèces", mobile_money: "Mobile Money", carte: "Carte" };
  var ordreModes = ["especes", "mobile_money", "carte"];

  // Journée de service : de 6 h à 6 h (heure du Bénin, UTC+1)
  function jourDeService(maintenant) {
    var d = new Date(maintenant.getTime() + 3600000 - 6 * 3600000);   // UTC+1 puis -6 h
    return d.toISOString().slice(0, 10);
  }
  function plusUnJour(jour) { return new Date(new Date(jour + "T00:00:00Z").getTime() + 86400000).toISOString().slice(0, 10); }

  function totalCommande(c) {
    return c.commande_lignes.reduce(function (t, l) {
      var p = un(l.ligne_prix);
      return t + (p ? p.prix_unitaire * l.quantite : 0);
    }, 0);
  }

  function ouvrirOnglet(nom) {
    document.querySelectorAll(".tab").forEach(function (b) {
      var a = b.dataset.tab === nom;
      b.classList.toggle("is-active", a);
      b.setAttribute("aria-pressed", String(a));
    });
    $("tab-point").hidden = nom !== "point";
    $("tab-transactions").hidden = nom !== "transactions";
         if ($("tab-reservations")) { $("tab-reservations").hidden = nom !== "reservations"; }
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirOnglet(b.dataset.tab); });
  });

  /* ---------- 2. CHARGEMENT DE LA JOURNÉE ---------- */
  var commandes = [], noms = {}, clotures = {}, journee = null;

  async function charger() {
    var jour = $("jour").value;
    var debut = jour + "T06:00:00+01:00";
    var fin = plusUnJour(jour) + "T06:00:00+01:00";
    $("jourAide").textContent = "De 6 h le " + jour + " à 6 h le lendemain. Service prévu : " + SERVICE.ouverture + " h à " + SERVICE.fermeture + " h (exemple).";

    var r = await sb.from("commandes")
      .select("id, serveur_id, statut, paye, mode_paiement, created_at, tables_salle(nom, zone), commande_lignes(quantite, nom_libre, plats(nom), ligne_prix(prix_unitaire))")
      .gte("created_at", debut).lt("created_at", fin).order("created_at", { ascending: false });
    if (r.error) { throw r.error; }
    commandes = r.data;

    var p = await sb.from("profiles").select("id, nom");
    if (p.error) { throw p.error; }
    noms = {};
    p.data.forEach(function (x) { noms[x.id] = x.nom; });

    var c = await sb.from("clotures").select("serveur_id, mode_paiement, attendu, compte, ecart").eq("jour", jour);
    if (c.error) { throw c.error; }
    clotures = {};
    c.data.forEach(function (x) { clotures[x.serveur_id + "|" + x.mode_paiement] = x; });

    var j = await sb.from("journees").select("jour, ferme_le, caissier_id, encaisse, points_manquants, ecart_total").eq("jour", jour).maybeSingle();
    journee = j.error ? null : j.data;
    if (j.error) { toast("La clôture de journée n'est pas encore installée : exécutez etape-8-cloture-journee.sql dans Supabase. Le reste de la page fonctionne.", true); }

    dessinerPoint();
    dessinerTransactions();
    dessinerFinJournee();
  }

  /* ---------- 3. POINT DE CAISSE ---------- */
  function kpi(titre, valeur, couleur) {
    return el("div", { "class": "kpi " + couleur }, [el("p", { "class": "k-titre", text: titre }), el("p", { "class": "k-val", text: valeur })]);
  }

  function dessinerPoint() {
    var valides = commandes.filter(function (c) { return c.statut !== "annulee"; });
    var payees = valides.filter(function (c) { return c.paye; });
    var impayees = valides.filter(function (c) { return !c.paye; });
    var somme = function (liste) { return liste.reduce(function (t, c) { return t + totalCommande(c); }, 0); };

    var k = $("kpis");
    k.replaceChildren(
      kpi("Encaissé", PG.argent(somme(payees)), "k-vert"),
      kpi("Pas encore encaissé", PG.argent(somme(impayees)), "k-cuivre"),
      kpi("Commandes", String(valides.length), ""),
      kpi("Annulées", String(commandes.length - valides.length), "k-rouge")
    );
    ordreModes.forEach(function (m) {
      var s = somme(payees.filter(function (c) { return c.mode_paiement === m; }));
      if (s) { k.appendChild(kpi(MODES[m], PG.argent(s), "k-vert")); }
    });

    // Une carte par serveur
    var ids = [];
    valides.forEach(function (c) { if (ids.indexOf(c.serveur_id) < 0) { ids.push(c.serveur_id); } });
    var boite = $("serveurs");
    boite.replaceChildren();
    if (!ids.length) { boite.appendChild(el("p", { "class": "vide", text: "Aucune commande pour cette journée." })); }

    ids.forEach(function (sid) {
      var siennes = valides.filter(function (c) { return c.serveur_id === sid; });
      var carte = el("article", { "class": "serveur-carte" }, [el("h3", { text: noms[sid] || "Serveur" })]);
      var nonPayees = siennes.filter(function (c) { return !c.paye; });
      if (nonPayees.length) {
        carte.appendChild(el("p", { "class": "serveur-alerte", text: "⚠ " + nonPayees.length + " commande(s) non encaissée(s) : " + PG.argent(somme(nonPayees)) }));
      }
      ordreModes.forEach(function (m) {
        var attendu = somme(siennes.filter(function (c) { return c.paye && c.mode_paiement === m; }));
        if (!attendu) { return; }
        var ligne = el("div", { "class": "mode-ligne" }, [
          el("span", { "class": "m-nom", text: MODES[m] }),
          el("span", { "class": "m-attendu", text: PG.argent(attendu) })
        ]);
        var deja = clotures[sid + "|" + m];
        if (deja) {
          ligne.appendChild(el("p", { "class": "ecart " + (deja.ecart === 0 ? "ok" : "ko"),
            text: "🔒 Clôturé : compté " + PG.argent(deja.compte) + (deja.ecart === 0 ? " · aucun écart" : " · écart " + (deja.ecart > 0 ? "+" : "") + PG.argent(deja.ecart)) }));
        } else {
          var champ = el("input", { type: "number", inputmode: "numeric", min: "0", step: "5", placeholder: "Argent compté (F)", "aria-label": "Argent compté pour " + MODES[m] });
          var bouton = el("button", { type: "button", "class": "btn btn-primary", text: "Clôturer" });
          bouton.addEventListener("click", agir(async function () {
            if (champ.value === "") { toast("Écrivez l'argent compté.", true); return; }
            var compte = Math.round(Number(champ.value));
            if (!isFinite(compte) || compte < 0) { toast("Montant invalide.", true); return; }
            if (!window.confirm("Clôturer " + MODES[m] + " de " + (noms[sid] || "ce serveur") + " : compté " + compte + " F ? C'est définitif.")) { return; }
            var r = await sb.rpc("cloturer_point", { p_jour: $("jour").value, p_serveur: sid, p_mode: m, p_compte: compte });
            if (r.error) { throw r.error; }
            toast("Point clôturé.");
            await charger();
          }));
          ligne.appendChild(el("div", { "class": "mode-saisie" }, [champ, bouton]));
        }
        carte.appendChild(ligne);
      });
      boite.appendChild(carte);
    });
  }

  // Bouton de fin de service : le caissier décide, rien n'est automatique
  function dessinerFinJournee() {
    var boite = $("finJournee");
    boite.replaceChildren();
    if (journee) {
      boite.appendChild(el("p", { "class": "ecart " + (journee.ecart_total === 0 && journee.points_manquants === 0 ? "ok" : "ko"),
        text: "🔒 Journée clôturée à " + PG.heure(journee.ferme_le) + " par " + (noms[journee.caissier_id] || "le caissier") +
          " · encaissé " + PG.argent(journee.encaisse) + " · écart total " + PG.argent(journee.ecart_total) +
          (journee.points_manquants ? " · " + journee.points_manquants + " point(s) non clôturé(s)" : "") }));
      return;
    }
    // Simple rappel, le bouton reste la seule façon de clôturer
    var heureBenin = new Date(Date.now() + 3600000).getUTCHours();
    var passeeFermeture = $("jour").value === jourDeService(new Date()) && heureBenin >= SERVICE.fermeture && heureBenin < 6;
    if (passeeFermeture) {
      boite.appendChild(el("p", { "class": "serveur-alerte", text: "⏰ L'heure de fermeture prévue (" + SERVICE.fermeture + " h) est passée : pensez à clôturer la journée quand le service est fini." }));
    } else if ($("jour").value !== jourDeService(new Date())) {
      boite.appendChild(el("p", { "class": "serveur-alerte", text: "⚠ Cette journée n'est pas encore clôturée." }));
    }
    var bouton = el("button", { type: "button", "class": "btn btn-primary btn-block", text: "🔒 Clôturer la journée" });
    bouton.addEventListener("click", agir(async function () {
      var valides = commandes.filter(function (c) { return c.statut !== "annulee"; });
      var nonPayees = valides.filter(function (c) { return !c.paye; }).length;
      var groupes = {};
      valides.forEach(function (c) { if (c.paye) { groupes[c.serveur_id + "|" + c.mode_paiement] = 1; } });
      var manquants = Object.keys(groupes).filter(function (g) { return !clotures[g]; }).length;
      var avert = "";
      if (nonPayees) { avert += "\n- " + nonPayees + " commande(s) pas encore encaissée(s)"; }
      if (manquants) { avert += "\n- " + manquants + " point(s) de serveur pas encore clôturé(s)"; }
      var msg = "Clôturer la journée du " + $("jour").value + " ? C'est définitif et le patron sera prévenu." + (avert ? "\n\nAttention :" + avert : "");
      if (!window.confirm(msg)) { return; }
      var r = await sb.rpc("cloturer_journee", { p_jour: $("jour").value });
      if (r.error) { throw r.error; }
      toast("Journée clôturée. Le patron est prévenu.");
      await charger();
    }));
    boite.appendChild(bouton);
  }

  /* ---------- 4. TRANSACTIONS ---------- */
  function dessinerTransactions() {
    var sel = $("filtreServeur");
    var choisi = sel.value;
    var ids = [];
    commandes.forEach(function (c) { if (ids.indexOf(c.serveur_id) < 0) { ids.push(c.serveur_id); } });
    sel.replaceChildren(el("option", { value: "", text: "Tous" }));
    ids.forEach(function (id) { sel.appendChild(el("option", { value: id, text: noms[id] || "Serveur" })); });
    sel.value = ids.indexOf(choisi) >= 0 ? choisi : "";

    var liste = commandes.filter(function (c) { return !sel.value || c.serveur_id === sel.value; });
    var enAttente = commandes.filter(function (c) { return !c.paye && c.statut !== "annulee"; }).length;
    $("compteur").textContent = String(enAttente);
    $("compteur").hidden = !enAttente;

    var boite = $("transactions");
    boite.replaceChildren();
    if (!liste.length) { boite.appendChild(el("p", { "class": "vide", text: "Aucune transaction." })); }
    liste.forEach(function (c) {
      var t = un(c.tables_salle);
      var etat = c.statut === "annulee" ? "annulee" : (c.paye ? "payee" : "");
      var texteEtat = c.statut === "annulee" ? "Annulée" : (c.paye ? "Payée · " + (MODES[c.mode_paiement] || "?") : "Pas encore payée");
      boite.appendChild(el("article", { "class": "trans " + etat }, [
        el("div", { "class": "trans-tete" }, [el("span", { text: (t ? t.nom : "Table ?") }), el("span", { text: PG.argent(totalCommande(c)) })]),
        el("p", { "class": "trans-meta", text: PG.heure(c.created_at) + " · " + (noms[c.serveur_id] || "Serveur") + " · " + texteEtat }),
        el("ul", {}, c.commande_lignes.map(function (l) {
          var pl = un(l.plats), pr = un(l.ligne_prix);
          return el("li", { text: l.quantite + " × " + (l.nom_libre || (pl ? pl.nom : "Plat")) + (pr ? " · " + PG.argent(pr.prix_unitaire) : "") });
        }))
      ]));
    });
  }
  $("filtreServeur").addEventListener("change", dessinerTransactions);
  $("jour").addEventListener("change", agir(charger));

  /* ---------- 5. TEMPS RÉEL ET DÉMARRAGE ---------- */
  try {
    var attente = null;
    sb.channel("caisse-commandes")
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, function () {
        clearTimeout(attente);
        attente = setTimeout(function () { agir(charger)(); }, 700);
      }).subscribe();
  } catch (e) { console.warn("Temps réel indisponible :", e); }

   // ===== RÉSERVATIONS (code commun : reservations-equipe.js) =====
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
  try {
    if (window.PGResa) {
      PGResa.monter({ liste: "listeResa", compteur: "compteurResa", toast: toast, bip: bip });
    }
  } catch (e) { console.warn("Réservations indisponibles :", e); }
   $("jour").value = jourDeService(new Date());
  ouvrirOnglet("point");
  agir(charger)();
})();
