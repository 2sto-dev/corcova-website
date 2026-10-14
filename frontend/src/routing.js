export function cleanInternalHref(value, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate) || candidate.includes('\\')) return fallback;
  if (candidate.startsWith('#/')) return cleanInternalHref(candidate.slice(1), fallback);
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(candidate)) return candidate;
  if (/^tel:[+0-9().\s-]+$/i.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch {
    return fallback;
  }
  return fallback;
}

export function cleanMediaSrc(value, fallback = '') {
  const candidate = cleanInternalHref(value, fallback);
  if (candidate.startsWith('/') || candidate.startsWith('https://') || candidate.startsWith('http://')) return candidate;
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
