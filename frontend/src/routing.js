export function cleanInternalHref(value, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  if (value.startsWith('#/')) return value.slice(1);
  if (/^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  return fallback;
}

export function currentSlug() {
  return window.location.pathname.replace(/^\/+|\/+$/g, '');
}

/** Keep ordinary browser behaviour for files, external links and modified clicks. */
export function clientRouteForAnchor(anchor, event = {}) {
  if (!anchor || event.defaultPrevented || (event.button !== undefined && event.button !== 0)
    || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return null;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#')) return null;

  let url;
  try { url = new URL(href, window.location.href); } catch { return null; }
  if (url.origin !== window.location.origin || url.protocol !== window.location.protocol || url.hash) return null;
  if (/^\/(?:api|admin|static|media|uploads|wp-content)(?:\/|$)/i.test(url.pathname)
    || /\/download\/?$/i.test(url.pathname)
    || /\.[a-z\d]{1,8}$/i.test(url.pathname.split('/').pop() || '')) return null;

  const destination = `${url.pathname}${url.search}`;
  return destination === `${window.location.pathname}${window.location.search}` ? null : destination;
}

export function replaceLegacyHashRoute() {
  if (!window.location.hash.startsWith('#/')) return false;
  window.history.replaceState(null, '', cleanInternalHref(window.location.hash));
  return true;
}
