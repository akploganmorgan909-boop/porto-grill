/* =========================================================
   PORTO GRILL - script.js
   Sommaire
   1. Réglages et petits outils
   2. Menu mobile
   3. Apparition au défilement
   4. Filtres du menu
   5. Galerie et fenêtre d'agrandissement
   6. Horaires : indicateur Ouvert / Fermé
   7. Boutons d'appel et WhatsApp
   8. Formulaire de demande
   9. Démarrage
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     1. RÉGLAGES ET PETITS OUTILS
     ========================================================= */

  // Dit au HTML que le script fonctionne (voir le petit script dans <head>)
  window.portoGrillReady = true;

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fuseau horaire du restaurant
  var FUSEAU = "Africa/Porto-Novo";

  // Horaires : [ouverture, fermeture] en minutes depuis minuit.
  // 1440 = minuit. 1470 = 00 h 30 le lendemain (le restaurant ferme après minuit).
  // Clés : 0 = dimanche, 1 = lundi ... 6 = samedi. null = fermé.
  var HORAIRES = {
    0: [570, 1470],  // dimanche 9 h 30 - 0 h 30
    1: null,         // lundi fermé
    2: [720, 1440],  // mardi 12 h - 0 h
    3: [720, 1440],  // mercredi
    4: [720, 1440],  // jeudi
    5: [720, 1440],  // vendredi
    6: [570, 1470]   // samedi 9 h 30 - 0 h 30
  };
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  // Numéro fourni pour le projet
  var TELEPHONE = "01 61 18 37 16";
  // Même numéro au format international pour WhatsApp (229 + 10 chiffres)
  var WHATSAPP = "2290161183716";

  // 570 -> "09 h 30"
  function formatHeure(minutes) {
    var m = minutes % 1440;
    var h = Math.floor(m / 60);
    var r = m % 60;
    return String(h).padStart(2, "0") + " h " + String(r).padStart(2, "0");
  }

  // Date et heure actuelles au Bénin : { jour, minutes, dateISO }
  function maintenantAuBenin() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: FUSEAU, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "numeric", minute: "numeric", hourCycle: "h23"
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var jours = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        jour: jours[o.weekday],
        minutes: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10),
        dateISO: o.year + "-" + o.month + "-" + o.day
      };
    } catch (e) {
      // Secours : le Bénin est à UTC+1, sans changement d'heure
      var d = new Date(Date.now() + 3600000);
      return {
        jour: d.getUTCDay(),
        minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
        dateISO: d.toISOString().slice(0, 10)
      };
    }
  }

  // Jour de la semaine d'une date "AAAA-MM-JJ"
  function jourDeLaDate(dateISO) {
    return new Date(dateISO + "T12:00:00Z").getUTCDay();
  }


  /* =========================================================
     2. MENU MOBILE
     ========================================================= */
  function initMenuMobile() {
    var bouton = $("#menuToggle");
    var nav = $("#siteNav");
    if (!bouton || !nav) { return; }

    function ouvrir(ouvert) {
      nav.classList.toggle("is-open", ouvert);
      bouton.setAttribute("aria-expanded", ouvert ? "true" : "false");
    }

    bouton.addEventListener("click", function () {
      ouvrir(bouton.getAttribute("aria-expanded") !== "true");
    });

    // Le menu se referme après le clic sur un lien
    $$("a", nav).forEach(function (lien) {
      lien.addEventListener("click", function () { ouvrir(false); });
    });

    // Touche Échap : ferme le menu et remet le focus sur le bouton
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bouton.getAttribute("aria-expanded") === "true") {
        ouvrir(false);
        bouton.focus();
      }
    });

    // Sur grand écran, le menu est toujours visible
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1100) { ouvrir(false); }
    });
  }


  /* =========================================================
     3. APPARITION AU DÉFILEMENT
     ========================================================= */
  function initApparitions() {
    var elements = $$("[data-reveal]");
    if (!elements.length) { return; }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add("is-visible");
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });

    elements.forEach(function (el) { observateur.observe(el); });
  }


  /* =========================================================
     4. FILTRES DU MENU
     ========================================================= */
  // Une image manquante (fichier absent) devient un cadre élégant avec son titre, au lieu d'un trou
  function initImagesManquantes() {
    function marquer(img) {
      var parent = img.parentElement;
      if (!parent || parent.classList.contains("img-vide")) { return; }
      img.hidden = true;
      parent.classList.add("img-vide");
      var etiquette = document.createElement("span");
      etiquette.className = "img-vide-texte";
      etiquette.textContent = (img.getAttribute("alt") || "Photo à venir").replace(/\s*\(image d’illustration\)/, "");
      parent.insertBefore(etiquette, img);
    }
    $$("img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) { marquer(img); }
      else { img.addEventListener("error", function () { marquer(img); }); }
    });
  }

  function initFiltres() {
    var boutons = $$(".filter-btn");
    var plats = $$(".dish");
    if (!boutons.length) { return; }

    boutons.forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        var categorie = bouton.getAttribute("data-filter");

        boutons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === bouton ? "true" : "false");
        });

        plats.forEach(function (plat) {
          var visible = categorie === "all" || plat.getAttribute("data-category") === categorie;
          plat.hidden = !visible;
        });
      });
    });
  }


  /* =========================================================
     5. GALERIE ET FENÊTRE D'AGRANDISSEMENT
     ========================================================= */
  function initGalerie() {
    var liens = $$(".gallery-link");
    var fenetre = $("#lightbox");
    if (!liens.length || !fenetre || typeof fenetre.showModal !== "function") {
      return; // Sans fenêtre, chaque lien ouvre simplement l'image
    }

    var image = $("#lightboxImage");
    var legende = $("#lightboxCaption");
    var courant = 0;
    var declencheur = null;

    function afficher(i) {
      courant = (i + liens.length) % liens.length;
      var lien = liens[courant];
      var miniature = $("img", lien);
      image.src = lien.getAttribute("href");
      image.alt = miniature ? miniature.alt : "";
      legende.textContent = lien.getAttribute("data-caption") || "";
    }

    function ouvrir(i) {
      declencheur = document.activeElement;
      afficher(i);
      fenetre.showModal();
    }

    liens.forEach(function (lien, i) {
      lien.addEventListener("click", function (e) {
        e.preventDefault();
        ouvrir(i);
      });
    });

    $("#lightboxClose").addEventListener("click", function () { fenetre.close(); });
    $("#lightboxPrev").addEventListener("click", function () { afficher(courant - 1); });
    $("#lightboxNext").addEventListener("click", function () { afficher(courant + 1); });

    // Un clic en dehors de la photo ferme la fenêtre
    fenetre.addEventListener("click", function (e) {
      if (e.target === fenetre) { fenetre.close(); }
    });

    // Flèches du clavier (la touche Échap ferme la fenêtre d'elle-même)
    fenetre.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { afficher(courant - 1); }
      if (e.key === "ArrowRight") { afficher(courant + 1); }
    });

    // Balayage sur mobile
    var departX = 0;
    fenetre.addEventListener("touchstart", function (e) {
      departX = e.changedTouches[0].clientX;
    }, { passive: true });
    fenetre.addEventListener("touchend", function (e) {
      var ecart = e.changedTouches[0].clientX - departX;
      if (Math.abs(ecart) > 50) { afficher(courant + (ecart < 0 ? 1 : -1)); }
    }, { passive: true });

    // À la fermeture : on vide l'image et on remet le focus où il était
    fenetre.addEventListener("close", function () {
      image.removeAttribute("src");
      if (declencheur && typeof declencheur.focus === "function") { declencheur.focus(); }
    });
  }


  /* =========================================================
     6. HORAIRES : OUVERT / FERMÉ
     ========================================================= */
  function initHoraires() {
    var bloc = $("#openStatus");
    if (!bloc) { return; }
    var texte = $(".status-text", bloc);

    function mettreAJour() {
      var n = maintenantAuBenin();
      var aujourdhui = HORAIRES[n.jour];
      var hier = HORAIRES[(n.jour + 6) % 7];
      var fermetureA = null;

      // Ouvert dans la journée en cours ?
      if (aujourdhui && n.minutes >= aujourdhui[0] && n.minutes < aujourdhui[1]) {
        fermetureA = aujourdhui[1];
      }
      // Ou encore ouvert après minuit, grâce à la veille ?
      else if (hier && hier[1] > 1440 && n.minutes < hier[1] - 1440) {
        fermetureA = hier[1];
      }

      // On surligne la ligne du jour dans le tableau
      $$("#hoursTable tr").forEach(function (ligne) {
        ligne.classList.toggle("is-today", parseInt(ligne.getAttribute("data-day"), 10) === n.jour);
      });

      if (fermetureA !== null) {
        bloc.classList.add("is-open");
        bloc.classList.remove("is-closed");
        texte.textContent = "Ouvert, ferme à " + formatHeure(fermetureA);
        return;
      }

      bloc.classList.add("is-closed");
      bloc.classList.remove("is-open");

      // Prochaine ouverture
      for (var i = 0; i < 8; i++) {
        var jour = (n.jour + i) % 7;
        var h = HORAIRES[jour];
        if (h && (i > 0 || n.minutes < h[0])) {
          var quand = i === 0 ? "" : (i === 1 ? " demain" : " " + JOURS[jour]);
          texte.textContent = "Fermé, ouvre" + quand + " à " + formatHeure(h[0]);
          return;
        }
      }
    }

    mettreAJour();
    setInterval(mettreAJour, 60000);
  }


  /* =========================================================
     7. BOUTONS D'APPEL ET WHATSAPP
     ========================================================= */

  // Numéro béninois à 10 chiffres commençant par 01 (ou ancien format à 8 chiffres),
  // ou numéro international commençant par +
  function telephoneValide(valeur) {
    var texte = String(valeur).trim();
    var chiffres = texte.replace(/[^\d+]/g, "");
    if (chiffres.charAt(0) === "+") { return /^\+\d{8,15}$/.test(chiffres); }
    return /^01\d{8}$/.test(chiffres) || /^\d{8}$/.test(chiffres);
  }

  function initAppel() {
    // On vérifie le format du numéro fourni avant d'afficher les boutons d'appel
    var valide = telephoneValide(TELEPHONE);
    $$('a[href^="tel:"]').forEach(function (lien) {
      lien.hidden = !valide;
    });
  }


  /* =========================================================
     8. FORMULAIRE DE DEMANDE
     Le formulaire n'envoie rien : il prépare un résumé à transmettre.
     ========================================================= */
  function initFormulaire() {
    var form = $("#bookingForm");
    if (!form) { return; }

    var resultat = $("#formResult");
    var zoneTexte = $("#requestText");
    var retour = $("#copyFeedback");
    var champDate = $("#date");

    // Date minimale : aujourd'hui, au Bénin
    champDate.setAttribute("min", maintenantAuBenin().dateISO);

    // Une règle par champ : renvoie un message d'erreur, ou "" si tout va bien
    var regles = {
      nom: function (v) {
        return v.trim().length >= 3 ? "" : "Écrivez votre nom et votre prénom (3 lettres minimum).";
      },
      telephone: function (v) {
        return telephoneValide(v) ? "" : "Entrez un numéro valide, par exemple 01 00 00 00 00, ou un numéro international commençant par +.";
      },
      date: function (v) {
        if (!v) { return "Choisissez une date."; }
        var n = maintenantAuBenin();
        if (v < n.dateISO) { return "Cette date est déjà passée."; }
        if (!HORAIRES[jourDeLaDate(v)]) { return "Le restaurant est fermé le lundi. Choisissez un autre jour."; }
        return "";
      },
      heure: function (v) {
        if (!v) { return "Choisissez une heure."; }
        var p = v.split(":");
        var minutes = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
        var dateChoisie = champDate.value;
        if (dateChoisie) {
          var h = HORAIRES[jourDeLaDate(dateChoisie)];
          if (h) {
            var derniere = Math.min(h[1] - 30, 1439);
            if (minutes < h[0] || minutes > derniere) {
              return "Ce jour-là, vous pouvez demander une table de " + formatHeure(h[0]) + " à " + formatHeure(derniere) + ".";
            }
          }
          var n = maintenantAuBenin();
          if (dateChoisie === n.dateISO && minutes <= n.minutes) { return "Cette heure est déjà passée."; }
        }
        return "";
      },
      personnes: function (v) {
        return v ? "" : "Indiquez le nombre de personnes.";
      }
    };

    // Vérifie un champ et affiche ou efface son message
    function verifier(nom) {
      var champ = form.elements[nom];
      var message = regles[nom](champ.value);
      var zoneErreur = $("#" + nom + "-erreur");
      zoneErreur.textContent = message;
      if (message) { champ.setAttribute("aria-invalid", "true"); }
      else { champ.removeAttribute("aria-invalid"); }
      return message === "";
    }

    Object.keys(regles).forEach(function (nom) {
      var champ = form.elements[nom];
      champ.addEventListener("blur", function () { verifier(nom); });
      champ.addEventListener("input", function () {
        if (champ.getAttribute("aria-invalid") === "true") { verifier(nom); }
      });
    });

    // Quand la date change, l'heure doit être revérifiée
    champDate.addEventListener("change", function () {
      if (form.elements.heure.value) { verifier("heure"); }
    });

    // Texte du résumé
    function construireResume() {
      var f = form.elements;
      var dateLisible = new Date(f.date.value + "T12:00:00Z").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
      });
      var personnes = f.personnes.options[f.personnes.selectedIndex].text;
      var lignes = [
        "Demande de table (non confirmée, à valider par le restaurant)",
        "Nom : " + f.nom.value.trim(),
        "Téléphone : " + f.telephone.value.trim(),
        "Date souhaitée : " + dateLisible,
        "Heure souhaitée : " + f.heure.value.replace(":", " h "),
        "Nombre de personnes : " + personnes
      ];
      if (f.message.value.trim()) { lignes.push("Message : " + f.message.value.trim()); }
      return lignes.join("\n");
    }

    function afficherResultat(texte) {
      zoneTexte.value = texte;
      retour.textContent = "";
      form.hidden = true;
      resultat.hidden = false;
      resultat.focus();

      // Bouton WhatsApp : seulement si un numéro international confirmé a été renseigné dans le HTML
      var wa = $("#whatsappLink");
      var numero = wa ? (wa.getAttribute("data-whatsapp") || "").replace(/\D/g, "") : "";
      if (wa) {
        if (/^\d{8,15}$/.test(numero)) {
          wa.href = "https://wa.me/" + numero + "?text=" + encodeURIComponent(texte);
          wa.target = "_blank";
          wa.rel = "noopener";
          wa.hidden = false;
        } else {
          wa.hidden = true;
        }
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var tousValides = true;
      Object.keys(regles).forEach(function (nom) {
        if (!verifier(nom)) { tousValides = false; }
      });
      if (!tousValides) {
        var premier = $('[aria-invalid="true"]', form);
        if (premier) { premier.focus(); }
        return;
      }
      afficherResultat(construireResume());
    });

    // Copier le résumé
    $("#copyRequest").addEventListener("click", function () {
      var texte = zoneTexte.value;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texte).then(function () {
          retour.textContent = "Résumé copié.";
        }, function () {
          zoneTexte.select();
          retour.textContent = "Copie impossible. Le texte est sélectionné : copiez-le avec Ctrl + C.";
        });
      } else {
        zoneTexte.select();
        retour.textContent = "Le texte est sélectionné : copiez-le avec Ctrl + C.";
      }
    });

    // Revenir au formulaire
    $("#editRequest").addEventListener("click", function () {
      resultat.hidden = true;
      form.hidden = false;
      form.elements.nom.focus();
    });
  }


  /* =========================================================
     9. DÉMARRAGE
     ========================================================= */
  function demarrer() {
    var annee = $("#year");
    if (annee) { annee.textContent = new Date().getFullYear(); }

    initMenuMobile();
    initApparitions();
    initImagesManquantes();
    initFiltres();
    initGalerie();
    initHoraires();
    initAppel();
    initFormulaire();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
