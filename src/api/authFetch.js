/**
 * Enveloppe légère autour de fetch() qui attache automatiquement l'identité
 * vérifiée de l'appelant (cookie de session + JWT signé), sans jamais passer
 * par des paramètres `?username=`/`?matricule=` non vérifiés dans l'URL.
 *
 * Utilisée à la place de fetch() nu sur toutes les pages qui appellent les
 * endpoints des apps métier (conges, credit, avance_salaire, reclamation,
 * documents_rh) — le backend n'accepte plus que ce mode d'identification.
 * Garde la même signature que fetch() pour rester un remplacement minimal.
 */
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('temp_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, {
    ...options,
    credentials: options.credentials || 'include',
    headers,
  });
}

export default authFetch;
