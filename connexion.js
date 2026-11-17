/* =========================================================
   PORTO GRILL - Page de connexion
   ========================================================= */
(function () {
  "use strict";

  var form = document.getElementById("loginForm");
  var champEmail = document.getElementById("email");
  var champMdp = document.getElementById("motdepasse");
  var bouton = document.getElementById("boutonConnexion");
  var message = document.getElementById("message");
  var voir = document.getElementById("voirMotDePasse");

  function afficher(texte, type) {
    message.textContent = texte;
    message.className = "alert" + (type === "ok" ? " alert-ok" : "");
    message.hidden = false;
  }

  function effacer() { message.hidden = true; }

  function occupe(oui) {
    bouton.disabled = oui;
    bouton.textContent = oui ? "Connexion en cours..." : "Se connecter";
  }

  // Afficher ou cacher le mot de passe
  voir.addEventListener("click", function () {
    var visible = champMdp.type === "text";
    champMdp.type = visible ? "password" : "text";
    voir.textContent = visible ? "Afficher" : "Cacher";
    voir.setAttribute("aria-pressed", visible ? "false" : "true");
  });

  // Une fois connecté : on envoie la personne vers sa page, si elle existe
  async function entrer(moi) {
    var page = PG.pageDuRole(moi.role);
    afficher("Bienvenue " + moi.nom + " (" + PG.nomDuRole(moi.role) + "). Ouverture de votre espace...", "ok");

    var existe = false;
    try {
      var rep = await fetch(page, { method: "HEAD", cache: "no-store" });
      existe = rep.ok;
    } catch (e) {
      existe = false;
    }

    if (existe) {
      window.location.replace(page);
    } else {
      afficher("Connexion réussie : " + moi.nom + " (" + PG.nomDuRole(moi.role) + "). La page " + page + " n'est pas encore installée.", "ok");
      occupe(false);
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    effacer();

    if (!PG.sb) {
      afficher("Le site n'a pas pu se connecter à la base de données. Vérifiez internet puis rechargez la page.");
      return;
    }

    var email = champEmail.value.trim();
    var mdp = champMdp.value;
    if (!email || !mdp) {
      afficher("Entrez votre adresse e-mail et votre mot de passe.");
      return;
    }

    occupe(true);
    try {
      var rep = await PG.sb.auth.signInWithPassword({ email: email, password: mdp });
      if (rep.error) { throw rep.error; }

      var moi = await PG.profil();
      if (!moi) {
        // Compte valide mais sans rôle ou désactivé : on ferme la session
        await PG.sb.auth.signOut();
        afficher("Ce compte n'a pas d'accès à l'espace équipe. Contactez le patron.");
        occupe(false);
        return;
      }
      await entrer(moi);
    } catch (err) {
      afficher(PG.erreur(err));
      occupe(false);
    }
  });

  // Déjà connecté ? On va directement à son espace.
  (async function () {
    if (!PG.sb) { return; }
    try {
      var moi = await PG.profil();
      if (moi) { await entrer(moi); }
    } catch (e) {
      /* pas de session : on reste sur la page de connexion */
    }
  })();
})();
