// Service worker minimal : juste ce qu'il faut pour que le site soit installable.
// Il ne met rien en cache pour l'instant : chaque visite va chercher la dernière version en ligne.
self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  // Laisse passer toutes les requêtes normalement (pas de mode hors connexion pour l'instant).
  e.respondWith(fetch(e.request));
});
