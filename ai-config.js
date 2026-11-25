/* =========================================================
   PORTO GRILL - Clé de l'assistant IA (Google Gemini, gratuit)

   1. Va sur https://aistudio.google.com/apikey avec un compte Google.
   2. Clique sur "Create API key" (aucune carte bancaire demandée pour le niveau gratuit).
   3. Copie la clé et colle-la ci-dessous, entre les guillemets.
   4. IMPORTANT, pour limiter les risques : dans https://console.cloud.google.com/apis/credentials,
      ouvre cette clé, section "Restrictions relatives aux applications", choisis
      "Référents HTTP (sites Web)" et ajoute :
        akploganmorgan909-boop.github.io/*
      Ainsi, même si quelqu'un copie la clé, elle ne fonctionnera que depuis ton site.

   Cette clé reste visible dans le navigateur (le site n'a pas de serveur caché) :
   c'est pour ça que l'étape 4 ci-dessus est importante, pas facultative.
   ========================================================= */
window.AI_CONFIG = {
  cle: ""
};
