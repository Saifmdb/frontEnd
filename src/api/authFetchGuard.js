import { forceLogoutOnUnauthorized } from './client';

/**
 * De nombreuses pages du site appellent encore le backend via fetch() brut
 * plutôt que via l'instance axios partagée (client.js), qui elle seule a un
 * intercepteur 401. Ce garde global patche window.fetch une seule fois au
 * démarrage de l'app pour que, où que la requête soit faite dans le site,
 * un 401 provenant de notre API (token expiré / session invalide) déclenche
 * toujours la même déconnexion immédiate — pas seulement sur la page chatbot.
 *
 * Ne s'applique qu'aux requêtes vers notre propre backend (URL contenant
 * "/api/"), pour ne jamais interférer avec les appels externes (Microsoft
 * Graph, Google OAuth, etc.).
 */
let installed = false;

export function installAuthFetchGuard() {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (response.status === 401 && url.includes('/api/')) {
        forceLogoutOnUnauthorized();
      }
    } catch {
      // Ne jamais bloquer la réponse originale à cause du garde.
    }

    return response;
  };
}
