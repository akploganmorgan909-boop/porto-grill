(function () {
  "use strict";

  // La connexion à la base est celle de commun.js (PG.sb)
  var sb = (window.PG && window.PG.sb) || window.supabaseClient || null;
  if (!sb) return;

  var compteur = document.getElementById("compteurAlertes");
  var banniere = document.getElementById("banniereAlertes");
  var liste = document.getElementById("listeAlertes");
  var btnVoir = document.getElementById("btnVoirAlertes");

  function formaterDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" });
    } catch (e) { return iso; }
  }

  function chargerNotifications() {
    sb.from("notifications_patron")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(function (res) {
        if (res.error) {
          console.error("Erreur notifs:", res.error);
          return;
        }
        var notifs = res.data || [];
        var nonLues = notifs.filter(function (n) { return !n.lu; });

        if (compteur) {
          compteur.textContent = nonLues.length;
          compteur.hidden = nonLues.length === 0;
        }

        if (banniere) {
          banniere.hidden = nonLues.length === 0;
        }

        if (liste) {
          liste.replaceChildren();
          if (notifs.length === 0) {
            var vide = document.createElement("p");
            vide.className = "aide";
            vide.textContent = "Aucune alerte pour le moment.";
            liste.appendChild(vide);
            return;
          }

          notifs.forEach(function (n) {
            var div = document.createElement("div");
            div.className = "alerte-item" + (n.lu ? " is-read" : "");

            // Le texte est toujours inséré comme du texte (jamais comme du code HTML)
            var info = document.createElement("div");
            var texte = document.createElement("p");
            texte.className = "alerte-text";
            texte.textContent = "🔑 " + (n.message || "Modification de mot de passe");
            var date = document.createElement("p");
            date.className = "alerte-date";
            date.textContent = "Le " + formaterDate(n.created_at);
            info.appendChild(texte);
            info.appendChild(date);
            div.appendChild(info);

            if (!n.lu) {
              var btnVu = document.createElement("button");
              btnVu.className = "btn btn-small btn-primary";
              btnVu.type = "button";
              btnVu.textContent = "J'ai vu ✓";
              btnVu.onclick = function () {
                sb.from("notifications_patron").update({ lu: true }).eq("id", n.id).then(function () {
                  chargerNotifications();
                });
              };
              div.appendChild(btnVu);
            } else {
              var vuTxt = document.createElement("span");
              vuTxt.style.opacity = "0.6";
              vuTxt.style.fontSize = "0.85rem";
              vuTxt.textContent = "Vu ✓";
              div.appendChild(vuTxt);
            }

            liste.appendChild(div);
          });
        }
      });
  }

  if (btnVoir) {
    btnVoir.onclick = function () {
      var tabBtn = document.querySelector('[data-tab="alertes"]');
      if (tabBtn) tabBtn.click();
    };
  }

  try {
    sb.channel("live-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications_patron" }, function () {
        chargerNotifications();
      })
      .subscribe();
  } catch (e) { /* temps réel indisponible */ }

  chargerNotifications();
})();
