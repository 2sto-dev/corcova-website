import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronUp, FileText, Search, X } from 'lucide-react';
import { apiBase, siteApi, siteSlug, useApi, useDebounce } from './api';
import MonitorLocal from './components/MonitorLocal';
import PageGallery from './components/PageGallery';
import { PAGE_GALLERIES } from './mediaData';

export function ApiSearch({ close }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(query.trim());
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const params = new URLSearchParams({ search: debounced, page_size: 10, page });
  const search = useApi(debounced ? `${siteApi}/search/?${params}` : null);
  const results = search.data?.results || [];

  return (
    <section className="search-panel" aria-label="Căutare pe site" onKeyDown={event => { if (event.key === 'Escape') close(); }}>
      <div className="container">
        <div className="search-input">
          <Search size={22}/>
          <input
            ref={input}
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1); }}
            placeholder="Caută o informație, un formular, un document…"
            aria-label="Caută pe site"
          />
          <button className="icon-button" aria-label="Închide căutarea" onClick={close}>
            <X/>
          </button>
        </div>
        {debounced ? (
          <div className="search-results">
            {search.loading ? (
              <p role="status">Se caută…</p>
            ) : (
              <>
                <p role="status">
                  {results.length
                    ? `Rezultate pentru „${debounced}”`
                    : 'Nu am găsit rezultate. Încearcă un alt cuvânt.'}
                </p>
                {search.error && <p role="alert">{search.error}</p>}
                {results.map((result, index) => (
                  <a key={result.href + index} href={result.href} onClick={close}>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.kind === 'page' ? 'Pagină' : 'Document'}</small>
                    </span>
                    <ArrowUpRight size={18}/>
                  </a>
                ))}
                {(search.data?.previous || search.data?.next) && (
                  <div className="monitor-pagination">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
                    <span>Pagina {page}</span>
                    <button disabled={!search.data?.next} onClick={() => setPage(page + 1)}>Următor</button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="search-hint">Caută informații, hotărâri, dispoziții și documente publice.</p>
        )}
      </div>
    </section>
  );
}

export function ExpandableArticle({ html }) {
  const contentRef = useRef(null);
  const [isClamped, setIsClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
    const el = contentRef.current;
    if (!el) return;
    const checkHeight = () => {
      setIsClamped(el.scrollHeight > 450);
    };
    checkHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(checkHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [html]);

  const toggle = () => {
    if (expanded && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setExpanded(!expanded);
  };

  return (
    <div className={`expandable-wrapper ${isClamped ? (expanded ? 'is-expanded' : 'is-collapsed') : ''}`}>
      <article
        ref={contentRef}
        className="archive-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isClamped && !expanded && <div className="expandable-fade" aria-hidden="true" />}
      {isClamped && (
        <div className="expandable-actions">
          <button
            type="button"
            className="expand-toggle"
            onClick={toggle}
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Restrânge textul' : 'Continuă lectura'}</span>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function CmsPage({ slug }) {
  const monitor = slug === 'monitorul-oficial-local';
  const resource = useApi(monitor ? null : `${siteApi}/pages/${encodeURIComponent(slug)}/`);
  const [documentPage, setDocumentPage] = useState(1);
  const [childrenPage, setChildrenPage] = useState(1);

  useEffect(() => {
    setDocumentPage(1);
    setChildrenPage(1);
  }, [slug]);

  const page = resource.data;
  const documents = useApi(page ? `${siteApi}/documents/?${new URLSearchParams({ page_slug: slug, page: documentPage })}` : null);
  const children = useApi(page ? `${siteApi}/pages/?parent=${page.id}&page=${childrenPage}` : null);

  const sanitized = useMemo(() => {
    const body = new DOMParser().parseFromString(page?.body || '', 'text/html').body;
    body.querySelectorAll('a[href*="/documents/"][href$="/download/"]').forEach(link => link.remove());
    body.querySelectorAll('li,ul,ol,p,strong,hr').forEach(node => {
      if (!node.textContent.trim() || /^\d{4}$/.test(node.textContent.trim())) {
        if (!node.querySelector('img') && !node.querySelector('a')) {
          node.remove();
        }
      }
    });
    return DOMPurify.sanitize(body.innerHTML);
  }, [page]);

  const title = monitor ? 'Monitorul Oficial Local' : page?.title;

  useEffect(() => {
    if (title) document.title = `${title} • Primăria Corcova`;
  }, [title]);

  return (
    <div className="container page-layout">
      <div className="page-main">
        <div className="breadcrumb">
          <a href="#/">Acasă</a>
          <span>›</span>
          <span>{title || 'Pagină'}</span>
        </div>

        {monitor ? (
          <MonitorLocal apiBase={apiBase} siteSlug={siteSlug} />
        ) : resource.loading ? (
          <p role="status">Se încarcă pagina…</p>
        ) : resource.error ? (
          <div role="alert">
            <h1>Pagină indisponibilă</h1>
            <p>{resource.error}</p>
            <p><a className="button primary" href="#/">Înapoi la pagina principală</a></p>
          </div>
        ) : (
          <>
            <h1>{title}</h1>
            {children.data?.results?.length > 0 && (
              <div className="category-links">
                {children.data.results.map(child => (
                  <a href={`#/${child.slug}`} key={child.id}>
                    <FileText size={22}/>
                    <span>{child.title}</span>
                    <ArrowRight size={18}/>
                  </a>
                ))}
              </div>
            )}
            {(children.data?.next || children.data?.previous) && (
              <div className="monitor-pagination">
                <button disabled={!children.data.previous} onClick={() => setChildrenPage(childrenPage - 1)}>Anterior</button>
                <button disabled={!children.data.next} onClick={() => setChildrenPage(childrenPage + 1)}>Următor</button>
              </div>
            )}

            {sanitized.trim() && <ExpandableArticle html={sanitized} />}

            {PAGE_GALLERIES[slug] && (
              <PageGallery gallery={PAGE_GALLERIES[slug]} />
            )}

            <div className="local-monitor">
              {documents.loading ? (
                <p role="status">Se încarcă documentele…</p>
              ) : documents.error ? (
                <p role="alert">{documents.error}</p>
              ) : documents.data?.count > 0 ? (
                <>
                  <h2>Documente ({documents.data.count})</h2>
                  <div className="monitor-documents">
                    {documents.data.results.map(doc => (
                      <article key={doc.id}>
                        <div>
                          <h3>{doc.title}</h3>
                          <small>{doc.year ? `Anul ${doc.year}` : ''}</small>
                        </div>
                        <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                          Descarcă {doc.original_filename?.split('.').pop()?.toUpperCase() || ''} ↗
                        </a>
                      </article>
                    ))}
                  </div>
                  <div className="monitor-pagination">
                    <button disabled={!documents.data?.previous} onClick={() => setDocumentPage(documentPage - 1)}>Anterior</button>
                    <span>Pagina {documentPage}</span>
                    <button disabled={!documents.data?.next} onClick={() => setDocumentPage(documentPage + 1)}>Următor</button>
                  </div>
                </>
              ) : !sanitized.trim() && !children.data?.count && (
                <p>Nu există documente publicate în această secțiune.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
