/* =========================================================
   PORTO GRILL - Assistant IA (bulle de chat)
   Un seul moteur, utilisé à la fois sur le site public (clients)
   et dans l'espace équipe (personnel), avec des connaissances différentes.
   Utilise l'API gratuite Google Gemini : window.AI_CONFIG.cle (voir ai-config.js).
   ========================================================= */
(function () {
  "use strict";

  // Modèles essayés dans l'ordre (le premier qui répond est gardé).
  var MODELES = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  var modeleOk = "";
  // Mettre false quand tout fonctionne : cache le détail technique affiché sous l'erreur.
  var DIAGNOSTIC = true;
  var MAX_ECHANGES = 8; // on ne garde que les derniers échanges, pour rester dans le niveau gratuit

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

  /* =========================================================
     CONNAISSANCES : ce que l'assistant a le droit de savoir et de dire
     ========================================================= */
  function connaissancesClient() {
    var categories = [];
    try {
      (window.MENU || "").split("\n").forEach(function (ligne) {
        if (ligne.charAt(0) === "@") { categories.push(ligne.split("|")[1]); }
      });
    } catch (e) { /* tant pis, liste vide */ }

    return [
      "Tu es l'assistant du site du restaurant Porto Grill, à Porto-Novo (Bénin), Bd du Cinquantenaire.",
      "Tu réponds UNIQUEMENT aux questions d'un client sur le restaurant : horaires, menu, réservation, livraison, contact, service traiteur.",
      "Catégories actuelles de la carte : " + (categories.join(", ") || "voir la section Carte de la page") + ".",
      "Voici la carte complète du restaurant (lignes commençant par @ = catégories ; les autres lignes = plats avec leurs détails et prix) :\n" + (window.MENU || "(carte indisponible)"),
      "Réponds aux questions sur les plats, leurs ingrédients, leurs prix et les catégories d'après cette carte UNIQUEMENT. Si une information n'y figure pas (par exemple une allergie précise), dis-le honnêtement et propose d'appeler le restaurant. N'invente jamais un plat, un prix ou un ingrédient.",
      "Livraison : de 12h à minuit. Petit déjeuner et déjeuner : sur réservation. Service traiteur disponible pour événements et pâtisseries.",
      "Contact : téléphone 01 61 18 37 16, WhatsApp au même numéro.",
      "Pour réserver une table, dis au client d'utiliser le formulaire de la section « Réserver une table » de cette page, ou d'appeler, ou d'écrire sur WhatsApp. Précise qu'une demande n'est confirmée qu'après réponse du restaurant.",
      "Ne parle jamais des mots de passe, des comptes du personnel, de la cuisine, de la caisse ou de l'administration du site : ce sujet n'est pas pour les clients.",
      "Si tu ne sais pas répondre, propose d'appeler le restaurant ou d'écrire sur WhatsApp plutôt que d'inventer.",
      "Réponds en français, en 2 à 4 phrases maximum, avec un ton chaleureux et simple."
    ].join("\n");
  }

  function connaissancesEquipe(role) {
    var a = (window.AIDE_DATA || {})[role];
    if (!a) { return null; }
    var texte = [
      "Tu es l'assistant interne du système de gestion du restaurant Porto Grill, pour un employé au poste : " + a.titre + ".",
      "Tu réponds UNIQUEMENT à des questions sur l'utilisation de CET écran et de ce poste de travail, d'après les informations ci-dessous. N'invente rien d'autre.",
      "",
      "Étapes habituelles de ce poste :"
    ];
    a.etapes.forEach(function (e, i) { texte.push((i + 1) + ". " + e); });
    texte.push("", "Questions fréquentes déjà répondues :");
    a.questions.forEach(function (q) { texte.push("- " + q[0] + " → " + q[1]); });
    if (a.sections) {
      texte.push("", "Procédures supplémentaires :");
      a.sections.forEach(function (sec) {
        texte.push("• " + sec[0] + " : " + sec[1].map(function (e) { return typeof e === "string" ? e : e.t; }).join(" "));
      });
    }
    texte.push(
      "",
      "Ne donne jamais de mot de passe, et ne fais jamais de calcul financier précis à la place du caissier ou du patron.",
      "Pour tout ce qui sort de ce poste (bug technique, problème de paiement, question administrative), dis à la personne de prévenir le patron ou le support technique.",
      "Réponds en français, en 2 à 4 phrases maximum, simplement, comme à un collègue."
    );
    return texte.join("\n");
  }

  /* =========================================================
     APPEL À L'IA (Google Gemini)
     ========================================================= */
  async function demanderIA(systeme, historique) {
    var cle = window.AI_CONFIG && window.AI_CONFIG.cle;
    if (!cle || cle.indexOf("METS_TA_CLE") === 0) {
      throw new Error("CLE_MANQUANTE");
    }
    var corps = JSON.stringify({
      system_instruction: { parts: [{ text: systeme }] },
      contents: historique,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4 }
    });
    var dernier = "";
    // On essaie les modèles dans l'ordre ; si l'un est introuvable ou refusé, on passe au suivant.
    var ordre = [modeleOk].concat(MODELES.filter(function (m) { return m !== modeleOk; })).filter(Boolean);
    for (var i = 0; i < ordre.length; i++) {
      var reponse;
      try {
        reponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + ordre[i] + ":generateContent?key=" + encodeURIComponent(cle),
          { method: "POST", headers: { "Content-Type": "application/json" }, body: corps }
        );
      } catch (e) {
        dernier = "réseau : " + (e && e.message ? e.message : "échec");
        console.warn("Assistant IA : appel impossible", ordre[i], e);
        continue;
      }
      if (reponse.ok) {
        var data = await reponse.json();
        var texte = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
          data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!texte) { dernier = ordre[i] + " : réponse vide"; continue; }
        modeleOk = ordre[i];
        return texte.trim();
      }
      var detail = "";
      try { detail = await reponse.text(); } catch (e3) { /* rien */ }
      console.warn("Assistant IA : erreur Google", ordre[i], reponse.status, detail);
      var court = "";
      try { court = (JSON.parse(detail).error || {}).message || ""; } catch (e4) { court = detail.slice(0, 120); }
      dernier = ordre[i] + " → " + reponse.status + (court ? " : " + court.slice(0, 140) : "");
      if (reponse.status === 429) { throw new Error("QUOTA"); }
      if (/API key not valid|API_KEY_INVALID|API key expired/i.test(detail)) { break; } // inutile d'essayer un autre modèle
    }
    var err = new Error("RESEAU");
    err.detail = dernier;
    throw err;
  }

  /* =========================================================
     FENÊTRE DE CHAT
     ========================================================= */
  function demarrer(systeme) {
    var bulle = el("button", { type: "button", "class": "assist-bulle", "aria-label": "Ouvrir l'assistant" }, [
      el("span", { "class": "assist-bulle-icone", text: "💬" }),
      el("span", { "class": "assist-bulle-texte", text: "Assistant IA" })
    ]);
    var panneau = el("div", { "class": "assist-panneau", role: "dialog", "aria-label": "Assistant", hidden: "hidden" });
    var tete = el("div", { "class": "assist-tete" }, [
      el("strong", { text: "🤖 Assistant Porto Grill" })
    ]);
    var fermer = el("button", { type: "button", "class": "assist-fermer", "aria-label": "Fermer", text: "✕" });
    tete.appendChild(fermer);

    var fil = el("div", { "class": "assist-fil" });
    var form = el("form", { "class": "assist-form" });
    var champ = el("input", { type: "text", placeholder: "Pose ta question…", "aria-label": "Votre question", autocomplete: "off" });
    var envoyer = el("button", { type: "submit", "class": "assist-envoyer", text: "Envoyer" });
    form.appendChild(champ);
    form.appendChild(envoyer);

    panneau.appendChild(tete);
    panneau.appendChild(fil);
    panneau.appendChild(form);
    document.body.appendChild(panneau);
    // Toujours flottant. Sur le site public en version téléphone, on le monte au-dessus de la barre du bas.
    document.body.appendChild(bulle);
    var barre = document.body.getAttribute("data-aide") === "client" ? document.querySelector("nav.float") : null;
    function placer() {
      var barreVisible = !!barre && window.getComputedStyle(barre).display !== "none";
      bulle.classList.toggle("assist-avec-barre", barreVisible);
      panneau.classList.toggle("assist-avec-barre", barreVisible);
    }
    placer();
    if (barre) { window.addEventListener("resize", placer); }

    var historique = [];
    var enCours = false;

    function ligne(texte, cote) {
      fil.appendChild(el("p", { "class": "assist-msg assist-" + cote, text: texte }));
      fil.scrollTop = fil.scrollHeight;
    }

    function ouvrir() {
      panneau.hidden = false;
      bulle.hidden = true;
      if (!fil.children.length) {
        ligne("Bonjour ! Je réponds à vos questions sur Porto Grill. Comment puis-je vous aider ?", "ia");
      }
      champ.focus();
    }
    function fermerPanneau() { panneau.hidden = true; bulle.hidden = false; }

    bulle.addEventListener("click", ouvrir);
    fermer.addEventListener("click", fermerPanneau);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var texte = champ.value.trim();
      if (!texte || enCours) { return; }
      champ.value = "";
      ligne(texte, "moi");
      historique.push({ role: "user", parts: [{ text: texte }] });
      if (historique.length > MAX_ECHANGES * 2) { historique.splice(0, historique.length - MAX_ECHANGES * 2); }

      enCours = true;
      envoyer.disabled = true;
      var attente = el("p", { "class": "assist-msg assist-ia assist-attente", text: "…" });
      fil.appendChild(attente);
      fil.scrollTop = fil.scrollHeight;

      try {
        var reponse = await demanderIA(systeme, historique);
        attente.remove();
        ligne(reponse, "ia");
        historique.push({ role: "model", parts: [{ text: reponse }] });
      } catch (err) {
        attente.remove();
        var msg = {
          CLE_MANQUANTE: "L'assistant n'est pas encore activé sur ce site (clé manquante). Contactez le restaurant directement pour l'instant.",
          QUOTA: "L'assistant a atteint sa limite gratuite de questions pour aujourd'hui, réessayez un peu plus tard, ou contactez le restaurant directement.",
          RESEAU: "Je n'arrive pas à répondre pour l'instant (connexion). Réessayez dans un instant.",
          VIDE: "Je n'ai pas pu formuler de réponse, pouvez-vous reformuler votre question ?"
        }[err.message] || "Une erreur est survenue. Réessayez dans un instant.";
        if (DIAGNOSTIC && err && err.detail) { msg += "\n[Détail technique : " + err.detail + "]"; }
        ligne(msg, "ia");
      } finally {
        enCours = false;
        envoyer.disabled = false;
      }
    });
  }

  function demarrage() {
    var role = document.body.getAttribute("data-aide");
    var systeme = role === "client" ? connaissancesClient() : connaissancesEquipe(role);
    if (!systeme) { return; } // rôle inconnu : pas d'assistant
    demarrer(systeme);
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", demarrage); }
  else { demarrage(); }
})();
