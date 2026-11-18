/* =========================================================
   PORTO GRILL - Espace cuisine
   Sommaire
   1. Départ et outils      2. Sons et alertes
   3. Commandes en direct   4. Réservations du jour
   5. Temps réel et démarrage
   Règle : la cuisine ne lit JAMAIS les prix (aucune requête sur les prix ici).
   ========================================================= */
(async function () {
  "use strict";

  /* =========================================================
     1. DÉPART ET OUTILS
     ========================================================= */
  var sb = PG.sb;
  var moi = await PG.exiger(["cuisine", "patron"]);
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

  var minuteurToast = null;
  function toast(texte, erreur) {
    var t = $("toast");
    t.textContent = texte;
    t.className = "toast" + (erreur ? " is-error" : "");
    t.hidden = false;
    clearTimeout(minuteurToast);
    if (erreur) { t.textContent = texte + " (touchez ce message pour le fermer)"; t.onclick = function () { t.hidden = true; }; }
    else { t.onclick = null; minuteurToast = setTimeout(function () { t.hidden = true; }, 5000); }
  }

  function agir(fonction) {
    return async function (e) {
      try { await fonction(e); }
      catch (err) { toast(PG.erreur(err), true); }
    };
  }

  var ZONES = { salle: "Salle", terrasse: "Terrasse", bar: "Bar", vip: "VIP / Salon" };
  function un(x) { return Array.isArray(x) ? x[0] : x; }

  function dateBenin() {
    var o = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Porto-Novo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .forEach(function (p) { o[p.type] = p.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }

  // Onglets
  function ouvrirOnglet(nom) {
    document.querySelectorAll(".tab").forEach(function (b) {
      var actif = b.dataset.tab === nom;
      b.classList.toggle("is-active", actif);
      b.setAttribute("aria-pressed", String(actif));
    });
    $("tab-tickets").hidden = nom !== "tickets";
    $("tab-reservations").hidden = nom !== "reservations";
    if (nom === "reservations") { agir(chargerReservations)(); }
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrirOnglet(b.dataset.tab); });
  });

  /* =========================================================
     2. SONS ET ALERTES
     ========================================================= */
  var audio = null;

  // À appeler après un toucher : débloque le son et garde l'écran allumé
  $("activerSon").addEventListener("click", async function () {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      audio = audio || new C();
      if (audio.state === "suspended") { await audio.resume(); }
      sonner("nouvelle");
    } catch (e) { toast("Le son n'est pas possible sur cet appareil.", true); }
    try { if (navigator.wakeLock) { await navigator.wakeLock.request("screen"); } } catch (e) { /* facultatif */ }
    $("activerSon").hidden = true;
  });

  // Une série de notes : [fréquence, début, durée] (en secondes)
  function notes(liste) {
    if (!audio) { return; }
    liste.forEach(function (n) {
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.connect(g); g.connect(audio.destination);
      o.frequency.value = n[0];
      var t0 = audio.currentTime + n[1];
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[2]);
      o.start(t0); o.stop(t0 + n[2] + 0.05);
    });
  }

  function sonner(type) {
    if (type === "cloche") {   // le serveur relance : sonnerie plus pressante, 3 fois
      notes([[1320, 0, 0.25], [1760, 0.3, 0.25], [1320, 0.6, 0.25], [1760, 0.9, 0.25], [1320, 1.2, 0.25], [1760, 1.5, 0.35]]);
      if (navigator.vibrate) { navigator.vibrate([400, 150, 400, 150, 400]); }
    } else {                   // nouvelle commande : deux notes
      notes([[660, 0, 0.3], [880, 0.35, 0.5]]);
      if (navigator.vibrate) { navigator.vibrate([250, 120, 250]); }
    }
  }

  /* =========================================================
     3. COMMANDES EN DIRECT
     ========================================================= */
  var commandes = [];
  var connues = {};   // identifiant de commande -> nombre de relances déjà signalées

  // Durée lisible : 45 -> "45 min", 255 -> "4 h 15"
  function duree(min) {
    if (min < 60) { return min + " min"; }
    var m = min % 60;
    return Math.floor(min / 60) + " h " + (m < 10 ? "0" + m : m);
  }

  function minutes(depuis) { return Math.max(0, Math.floor((Date.now() - new Date(depuis).getTime()) / 60000)); }

  function classeAttente(c) {
    if (c.statut === "prete") { return "est-prete"; }
    var m = minutes(c.created_at);
    return m >= 20 ? "attente-longue" : (m >= 10 ? "attente-moyenne" : "");
  }

  async function changerStatut(id, statut) {
    var r = await sb.from("commandes").update({ statut: statut }).eq("id", id);
    if (r.error) { throw r.error; }
    await chargerCommandes();
  }

  function dessinerTicket(c) {
    var table = un(c.tables_salle);
    var minut = el("p", { "class": "ticket-minuteur", text: c.statut === "prete" ? "Prête" : duree(minutes(c.created_at)) });
    minut.dataset.depuis = c.created_at;
    minut.dataset.statut = c.statut;

    var lignes = el("ul", { "class": "ticket-lignes" }, c.commande_lignes.map(function (l) {
      var plat = un(l.plats);
      var li = el("li", { text: l.quantite + " × " + (l.nom_libre || (plat ? plat.nom : "Plat")) });
      if (l.note) { li.appendChild(el("small", { text: l.note })); }
      return li;
    }));

    var actions = el("div", { "class": "ticket-actions" });
    if (c.statut === "envoyee") {
      var b1 = el("button", { type: "button", "class": "btn btn-ghost", text: "En préparation" });
      b1.addEventListener("click", agir(function () { return changerStatut(c.id, "en_preparation"); }));
      actions.appendChild(b1);
    }
    if (c.statut === "envoyee" || c.statut === "en_preparation") {
      var b2 = el("button", { type: "button", "class": "btn btn-primary", text: "Prête ✓" });
      b2.addEventListener("click", agir(function () { return changerStatut(c.id, "prete"); }));
      actions.appendChild(b2);
    }

    var carte = el("article", { "class": "ticket " + classeAttente(c) }, [
      el("div", { "class": "ticket-tete" }, [el("h2", { "class": "ticket-table", text: table ? table.nom : "Table ?" }), minut]),
      el("p", { "class": "ticket-zone zone-" + (table ? table.zone : ""), text: table ? (ZONES[table.zone] || table.zone) : "" }),
      el("p", { "class": "ticket-meta", text: "Envoyée à " + PG.heure(c.created_at) + (c.statut === "en_preparation" ? " · en préparation" : "") })
    ]);
    if (c.relances > 0 && c.statut !== "prete") {
      carte.appendChild(el("p", { "class": "ticket-cloche", text: "🔔 Le serveur relance (" + c.relances + " fois)" }));
    }
    carte.appendChild(lignes);
    if (c.note) { carte.appendChild(el("p", { "class": "ticket-note", text: c.note })); }
    if (actions.children.length) { carte.appendChild(actions); }
    return carte;
  }

  async function chargerCommandes() {
    var depuis = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
    var r = await sb.from("commandes")
      .select("id, statut, note, created_at, relances, tables_salle(nom, zone), commande_lignes(quantite, nom_libre, note, plats(nom))")
      .in("statut", ["envoyee", "en_preparation", "prete"])
      .gte("created_at", depuis)
      .order("created_at", { ascending: true });
    if (r.error) { throw r.error; }
    commandes = r.data;
    commandes.forEach(function (c) { connues[c.id] = c.relances; });

    // À préparer d'abord, les commandes prêtes à la fin
    var ordre = { envoyee: 0, en_preparation: 0, prete: 1 };
    var liste = commandes.slice().sort(function (a, b) { return ordre[a.statut] - ordre[b.statut]; });

    var boite = $("tickets");
    boite.replaceChildren();
    if (!liste.length) { boite.appendChild(el("p", { "class": "vide", text: "Aucune commande pour l'instant." })); }
    liste.forEach(function (c) { boite.appendChild(dessinerTicket(c)); });

    var enCours = commandes.filter(function (c) { return c.statut !== "prete"; }).length;
    $("compteur").textContent = String(enCours);
    $("compteur").hidden = enCours === 0;

    var p = await sb.from("a_preparer").select("nom, quantite").order("quantite", { ascending: false });
    if (p.error) { throw p.error; }
    var zone = $("aPreparer");
    zone.replaceChildren();
    if (!p.data.length) { zone.appendChild(el("p", { "class": "vide", text: "Rien à préparer." })); }
    p.data.forEach(function (x) {
      zone.appendChild(el("span", { "class": "prep-chip" }, [el("strong", { text: x.quantite + " ×" }), document.createTextNode(" " + x.nom)]));
    });
  }

  // Les minuteurs et couleurs avancent toutes les 30 secondes
  setInterval(function () {
    document.querySelectorAll(".ticket-minuteur").forEach(function (m) {
      if (m.dataset.statut === "prete") { return; }
      var min = minutes(m.dataset.depuis);
      m.textContent = duree(min);
      var t = m.closest(".ticket");
      t.classList.toggle("attente-moyenne", min >= 10 && min < 20);
      t.classList.toggle("attente-longue", min >= 20);
    });
  }, 30000);

  /* =========================================================
     4. RÉSERVATIONS DU JOUR
     ========================================================= */
  async function chargerReservations() {
    var r = await sb.from("reservations")
      .select("id, nom, telephone, heure, personnes, message, statut, tables_salle(nom, zone)")
      .eq("date_reservation", dateBenin())
      .in("statut", ["en_attente", "confirmee", "arrivee"])
      .order("heure", { ascending: true });
    if (r.error) { throw r.error; }
    var boite = $("listeResa");
    boite.replaceChildren();
    if (!r.data.length) { boite.appendChild(el("p", { "class": "vide", text: "Aucune réservation aujourd'hui." })); }
    r.data.forEach(function (x) {
      var table = un(x.tables_salle);
      var etat = x.statut === "arrivee" ? "Arrivés" : (x.statut === "confirmee" ? "Confirmée" : "En attente de confirmation");
      var carte = el("article", { "class": "resa" }, [
        el("p", { "class": "resa-heure", text: String(x.heure).slice(0, 5) }),
        el("p", { text: x.nom + " · " + x.personnes + (x.personnes > 1 ? " personnes" : " personne") }),
        el("p", { text: (table ? "Table : " + table.nom + " · " : "") + etat }),
        el("p", { text: "Tél. : " + x.telephone })
      ]);
      if (x.message) { carte.appendChild(el("p", { "class": "ticket-note", text: x.message })); }
      boite.appendChild(carte);
    });
  }

  /* =========================================================
     5. TEMPS RÉEL ET DÉMARRAGE
     ========================================================= */
  try {
    var attente = null;
     
       // Alerte sonore et affichage direct des réservations en cuisine
  sb.channel("cuisine-reservations")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations" }, function (payload) {
      sonner("nouvelle");
      toast("📅 Nouvelle réservation reçue : " + (payload.new.nom || ""));
      chargerReservations();
    })
    .subscribe();
     
    sb.channel("cuisine-commandes")
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, function (payload) {
        var n = payload.new || {};
        if (payload.eventType === "INSERT") {
          sonner("nouvelle");
          toast("Nouvelle commande !");
        } else if (payload.eventType === "UPDATE" && n.relances > (connues[n.id] || 0) && n.statut !== "prete") {
          connues[n.id] = n.relances;
          sonner("cloche");
          toast("🔔 Un serveur relance une commande.");
        }
        clearTimeout(attente);
        attente = setTimeout(function () { agir(chargerCommandes)(); }, 600);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, function () {
        if (!$("tab-reservations").hidden) { agir(chargerReservations)(); }
      })
      .subscribe();
  } catch (e) {
    console.warn("Temps réel indisponible :", e);
  }

  // Sécurité : si le temps réel s'interrompt, on recharge toutes les 60 secondes
  setInterval(function () { agir(chargerCommandes)(); }, 60000);

  ouvrirOnglet("tickets");
  agir(chargerCommandes)();
})();
