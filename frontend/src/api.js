import { useEffect, useState } from 'react';
import siteData from './site.json';
import navData from './navigation.json';
import pagesData from './content.json';
import docsData from './documents.json';
import monitorData from './monitor.json';

export const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const siteSlug = import.meta.env.VITE_SITE_SLUG || 'corcova';
export const siteApi = `${apiBase}/sites/${encodeURIComponent(siteSlug)}`;
const allowLocalFallback = import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true';
const apiCache = new Map();
const SHORT_CACHE_MS = 60_000;
const SITE_CACHE_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 100;

function cachedData(url) {
  const entry = apiCache.get(url);
  if (!entry || !Object.hasOwn(entry, 'data')) return undefined;
  if (entry.expiresAt <= Date.now()) {
    apiCache.delete(url);
    return undefined;
  }
  return entry.data;
}

function remember(url, data) {
  const lifetime = url === `${siteApi}/` || url === `${siteApi}/navigation/` ? SITE_CACHE_MS : SHORT_CACHE_MS;
  apiCache.delete(url);
  apiCache.set(url, { data, expiresAt: Date.now() + lifetime });
  if (apiCache.size > MAX_CACHE_ENTRIES) apiCache.delete(apiCache.keys().next().value);
}

// Mock / Standalone fallback handler for local frontend development
function resolveLocalEndpoint(url) {
  if (!url) return null;
  const cleanUrl = url.split('#')[0];
  const [pathname, searchStr] = cleanUrl.split('?');
  const params = new URLSearchParams(searchStr || '');

  // 1. Site info: /sites/:slug/
  if (pathname.endsWith(`/sites/${siteSlug}`) || pathname.endsWith(`/sites/${siteSlug}/`)) {
    return siteData;
  }

  // 2. Navigation: /sites/:slug/navigation/
  if (pathname.includes('/navigation')) {
    return navData;
  }

  // 3. Monitor registers: /sites/:slug/monitor/registers/
  if (pathname.includes('/monitor/registers')) {
    return {
      count: monitorData.registers.length,
      next: null,
      previous: null,
      results: monitorData.registers
    };
  }

  // 4. Monitor entries: /sites/:slug/monitor/entries/
  if (pathname.includes('/monitor/entries')) {
    const reg = params.get('register') || '';
    const q = (params.get('search') || '').toLowerCase().trim();
    const yr = params.get('year') || '';
    const pageNum = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('page_size') || '20', 10);

    let filtered = monitorData.entries.filter(e => {
      if (reg && e.register !== reg) return false;
      if (yr && String(e.year) !== yr) return false;
      if (q && !e.title.toLowerCase().includes(q) && !(e.number && String(e.number).includes(q))) return false;
      return true;
    });

    const start = (pageNum - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      count: filtered.length,
      next: start + pageSize < filtered.length ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results: paginated
    };
  }

  // 5. Pages list / by parent: /sites/:slug/pages/?parent=...
  if (pathname.endsWith('/pages') || pathname.endsWith('/pages/')) {
    const parentId = params.get('parent');
    const pageNum = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('page_size') || '10', 10);

    let filtered = pagesData;
    if (parentId !== null && parentId !== undefined) {
      const pId = parseInt(parentId, 10);
      filtered = pagesData.filter(p => p.parent === pId);
    }

    const start = (pageNum - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      count: filtered.length,
      next: start + pageSize < filtered.length ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results: paginated
    };
  }

  // 6. Single Page: /sites/:slug/pages/:slug/
  const pageMatch = pathname.match(/\/pages\/([^/]+)\/?$/);
  if (pageMatch) {
    const targetSlug = decodeURIComponent(pageMatch[1]);
    const found = pagesData.find(p => p.slug === targetSlug);
    if (found) {
      return {
        id: found.id,
        title: found.title,
        slug: found.slug,
        body: found.content,
        created_at: found.date,
        updated_at: found.date,
        section: found.parent ? { id: found.parent, title: '' } : null
      };
    }
    // Return null to signal 404
    return null;
  }

  // 7. Documents: /sites/:slug/documents/?...
  if (pathname.includes('/documents')) {
    const pageSlug = params.get('page_slug') || '';
    const q = (params.get('search') || '').toLowerCase().trim();
    const pageNum = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('page_size') || '10', 10);

    let filtered = docsData;
    if (pageSlug) {
      filtered = filtered.filter(d => d.page_slug === pageSlug);
    }
    if (q) {
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.original_filename.toLowerCase().includes(q));
    }

    const start = (pageNum - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      count: filtered.length,
      next: start + pageSize < filtered.length ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results: paginated.map(d => ({
        ...d,
        published_at: d.year ? `${d.year}-01-01` : '2022-01-01'
      }))
    };
  }

  // 8. Search: /sites/:slug/search/?...
  if (pathname.includes('/search')) {
    const q = (params.get('search') || '').toLowerCase().trim();
    const pageNum = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('page_size') || '10', 10);

    if (!q) {
      return { count: 0, next: null, previous: null, results: [] };
    }

    const results = [];
    // Search pages
    for (const p of pagesData) {
      if (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)) {
        results.push({
          title: p.title,
          href: `/${p.slug}`,
          kind: 'page',
          id: p.id
        });
      }
    }
    // Search documents
    for (const d of docsData) {
      if (d.title.toLowerCase().includes(q) || d.original_filename.toLowerCase().includes(q)) {
        results.push({
          title: d.title,
          href: d.download_url,
          kind: 'document',
          id: d.id
        });
      }
    }

    const start = (pageNum - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    return {
      count: results.length,
      next: start + pageSize < results.length ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results: paginated
    };
  }

  return null;
}

/** Shared GET cache also coalesces requests from prefetch and mounted components. */
export function prefetchApi(url) {
  if (!url) return Promise.resolve(null);
  const data = cachedData(url);
  if (data !== undefined) return Promise.resolve(data);
  const pending = apiCache.get(url)?.promise;
  if (pending) return pending;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const promise = fetch(url, { signal: controller.signal })
    .then(async response => {
      if (!response.ok) {
        const error = new Error(response.status === 404 ? 'Pagina nu a fost găsită.' : 'Informațiile nu pot fi încărcate acum.');
        error.status = response.status;
        throw error;
      }
      return response.json();
    })
    .catch(error => {
      const local = allowLocalFallback && error.status !== 404 ? resolveLocalEndpoint(url) : null;
      if (local !== null) return local;
      throw error;
    })
    .then(result => {
      remember(url, result);
      return result;
    })
    .catch(error => {
      apiCache.delete(url);
      throw error;
    })
    .finally(() => clearTimeout(timeout));
  apiCache.set(url, { promise });
  return promise;
}

function initialApiState(url) {
  const data = url ? cachedData(url) : undefined;
  return { data: data ?? null, error: null, loading: Boolean(url) && data === undefined, url };
}

export function useApi(url) {
  const [state, setState] = useState(() => initialApiState(url));

  useEffect(() => {
    if (!url) {
      setState(initialApiState(url));
      return;
    }

    let active = true;
    const data = cachedData(url);
    if (data !== undefined) {
      setState({ data, error: null, loading: false, url });
      return () => { active = false; };
    }

    setState({ data: null, error: null, loading: true, url });
    prefetchApi(url)
      .then(result => {
        if (active) setState({ data: result, error: null, loading: false, url });
      })
      .catch(error => {
        if (!active) return;
        setState({
          data: null,
          error: error.name === 'AbortError'
            ? 'Informațiile nu pot fi încărcate acum. Vă rugăm să reîncercați.'
            : (error.message || 'Informațiile nu pot fi încărcate acum.'),
          loading: false,
          url
        });
      });

    return () => { active = false; };
  }, [url]);

  return state.url === url ? state : initialApiState(url);
}

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
