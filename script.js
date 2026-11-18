(function () {
  "use strict";
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var prix = function (p) {
    return p.split("/").map(function (n) { return n.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }).join(" / ") + "\u00a0F";
  };
  var cats = [], c, s;
  MENU.split("\n").forEach(function (l) {
    l = l.trim(); if (!l) return;
    if (l[0] === "@") { var h = l.slice(1).split("|"); c = { id: h[0], t: h[1], img: h[2], s: [] }; cats.push(c); s = null; }
    else if (l[0] === "#") { s = { t: l.slice(1), i: [] }; c.s.push(s); }
    else { if (!s) { s = { t: "", i: [] }; c.s.push(s); } s.i.push(l.split("|")); }
  });
  var carte = document.getElementById("carte"), chips = document.getElementById("chips");
  cats.forEach(function (k) {
    var a = el("a", "", k.t); a.href = "#" + k.id; chips.appendChild(a);
    var sec = el("section", "cat"); sec.id = k.id;
    if (k.img) { var img = el("img", "ban"); img.src = "img/" + k.img + ".jpg"; img.alt = k.t; img.loading = "lazy"; sec.appendChild(img); } else { sec.className += " noban"; }
    var wrap = el("div", "wrap"); wrap.appendChild(el("h2", "", k.t));
    k.s.forEach(function (g) {
      var box = el("div", "sec");
      if (g.t) box.appendChild(el("h3", "", g.t));
      var ul = el("ul", "items");
      g.i.forEach(function (it) {
        var li = el("li", "item");
        if (it[1]) {
          var row = el("div", "row"); row.appendChild(el("span", "nom", it[0])); row.appendChild(el("i")); row.appendChild(el("b", "px", prix(it[1]))); li.appendChild(row);
        } else { li.appendChild(el("span", "nom", it[0])); }
        if (it[2]) li.appendChild(el("p", "desc", it[2]));
        ul.appendChild(li);
      });
      box.appendChild(ul); wrap.appendChild(box);
    });
    sec.appendChild(wrap); carte.appendChild(sec);
  });
})();

(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var FUSEAU = "Africa/Porto-Novo";
  // Horaires [ouverture, fermeture] en minutes depuis minuit (0 = dimanche ... 6 = samedi, null = fermé)
  var HORAIRES = { 0: [570, 1470], 1: null, 2: [720, 1440], 3: [720, 1440], 4: [720, 1440], 5: [720, 1440], 6: [570, 1470] };
  var formatHeure = function (m) { m = m % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + " h " + String(m % 60).padStart(2, "0"); };
  function maintenant() {
    try {
      var o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: FUSEAU, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { minutes: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10), dateISO: o.year + "-" + o.month + "-" + o.day };
    } catch (e) { var d = new Date(Date.now() + 3600000); return { minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), dateISO: d.toISOString().slice(0, 10) }; }
  }
  var jourDe = function (iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); };
  function telOk(v) {
    var c = String(v).trim().replace(/[^\d+]/g, "");
    if (c.charAt(0) === "+") { return /^\+\d{8,15}$/.test(c); }
    return /^01\d{8}$/.test(c) || /^\d{8}$/.test(c);
  }
  var form = $("#bookingForm"); if (!form) { return; }
  var resultat = $("#formResult"), zone = $("#requestText"), retour = $("#copyFeedback"), champDate = $("#date");
  champDate.setAttribute("min", maintenant().dateISO);
  var regles = {
    nom: function (v) { return v.trim().length >= 3 ? "" : "Écrivez votre nom et votre prénom (3 lettres minimum)."; },
    telephone: function (v) { return telOk(v) ? "" : "Entrez un numéro valide, par exemple 01 00 00 00 00, ou un numéro international commençant par +."; },
    date: function (v) {
      if (!v) { return "Choisissez une date."; }
      if (v < maintenant().dateISO) { return "Cette date est déjà passée."; }
      if (!HORAIRES[jourDe(v)]) { return "Le restaurant est fermé le lundi. Choisissez un autre jour."; }
      return "";
    },
    heure: function (v) {
      if (!v) { return "Choisissez une heure."; }
      var p = v.split(":"), min = parseInt(p[0], 10) * 60 + parseInt(p[1], 10), d = champDate.value;
      if (d) {
        var h = HORAIRES[jourDe(d)];
        if (h) {
          var der = Math.min(h[1] - 30, 1439);
          if (min < h[0] || min > der) { return "Ce jour-là, vous pouvez demander une table de " + formatHeure(h[0]) + " à " + formatHeure(der) + "."; }
        }
        var n = maintenant();
        if (d === n.dateISO && min <= n.minutes) { return "Cette heure est déjà passée."; }
      }
      return "";
    },
    personnes: function (v) { return v ? "" : "Indiquez le nombre de personnes."; }
  };
  function verifier(nom) {
    var c = form.elements[nom], m = regles[nom](c.value);
    $("#" + nom + "-erreur").textContent = m;
    if (m) { c.setAttribute("aria-invalid", "true"); } else { c.removeAttribute("aria-invalid"); }
    return m === "";
  }
  Object.keys(regles).forEach(function (nom) {
    var c = form.elements[nom];
    c.addEventListener("blur", function () { verifier(nom); });
    c.addEventListener("input", function () { if (c.getAttribute("aria-invalid") === "true") { verifier(nom); } });
  });
  champDate.addEventListener("change", function () { if (form.elements.heure.value) { verifier("heure"); } });
  function resume() {
    var f = form.elements;
    var dl = new Date(f.date.value + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    var l = ["Demande de table (non confirmée, à valider par le restaurant)", "Nom : " + f.nom.value.trim(), "Téléphone : " + f.telephone.value.trim(), "Date souhaitée : " + dl, "Heure souhaitée : " + f.heure.value.replace(":", " h "), "Nombre de personnes : " + f.personnes.options[f.personnes.selectedIndex].text];
    if (f.message.value.trim()) { l.push("Message : " + f.message.value.trim()); }
    return l.join("\n");
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    Object.keys(regles).forEach(function (n) { if (!verifier(n)) { ok = false; } });
    if (!ok) { var p = $('[aria-invalid="true"]', form); if (p) { p.focus(); } return; }
    var t = resume(); zone.value = t; retour.textContent = "";
    var wa = $("#whatsappLink"); wa.href = "https://wa.me/" + wa.getAttribute("data-whatsapp") + "?text=" + encodeURIComponent(t);
    form.hidden = true; resultat.hidden = false; resultat.focus();
  });
  $("#copyRequest").addEventListener("click", function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(zone.value).then(function () { retour.textContent = "Résumé copié."; }, function () { zone.select(); retour.textContent = "Copie impossible. Le texte est sélectionné : copiez-le avec Ctrl + C."; });
    } else { zone.select(); retour.textContent = "Le texte est sélectionné : copiez-le avec Ctrl + C."; }
  });
  $("#editRequest").addEventListener("click", function () { resultat.hidden = true; form.hidden = false; form.elements.nom.focus(); });
})();
