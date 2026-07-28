import axios from 'axios';
import { navigateTo } from './navigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Client HTTP partagé pour tous les appels au backend.
 *
 * Le backend identifie désormais l'appelant uniquement via le cookie de
 * session (`withCredentials`) ou un JWT vérifié (`Authorization: Bearer`) —
 * plus jamais via des paramètres `?username=`/`?matricule=` dans l'URL.
 * Toute page qui a besoin d'appeler l'API doit utiliser cette instance
 * plutôt que fetch()/axios directement, pour que le token soit toujours
 * attaché automatiquement.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('temp_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Purge les données d'authentification locales et renvoie vers /signin.
 * Appelée dès qu'un appel API (axios ci-dessous, ou fetch() via
 * authFetchGuard.js) reçoit un 401 — le token/la session a expiré ou
 * n'est plus valide, donc on ne laisse jamais l'utilisateur en session
 * "zombie" sur une page protégée.
 *
 * Navigue via React Router (SPA) plutôt que window.location.href : un
 * rechargement complet de la page coupait net ce que l'utilisateur était
 * en train de faire (ex: une conversation en cours avec le chatbot).
 * Si le router n'est pas encore monté (navigate pas encore enregistré),
 * on retombe sur window.location.href en dernier recours.
 */
export function forceLogoutOnUnauthorized() {
  ['user', 'employee_profile', 'access_token', 'auth_token', 'temp_token',
   'microsoft_auth', 'userId', 'userId_numeric'].forEach((k) => localStorage.removeItem(k));
  if (typeof window !== 'undefined' && window.location.pathname !== '/signin') {
    const navigated = navigateTo('/signin', { replace: true });
    if (!navigated) {
      window.location.href = '/signin';
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      forceLogoutOnUnauthorized();
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default apiClient;
