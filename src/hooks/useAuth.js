import { useCallback } from 'react';
import { msalLogout, clearMsalCache } from '../msalInstance';

/**
 * Lit et normalise l'identité utilisateur stockée en localStorage après le login.
 * Le backend attend désormais une identité vérifiée (cookie de session ou
 * `Authorization: Bearer <temp_token>`) — ce hook ne sert plus qu'à afficher
 * l'utilisateur côté UI et à fournir le token au client API partagé
 * (voir src/api/client.js), plus jamais à construire des paramètres
 * `?username=`/`?matricule=` envoyés au backend.
 */
function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readStoredProfile() {
  try {
    const raw = localStorage.getItem('employee_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalize(user, profile) {
  if (!user) {
    return {
      user: null,
      isAuthenticated: false,
      role: null,
      matricule: null,
      username: null,
      department: null,
      isAdmin: false,
      isRH: false,
      isOrganizer: false,
      isEmployee: false,
      token: null,
    };
  }

  const role = user.role || user.profile?.role || null;
  const matricule = user.matricule || user.profile?.matricule || profile?.matricule || null;
  const department =
    user.depatement || user.department ||
    user.profile?.depatement || user.profile?.department ||
    profile?.depatement || profile?.department || null;
  const departmentIsRH = String(department || '').toUpperCase() === 'RH';

  return {
    user,
    isAuthenticated: true,
    role,
    matricule,
    username: user.username || null,
    department,
    isAdmin: role === 'ADMIN',
    isRH: role === 'RH' || departmentIsRH,
    isOrganizer: role === 'ORGANIZER',
    isEmployee: role === 'EMPLOYEE',
    token: localStorage.getItem('temp_token'),
  };
}

export function useAuth() {
  const user = readStoredUser();
  const profile = readStoredProfile();
  const auth = normalize(user, profile);

  const logout = useCallback(async () => {
    try {
      await msalLogout();
    } catch {
      clearMsalCache();
    }
    ['user', 'employee_profile', 'access_token', 'auth_token', 'temp_token',
     'microsoft_auth', 'userId', 'userId_numeric'].forEach((k) => localStorage.removeItem(k));
  }, []);

  return { ...auth, logout };
}

export default useAuth;
