/* =========================================================
   PORTO GRILL - Bouton « Mot de passe » (serveur, cuisine, caisse)
   Ajoute un bouton à côté de « Déconnexion ». Il ouvre une petite fenêtre :
   ancien mot de passe, puis nouveau mot de passe deux fois.
   ========================================================= */
(function () {
  "use strict";
  var sb = window.PG && window.PG.sb;
  var zone = document.querySelector(".topbar-user");
  if (!sb || !zone) { return; }

  // Style de la fenêtre (utilise les couleurs du site)
  var st = document.createElement("style");
  st.textContent =
    ".mdp-fond{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:1rem;z-index:1000}" +
    ".mdp-fond[hidden]{display:none}" +
    ".mdp-boite{background:var(--charbon-2,#211b17);color:var(--creme,#f6ede0);border:1px solid var(--charbon-3,#2d2520);border-radius:var(--radius,10px);padding:1.25rem;width:100%;max-width:26rem}" +
    ".mdp-boite h2{margin:0 0 1rem;font-family:var(--font-title,serif);font-size:1.3rem}" +
    ".mdp-msg{min-height:1.4rem;margin:0 0 .75rem;font-size:.95rem;color:var(--rouge,#ff8a73)}" +
    ".mdp-msg.ok{color:var(--vert,#3fb673)}" +
    ".mdp-actions{display:flex;gap:.6rem;flex-wrap:wrap}";
  document.head.appendChild(st);

  function champ(id, libelle, auto) {
    var d = document.createElement("div"); d.className = "field";
    var l = document.createElement("label"); l.setAttribute("for", id); l.textContent = libelle;
    var i = document.createElement("input"); i.type = "password"; i.id = id; i.autocomplete = auto; i.required = true;
    d.appendChild(l); d.appendChild(i);
    return d;
  }

  var fond = document.createElement("div"); fond.className = "mdp-fond"; fond.hidden = true;
  var form = document.createElement("form"); form.className = "mdp-boite"; form.noValidate = true;
  var titre = document.createElement("h2"); titre.textContent = "Changer mon mot de passe";
  var msg = document.createElement("p"); msg.className = "mdp-msg"; msg.setAttribute("role", "status");
  var ok = document.createElement("button"); ok.type = "submit"; ok.className = "btn btn-primary"; ok.textContent = "Changer mon mot de passe";
  var non = document.createElement("button"); non.type = "button"; non.className = "btn btn-ghost"; non.textContent = "Fermer";
  var actions = document.createElement("div"); actions.className = "mdp-actions"; actions.appendChild(ok); actions.appendChild(non);
  form.appendChild(titre);
  form.appendChild(champ("mdpAnc", "Ancien mot de passe", "current-password"));
  form.appendChild(champ("mdpNou", "Nouveau mot de passe (8 caractères minimum)", "new-password"));
  form.appendChild(champ("mdpCon", "Écrivez le nouveau mot de passe une deuxième fois", "new-password"));
  form.appendChild(msg);
  form.appendChild(actions);
  fond.appendChild(form);
  document.body.appendChild(fond);

  function dire(texte, bon) { msg.textContent = texte; msg.className = "mdp-msg" + (bon ? " ok" : ""); }
  function fermer() { fond.hidden = true; form.reset(); dire(""); }
  function ouvrir() { fond.hidden = false; dire(""); document.getElementById("mdpAnc").focus(); }

  var bouton = document.createElement("button");
  bouton.type = "button"; bouton.className = "btn btn-ghost btn-small"; bouton.textContent = "Mot de passe";
  bouton.addEventListener("click", ouvrir);
  zone.insertBefore(bouton, document.getElementById("logout"));

  non.addEventListener("click", fermer);
  fond.addEventListener("click", function (e) { if (e.target === fond) { fermer(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fond.hidden) { fermer(); } });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var ancien = document.getElementById("mdpAnc").value;
    var nouveau = document.getElementById("mdpNou").value;
    var confirme = document.getElementById("mdpCon").value;
    if (!ancien) { dire("Écrivez votre ancien mot de passe."); return; }
    if (nouveau.length < 8) { dire("Le nouveau mot de passe doit avoir au moins 8 caractères."); return; }
    if (nouveau !== confirme) { dire("Les deux nouveaux mots de passe ne sont pas identiques."); return; }
    if (nouveau === ancien) { dire("Le nouveau mot de passe doit être différent de l’ancien."); return; }
    ok.disabled = true;
    try {
      var u = await sb.auth.getUser();
      var email = u.data && u.data.user && u.data.user.email;
      var v = await sb.auth.signInWithPassword({ email: email, password: ancien });
      if (v.error) { dire("L’ancien mot de passe est incorrect."); return; }
      var r = await sb.auth.updateUser({ password: nouveau });
      if (r.error) { dire("Changement impossible. Réessayez dans un instant."); return; }
      form.reset();
      dire("Mot de passe changé. Utilisez-le à votre prochaine connexion.", true);
    } catch (err) {
      dire("Pas de connexion internet. Réessayez.");
    } finally {
      ok.disabled = false;
    }
  });
})();
