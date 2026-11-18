(function () {
  "use strict";

  var sb = window.supabaseClient || (window.supabase && window.CONFIG ? window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY) : null);
  if (!sb) return;

  var compteur = document.getElementById("compteurAlertes");
  var banniere = document.getElementById("banniereAlertes");
  var liste = document.getElementById("listeAlertes");
  var btnVoir = document.getElementById("btnVoirAlertes");

  function formaterDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
          if (notifs.length === 0) {
            liste.innerHTML = '<p class="aide">Aucune alerte pour le moment.</p>';
            return;
          }

          liste.innerHTML = "";
          notifs.forEach(function (n) {
            var div = document.createElement("div");
            div.className = "alerte-item" + (n.lu ? " is-read" : "");
            
            var info = document.createElement("div");
            info.innerHTML = '<p class="alerte-text">🔑 ' + (n.message || "Modification de mot de passe") + '</p>' +
                             '<p class="alerte-date">Le ' + formaterDate(n.created_at) + '</p>';
            div.appendChild(info);

            if (!n.lu) {
              var btnVu = document.createElement("button");
              btnVu.className = "btn btn-small btn-primary";
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

  sb.channel("live-notifs")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications_patron" }, function () {
      chargerNotifications();
    })
    .subscribe();

  document.addEventListener("DOMContentLoaded", chargerNotifications);
  setTimeout(chargerNotifications, 1000);
})();
