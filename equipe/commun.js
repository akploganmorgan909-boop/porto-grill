/* =========================================================
   PORTO GRILL - Espace équipe : outils communs
   Toutes les pages (connexion, serveur, cuisine, patron) utilisent ce fichier.
   Il crée l'objet global PG.

   Sommaire
   1. Connexion à Supabase
   2. Compte et rôle
   3. Pages selon le rôle
   4. Formats et messages d'erreur
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     1. CONNEXION À SUPABASE
     ========================================================= */
  var cfg = window.PG_CONFIG;
  var sb = null;

  if (window.supabase && cfg && cfg.url && cfg.cle) {
    sb = window.supabase.createClient(cfg.url, cfg.cle);
  } else {
    console.error("Supabase n'est pas chargé : vérifiez config.js et la connexion internet.");
  }

  /* =========================================================
     2. COMPTE ET RÔLE
     ========================================================= */

  // Renvoie { id, nom, role, email } si la personne est connectée et son compte actif, sinon null
  async function profil() {
    if (!sb) { return null; }
    var rep = await sb.auth.getUser();
    var user = rep.data && rep.data.user;
    if (!user) { return null; }

    var res = await sb.from("profiles").select("id, nom, role, actif").eq("id", user.id).maybeSingle();
    if (res.error) { throw res.error; }
    if (!res.data || !res.data.actif) { return null; }

    return { id: res.data.id, nom: res.data.nom, role: res.data.role, email: user.email };
  }

  // À appeler en haut de chaque page privée.
  // Exemple : const moi = await PG.exiger(["cuisine", "patron"]);
  async function exiger(rolesAutorises) {
    var moi = null;
    try { moi = await profil(); } catch (e) { moi = null; }
    if (!moi || (rolesAutorises && rolesAutorises.indexOf(moi.role) < 0)) {
      window.location.replace("connexion.html");
      return null;
    }
    return moi;
  }

  async function deconnexion() {
    if (sb) { await sb.auth.signOut(); }
    window.location.replace("connexion.html");
  }

  /* =========================================================
     3. PAGES SELON LE RÔLE
     ========================================================= */
 var PAGES = { patron: "patron.html", super_admin: "patron.html", cuisine: "cuisine.html", serveur: "serveur.html", caissier: "caissier.html" };
 var ROLES = { patron: "Patron", super_admin: "Super admin", cuisine: "Cuisine", serveur: "Serveur", caissier: "Caissier" };
  function pageDuRole(role) { return PAGES[role] || "connexion.html"; }
  function nomDuRole(role) { return ROLES[role] || role; }

  /* =========================================================
     4. FORMATS ET MESSAGES D'ERREUR
     ========================================================= */

  // 12500 -> "12 500 F"
  function argent(n) {
    return Number(n || 0).toLocaleString("fr-FR") + " F";
  }

  // Heure du Bénin au format "14 h 05"
  function heure(dateIso) {
    var d = new Date(dateIso);
    var p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return o.hour + " h " + o.minute;
  }

  // Transforme une erreur technique en phrase claire pour le personnel
  function erreur(e) {
    var texte = String((e && (e.message || e.error_description)) || e || "");
    if (/invalid login credentials/i.test(texte)) { return "E-mail ou mot de passe incorrect."; }
    if (/email not confirmed/i.test(texte)) { return "Ce compte n'est pas encore confirmé. Prévenez le patron."; }
    if (/rate limit|too many/i.test(texte)) { return "Trop d'essais. Attendez quelques minutes puis réessayez."; }
    if (/failed to fetch|network/i.test(texte)) { return "Pas de connexion internet. Vérifiez le réseau."; }
    if (/permission denied|row-level security/i.test(texte)) { return "Vous n'avez pas le droit de faire cette action."; }
    return "Une erreur est survenue. " + texte;
  }

  window.PG = {
    sb: sb,
    profil: profil,
    exiger: exiger,
    deconnexion: deconnexion,
    pageDuRole: pageDuRole,
    nomDuRole: nomDuRole,
    argent: argent,
    heure: heure,
    erreur: erreur
  };
})();
