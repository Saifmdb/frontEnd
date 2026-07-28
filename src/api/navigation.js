/**
 * Permet à du code hors de l'arbre React (ex: l'intercepteur axios dans
 * client.js) de déclencher une navigation React Router au lieu d'un
 * window.location.href, qui recharge toute la page et coupe net ce que
 * l'utilisateur était en train de faire (ex: une conversation avec le chatbot).
 */
let navigateRef = null;

export function setNavigate(fn) {
  navigateRef = fn;
}

export function navigateTo(path, options) {
  if (navigateRef) {
    navigateRef(path, options);
    return true;
  }
  return false;
}
