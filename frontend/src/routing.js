export function cleanInternalHref(value, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  if (value.startsWith('#/')) return value.slice(1);
  if (/^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  return fallback;
}

export function currentSlug() {
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

export function replaceLegacyHashRoute() {
  if (!window.location.hash.startsWith('#/')) return false;
  window.history.replaceState(null, '', cleanInternalHref(window.location.hash));
  return true;
}
