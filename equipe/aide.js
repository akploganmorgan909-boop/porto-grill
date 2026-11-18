/* =========================================================
   PORTO GRILL - Centre d'aide intégré (niveau 1, sans IA)
   Un bouton "Aide" dans chaque espace : guide pas à pas + questions fréquentes.
   Le guide s'ouvre tout seul à la première visite (une fois par appareil et par espace).
   Pour modifier un texte : changer la section AIDE ci-dessous.
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     AIDE : les textes de chaque espace
     ========================================================= */
  var AIDE = {
    serveur: {
      titre: "Aide du serveur",
      etapes: [
        "Choisir la table : écrivez le nom de la table ou du client (ex. « Table 7 »), choisissez sa zone, puis touchez « Ouvrir cette table ». Si la table existe déjà, touchez-la simplement.",
        "Ajouter les plats : écrivez le plat et son prix lus sur la brochure, la quantité, puis touchez « Ajouter ». Vous pouvez aussi chercher dans « Plats déjà enregistrés ».",
        "Envoyer : touchez « Envoyer à la cuisine » (barre en bas). Le ticket apparaît tout de suite chez le cuisinier.",
        "Suivre : dans « Mes commandes », vous entendez un bip quand la cuisine a terminé (« Prête »).",
        "Servir : apportez les plats, puis touchez « Marquer servie ».",
        "Encaisser : dans « Notes de table à encaisser », choisissez le mode de paiement et touchez « Encaisser toute la table ». Une table que vous aviez écrite disparaît ensuite."
      ],
      questions: [
        ["La table veut commander autre chose ?", "Choisissez la même table, ajoutez les plats et envoyez. La cuisine reçoit un nouveau ticket, et « Mes commandes » réunit tout sur une seule note avec un seul total."],
        ["La commande tarde ?", "Dans « Mes commandes », touchez « 🔔 Relancer la cuisine » sur la commande. La cuisine sonne. Vous pouvez relancer une fois par minute."],
        ["Je me suis trompé dans une commande ?", "Tant que la cuisine n'a pas commencé, touchez « Annuler » sur la commande, puis refaites-la correctement."],
        ["Comment retirer une table ?", "Choisissez-la, puis touchez « Retirer la table choisie ». Cela ne marche que si elle n'a plus rien à encaisser."],
        ["Je ne vois pas ma commande ?", "Vous ne voyez que VOS commandes. Vérifiez qu'un message rouge n'est pas apparu à l'envoi : il reste affiché tant qu'on ne le touche pas."]
      ]
    },
    cuisine: {
      titre: "Aide de la cuisine",
      etapes: [
        "Au début du service, touchez le gros bouton « Touchez ici pour activer le son ». Il active aussi la garde de l'écran allumé.",
        "À chaque nouvelle commande, vous entendez deux notes et un ticket apparaît : table, zone, heure, plats et notes.",
        "Touchez « En préparation » quand vous commencez.",
        "Touchez « Prête ✓ » quand c'est terminé : le serveur est prévenu par un bip.",
        "La bande « Total à préparer » en haut additionne chaque plat à faire.",
        "L'onglet « Réservations du jour » montre les arrivées prévues."
      ],
      questions: [
        ["À quoi servent les couleurs ?", "Vert : moins de 10 minutes. Cuivre : entre 10 et 20 minutes. Rouge : plus de 20 minutes. Servez les rouges en priorité."],
        ["Que veut dire « 🔔 Le serveur relance » ?", "Un serveur demande des nouvelles de la commande. Vous entendez une sonnerie plus pressante et le ticket clignote."],
        ["Je n'entends rien ?", "Touchez de nouveau le bouton d'activation du son s'il est visible, et vérifiez le volume de l'appareil. Le son ne marche que si la page reste ouverte."],
        ["Pourquoi je ne vois pas les prix ?", "C'est voulu : la cuisine ne voit jamais les prix ni les ventes."]
      ]
    },
    caissier: {
      titre: "Aide du caissier",
      etapes: [
        "Choisissez la journée en haut. Par défaut, c'est le service en cours (de 6 h du matin à 6 h le lendemain).",
        "Lisez les cartes de couleur : argent encaissé, pas encore encaissé, nombre de commandes et commandes annulées.",
        "Chaque serveur a sa carte avec l'argent attendu par mode de paiement (espèces, Mobile Money, carte).",
        "Comptez l'argent remis par le serveur, écrivez le montant dans la case et touchez « Clôturer ». L'écart s'affiche en vert (aucun) ou en rouge. C'est définitif.",
        "L'onglet « Transactions » montre toutes les commandes, avec les plats et les prix. Filtrez par serveur si besoin.",
        "En fin de service, touchez « Clôturer la journée ». Le patron est prévenu avec l'heure de clôture."
      ],
      questions: [
        ["Je me suis trompé de montant après avoir clôturé ?", "Un point clôturé ne peut plus être modifié. Prévenez le patron, qui peut le voir et décider."],
        ["Un serveur n'a pas encaissé toutes ses commandes ?", "Un avertissement orange l'indique sur sa carte. Demandez-lui d'encaisser avant de clôturer son point."],
        ["Je clôture la journée alors qu'il manque des points ?", "C'est permis après un avertissement, mais le patron verra combien de points n'étaient pas clôturés."],
        ["Pourquoi la journée change à 6 h et pas à minuit ?", "Pour qu'un service qui finit tard dans la nuit reste dans la même journée."]
      ]
    },
    patron: {
      titre: "Aide du patron",
      etapes: [
        "Tableau de bord : vos ventes et la liste des dernières clôtures de journée faites par le caissier.",
        "Menu et prix : ajoutez les plats, mettez leur prix, rendez-les disponibles ou non.",
        "Tables : gérez vos tables fixes (ajouter, désactiver). Les tables écrites par les serveurs disparaissent seules après encaissement.",
        "Pour voir ce que voit chaque rôle, ouvrez avec votre compte patron les pages serveur.html, cuisine.html et caissier.html du dossier equipe.",
        "Quand le caissier clôture la journée, un message s'affiche sur cette page tant qu'elle est ouverte."
      ],
      questions: [
        ["Comment supprimer une table ?", "Désactivez-la : elle disparaît chez les serveurs. Une table qui a déjà reçu des commandes ne peut pas être effacée, pour garder l'historique des ventes."],
        ["Comment créer le compte d'un employé ?", "Ouvrez l'onglet « Personnel », remplissez le nom, l'adresse e-mail, un mot de passe et le rôle, puis touchez « Créer le compte »."],
        ["Comment repérer une fraude ?", "Comparez les écarts de caisse des clôtures, les commandes annulées et les commandes non encaissées. Le tableau de bord complet arrive."]
      ],
      sections: [
        ["Créer le compte d'un nouvel employé", [
          "Ouvrez l'onglet « Personnel ».",
          "Écrivez son nom, son adresse e-mail, un mot de passe d'au moins 8 caractères (différent de celui de sa messagerie) et son rôle : serveur, cuisine ou caissier.",
          "Touchez « Créer le compte ». L'employé apparaît dans la liste.",
          "Donnez-lui son adresse e-mail et son mot de passe en main propre, et dites-lui de ne jamais les partager."
        ]],
        ["Un employé part : couper son accès", [
          "Dans l'onglet « Personnel », touchez « Bloquer » sur sa ligne. L'effet est immédiat, même s'il est encore connecté sur son téléphone.",
          "Son historique de ventes reste : rien n'est effacé, et vous pouvez le réactiver plus tard avec « Réactiver ».",
          "Pour un remplaçant, créez un NOUVEAU compte à son nom. Ne lui donnez jamais le compte de l'ancien : ses ventes seraient attribuées à la mauvaise personne."
        ]],
        ["Changer le mot de passe d'un employé", [
          "Dans l'onglet « Personnel », écrivez le nouveau mot de passe (8 caractères minimum) dans la case de sa ligne, puis touchez « Changer le mot de passe ».",
          "Donnez-le-lui en main propre."
        ]],
        ["Soupçon de fraude : agir vite", [
          "Touchez « Bloquer » sur le compte de la personne tout de suite. Ne supprimez rien : toutes les preuves restent.",
          "Si le soupçon touche la caisse, changez aussi le mot de passe du caissier.",
          "Comparez ensuite les écarts de caisse, les commandes annulées et les commandes non encaissées."
        ]]
      ]
    }
  };

  /* =========================================================
     OUTILS
     ========================================================= */
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

  function dejaVu(role) { try { return localStorage.getItem("pg_aide_" + role) === "1"; } catch (e) { return true; } }
  function marquerVu(role) { try { localStorage.setItem("pg_aide_" + role, "1"); } catch (e) { /* facultatif */ } }

  /* =========================================================
     FENÊTRE D'AIDE
     ========================================================= */
  function demarrer() {
    var role = document.body.getAttribute("data-aide");
    if (!role || !AIDE[role]) { return; }
    if (typeof HTMLDialogElement === "undefined") { return; }

    var bouton = el("button", { type: "button", "class": "aide-btn", "aria-label": "Ouvrir l'aide", text: "?" });
    var boite = el("dialog", { "class": "aide-dialog", "aria-labelledby": "aideTitre" });
    document.body.appendChild(bouton);
    document.body.appendChild(boite);

    function afficher(roleAffiche) {
      var a = AIDE[roleAffiche];
      boite.replaceChildren();
      var tete = el("div", { "class": "aide-tete" }, [el("h2", { id: "aideTitre", text: a.titre })]);
      var fermer = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: "Fermer" });
      fermer.addEventListener("click", function () { boite.close(); });
      tete.appendChild(fermer);
      boite.appendChild(tete);

      if (role === "patron") {   // le patron peut lire l'aide des autres rôles (formation du personnel)
        var choix = el("select", { "aria-label": "Aide de quel rôle ?" }, Object.keys(AIDE).map(function (r) {
          var o = el("option", { value: r, text: AIDE[r].titre });
          if (r === roleAffiche) { o.selected = true; }
          return o;
        }));
        choix.addEventListener("change", function () { afficher(choix.value); });
        boite.appendChild(el("div", { "class": "aide-choix" }, [choix]));
      }

      boite.appendChild(el("h3", { text: "Pas à pas" }));
      boite.appendChild(el("ol", { "class": "aide-etapes" }, a.etapes.map(function (t) { return el("li", { text: t }); })));
      boite.appendChild(el("h3", { text: "Questions fréquentes" }));
      a.questions.forEach(function (q) {
        boite.appendChild(el("details", { "class": "aide-q" }, [el("summary", { text: q[0] }), el("p", { text: q[1] })]));
      });
      afficherSections(a);
    }

    function afficherSections(a) {
      if (!a.sections) { return; }
      boite.appendChild(el("h3", { text: "Gérer le personnel (comptes et accès)" }));
      a.sections.forEach(function (sec) {
        var liste = el("ol", { "class": "aide-etapes aide-etapes-int" });
        sec[1].forEach(function (e) {
          var li = el("li", { text: typeof e === "string" ? e : e.t });
          if (typeof e !== "string" && e.sql) {
            var copier = el("button", { type: "button", "class": "btn btn-ghost btn-small", text: "Copier le texte" });
            copier.addEventListener("click", function () {
              try { navigator.clipboard.writeText(e.sql).then(function () { copier.textContent = "Copié ✓"; }); }
              catch (x) { copier.textContent = "Sélectionnez le texte à la main"; }
            });
            li.appendChild(el("pre", { "class": "aide-sql", text: e.sql }));
            li.appendChild(copier);
          }
          liste.appendChild(li);
        });
        boite.appendChild(el("details", { "class": "aide-q" }, [el("summary", { text: sec[0] }), liste]));
      });
    }

    function ouvrir() { afficher(role); if (!boite.open) { boite.showModal(); } marquerVu(role); }
    bouton.addEventListener("click", ouvrir);
    boite.addEventListener("click", function (e) { if (e.target === boite) { boite.close(); } });   // clic à côté = fermer

    if (!dejaVu(role)) { setTimeout(ouvrir, 1200); }   // première visite : le guide s'ouvre seul
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", demarrer); }
  else { demarrer(); }
})();
