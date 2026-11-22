/* =========================================================
   PORTO GRILL - Bloc « Profil » (serveur, cuisine, caisse, patron)
   Regroupe en haut de page : photo de profil, nom, rôle,
   changement de mot de passe et déconnexion.
   (Le fichier garde le nom mdp.js pour que les pages n'aient pas à changer.)
   ========================================================= */
(function () {
  "use strict";
  var sb = window.PG && window.PG.sb;
  var zone = document.querySelector(".topbar-user");
  var nomEl = document.getElementById("userName");
  var logout = document.getElementById("logout");
  var roleEl = document.querySelector(".brand-role");
  if (!sb || !zone || !nomEl || !logout) { return; }

  /* ---------- Style ---------- */
  var st = document.createElement("style");
  st.textContent =
    ".topbar-inner{flex-wrap:wrap;row-gap:.5rem}" +
    ".topbar-user{position:relative;display:flex;align-items:center;margin:0}" +
    ".pf-btn{display:flex;align-items:center;gap:.5rem;background:transparent;border:1px solid var(--charbon-3,#2d2520);color:var(--creme,#f6ede0);border-radius:999px;padding:.2rem .7rem .2rem .25rem;font:inherit;font-size:.95rem;cursor:pointer;max-width:100%}" +
    ".pf-btn:hover{border-color:var(--cuivre,#e0b266)}" +
    ".pf-btn:focus-visible{outline:3px solid var(--cuivre,#e0b266);outline-offset:2px}" +
    ".pf-nom{max-width:8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".pf-fleche{font-size:.7rem;opacity:.7}" +
    ".pf-av{flex:0 0 auto;width:2rem;height:2rem;border-radius:50%;background:var(--braise,#c8401a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;overflow:hidden}" +
    ".pf-av img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".pf-av-grand{width:4.5rem;height:4.5rem;font-size:1.5rem}" +
    ".pf-menu{position:absolute;right:0;top:calc(100% + .5rem);width:min(92vw,19rem);background:var(--charbon-2,#211b17);color:var(--creme,#f6ede0);border:1px solid var(--charbon-3,#2d2520);border-radius:var(--radius,10px);padding:1rem;z-index:900;box-shadow:0 12px 30px rgba(0,0,0,.5)}" +
    ".pf-menu[hidden]{display:none}" +
    ".pf-tete{display:flex;align-items:center;gap:.8rem;margin-bottom:.9rem}" +
    ".pf-tete #userName{display:block;font-family:var(--font-title,serif);font-size:1.2rem;font-weight:700;line-height:1.2;word-break:break-word}" +
    ".pf-role{margin:.15rem 0 0;font-size:.85rem;color:var(--cuivre,#e0b266)}" +
    ".pf-liste{display:flex;flex-direction:column;gap:.5rem}" +
    ".pf-liste .btn{width:100%;justify-content:center;text-align:center;white-space:normal}" +
    ".pf-msg{min-height:1.2rem;margin:.6rem 0 0;font-size:.9rem;color:var(--rouge,#ff8a73)}" +
    ".pf-msg.ok{color:var(--vert,#3fb673)}" +
    // Téléphone : le bouton ne montre que la photo, pour rester sur la ligne du haut
    "@media (max-width:520px){.pf-nom{display:none}.pf-btn{padding:.2rem .55rem .2rem .25rem}}" +
    ".mdp-fond{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:1rem;z-index:1000}" +
    ".mdp-fond[hidden]{display:none}" +
    ".mdp-boite{background:var(--charbon-2,#211b17);color:var(--creme,#f6ede0);border:1px solid var(--charbon-3,#2d2520);border-radius:var(--radius,10px);padding:1.25rem;width:100%;max-width:26rem}" +
    ".mdp-boite h2{margin:0 0 1rem;font-family:var(--font-title,serif);font-size:1.3rem}" +
    ".mdp-msg{min-height:1.4rem;margin:0 0 .75rem;font-size:.95rem;color:var(--rouge,#ff8a73)}" +
    ".mdp-msg.ok{color:var(--vert,#3fb673)}" +
    ".mdp-actions{display:flex;gap:.6rem;flex-wrap:wrap}";
  document.head.appendChild(st);

  /* ---------- Outils ---------- */
  function el(tag, cls, texte) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (texte) { e.textContent = texte; }
    return e;
  }
  function initiales(nom) {
    var m = String(nom || "").trim().split(/\s+/).filter(function (x) { return /[A-Za-zÀ-ÿ0-9]/.test(x); });
    if (!m.length) { return "?"; }
    return (m[0][0] + (m.length > 1 ? m[1][0] : "")).toUpperCase();
  }
  var photoActuelle = null;
  function dessinerAvatar(cible) {
    cible.replaceChildren();
    if (photoActuelle) {
      var i = document.createElement("img");
      i.src = photoActuelle; i.alt = "";
      cible.appendChild(i);
    } else {
      cible.textContent = initiales(nomEl.textContent);
    }
  }

  /* ---------- Bloc Profil ---------- */
  var bouton = el("button", "pf-btn");
  bouton.type = "button";
  bouton.setAttribute("aria-haspopup", "true");
  bouton.setAttribute("aria-expanded", "false");
  var avPetit = el("span", "pf-av");
  var nomPetit = el("span", "pf-nom");
  bouton.appendChild(avPetit);
  bouton.appendChild(nomPetit);
  bouton.appendChild(el("span", "pf-fleche", "▾"));

  var menu = el("div", "pf-menu"); menu.hidden = true;
  var tete = el("div", "pf-tete");
  var avGrand = el("div", "pf-av pf-av-grand");
  var bloc = el("div");
  bloc.appendChild(nomEl);                      // le nom reste le même élément : les pages continuent de le remplir
  bloc.appendChild(el("p", "pf-role", roleEl ? roleEl.textContent : ""));
  tete.appendChild(avGrand); tete.appendChild(bloc);

  var liste = el("div", "pf-liste");
  var bPhoto = el("button", "btn btn-ghost btn-small", "Changer ma photo"); bPhoto.type = "button";
  var bRetirer = el("button", "btn btn-ghost btn-small", "Retirer ma photo"); bRetirer.type = "button"; bRetirer.hidden = true;
  var bMdp = el("button", "btn btn-ghost btn-small", "Changer mon mot de passe"); bMdp.type = "button";
  var fichier = document.createElement("input");
  fichier.type = "file"; fichier.accept = "image/*"; fichier.hidden = true;
  liste.appendChild(bPhoto); liste.appendChild(bRetirer); liste.appendChild(bMdp); liste.appendChild(logout); liste.appendChild(fichier);
  var msgMenu = el("p", "pf-msg"); msgMenu.setAttribute("role", "status");

  menu.appendChild(tete); menu.appendChild(liste); menu.appendChild(msgMenu);
  zone.replaceChildren(bouton, menu);

  function rafraichir() {
    nomPetit.textContent = nomEl.textContent === "..." ? "" : nomEl.textContent;
    dessinerAvatar(avPetit);
    dessinerAvatar(avGrand);
    bRetirer.hidden = !photoActuelle;
  }
  new MutationObserver(rafraichir).observe(nomEl, { childList: true, characterData: true, subtree: true });
  rafraichir();

  function dire(texte, bon) { msgMenu.textContent = texte; msgMenu.className = "pf-msg" + (bon ? " ok" : ""); }
  function ouvrirMenu() { menu.hidden = false; bouton.setAttribute("aria-expanded", "true"); dire(""); }
  function fermerMenu() { menu.hidden = true; bouton.setAttribute("aria-expanded", "false"); }
  bouton.addEventListener("click", function (e) { e.stopPropagation(); if (menu.hidden) { ouvrirMenu(); } else { fermerMenu(); } });
  document.addEventListener("click", function (e) { if (!menu.hidden && !zone.contains(e.target)) { fermerMenu(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { fermerMenu(); bouton.focus(); } });

  /* ---------- Photo de profil ---------- */
  var PREFIXE = "data:image/jpeg;base64,";
  (async function () {
    try {
      var u = await sb.auth.getUser();
      var id = u.data && u.data.user && u.data.user.id;
      if (!id) { return; }
      var r = await sb.from("profiles").select("photo").eq("id", id).maybeSingle();
      if (r.data && typeof r.data.photo === "string" && r.data.photo.indexOf(PREFIXE) === 0) {
        photoActuelle = r.data.photo;
        rafraichir();
      }
    } catch (e) { /* pas de photo : on garde les initiales */ }
  })();

  function reduire(f) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () {
        var T = 256, c = document.createElement("canvas");
        c.width = T; c.height = T;
        var g = c.getContext("2d");
        var m = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, T, T);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("image illisible")); };
      img.src = url;
    });
  }
  async function enregistrerPhoto(valeur) {
    var r = await sb.rpc("modifier_ma_photo", { p_photo: valeur });
    if (r.error) {
      if (/modifier_ma_photo|schema cache|could not find/i.test(r.error.message || "")) {
        throw new Error("La photo n’est pas encore activée sur le serveur. Prévenez votre prestataire.");
      }
      throw new Error("Impossible d’enregistrer la photo. Réessayez.");
    }
    photoActuelle = valeur;
    rafraichir();
  }
  bPhoto.addEventListener("click", function () { fichier.value = ""; fichier.click(); });
  fichier.addEventListener("change", async function () {
    var f = fichier.files && fichier.files[0];
    if (!f) { return; }
    if (!/^image\//.test(f.type)) { dire("Choisissez une image (photo)."); return; }
    if (f.size > 15 * 1024 * 1024) { dire("Cette photo est trop lourde. Choisissez-en une plus petite."); return; }
    dire("Enregistrement…");
    try {
      await enregistrerPhoto(await reduire(f));
      dire("Photo enregistrée.", true);
    } catch (err) { dire(err.message || "Photo impossible."); }
  });
  bRetirer.addEventListener("click", async function () {
    dire("…");
    try { await enregistrerPhoto(null); dire("Photo retirée.", true); }
    catch (err) { dire(err.message || "Impossible de retirer la photo."); }
  });

  /* ---------- Changer le mot de passe ---------- */
  function champ(id, libelle, auto) {
    var d = el("div", "field");
    var l = el("label", "", libelle); l.setAttribute("for", id);
    var i = document.createElement("input"); i.type = "password"; i.id = id; i.autocomplete = auto; i.required = true;
    d.appendChild(l); d.appendChild(i);
    return d;
  }
  var fond = el("div", "mdp-fond"); fond.hidden = true;
  var form = el("form", "mdp-boite"); form.noValidate = true;
  var msg = el("p", "mdp-msg"); msg.setAttribute("role", "status");
  var ok = el("button", "btn btn-primary", "Changer mon mot de passe"); ok.type = "submit";
  var non = el("button", "btn btn-ghost", "Fermer"); non.type = "button";
  var actions = el("div", "mdp-actions"); actions.appendChild(ok); actions.appendChild(non);
  form.appendChild(el("h2", "", "Changer mon mot de passe"));
  form.appendChild(champ("mdpAnc", "Ancien mot de passe", "current-password"));
  form.appendChild(champ("mdpNou", "Nouveau mot de passe (8 caractères minimum)", "new-password"));
  form.appendChild(champ("mdpCon", "Écrivez le nouveau mot de passe une deuxième fois", "new-password"));
  form.appendChild(msg); form.appendChild(actions);
  fond.appendChild(form);
  document.body.appendChild(fond);

  function direMdp(texte, bon) { msg.textContent = texte; msg.className = "mdp-msg" + (bon ? " ok" : ""); }
  function fermerMdp() { fond.hidden = true; form.reset(); direMdp(""); }
  bMdp.addEventListener("click", function () { fermerMenu(); fond.hidden = false; direMdp(""); document.getElementById("mdpAnc").focus(); });
  non.addEventListener("click", fermerMdp);
  fond.addEventListener("click", function (e) { if (e.target === fond) { fermerMdp(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fond.hidden) { fermerMdp(); } });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var ancien = document.getElementById("mdpAnc").value;
    var nouveau = document.getElementById("mdpNou").value;
    var confirme = document.getElementById("mdpCon").value;
    if (!ancien) { direMdp("Écrivez votre ancien mot de passe."); return; }
    if (nouveau.length < 8) { direMdp("Le nouveau mot de passe doit avoir au moins 8 caractères."); return; }
    if (nouveau !== confirme) { direMdp("Les deux nouveaux mots de passe ne sont pas identiques."); return; }
    if (nouveau === ancien) { direMdp("Le nouveau mot de passe doit être différent de l’ancien."); return; }
    ok.disabled = true;
    try {
      var u = await sb.auth.getUser();
      var email = u.data && u.data.user && u.data.user.email;
      var v = await sb.auth.signInWithPassword({ email: email, password: ancien });
      if (v.error) { direMdp("L’ancien mot de passe est incorrect."); return; }
      var r = await sb.auth.updateUser({ password: nouveau });
      if (r.error) { direMdp("Changement impossible. Réessayez dans un instant."); return; }
      form.reset();
      direMdp("Mot de passe changé. Utilisez-le à votre prochaine connexion.", true);
    } catch (err) {
      direMdp("Pas de connexion internet. Réessayez.");
    } finally {
      ok.disabled = false;
    }
  });
})();
