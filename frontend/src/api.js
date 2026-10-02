import { useEffect, useState } from 'react';
import siteData from './site.json';
import navData from './navigation.json';
import pagesData from './content.json';
import docsData from './documents.json';
import monitorData from './monitor.json';

export const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const siteSlug = import.meta.env.VITE_SITE_SLUG || 'corcova';
export const siteApi = `${apiBase}/sites/${encodeURIComponent(siteSlug)}`;

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
      filtered = filtered.filter(d => d.page_slug === pageSlug || (Array.isArray(d.page_slugs) && d.page_slugs.includes(pageSlug)));
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

export function useApi(url) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url), url });

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false, url });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true, url });

    // Try fetching from real backend first with a fast timeout
    const fetchTimeout = setTimeout(() => controller.abort(), 1200);

    fetch(url, { signal: controller.signal })
      .then(async response => {
        clearTimeout(fetchTimeout);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Pagina nu a fost găsită.' : 'Eroare încărcare.');
        }
        return response.json();
      })
      .then(data => {
        setState({ data, error: null, loading: false, url });
      })
      .catch(error => {
        clearTimeout(fetchTimeout);
        // Fallback to local embedded dataset
        const local = resolveLocalEndpoint(url);
        if (local !== null) {
          setState({ data: local, error: null, loading: false, url });
        } else {
          setState({
            data: null,
            error: error.name === 'AbortError'
              ? (resolveLocalEndpoint(url) ? null : 'Informațiile nu pot fi încărcate acum.')
              : (error.message || 'Pagina nu a fost găsită.'),
            loading: false,
            url
          });
        }
      });

    return () => {
      clearTimeout(fetchTimeout);
      controller.abort();
    };
  }, [url]);

  return state.url === url ? state : { data: null, error: null, loading: Boolean(url) };
}

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
