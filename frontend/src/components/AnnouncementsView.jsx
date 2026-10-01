import React, { useState, useMemo } from 'react';
import { Search, FileText, ArrowRight, ArrowUpRight, Filter, Bell, CheckCircle, Award, Briefcase } from 'lucide-react';
import { useApi, siteApi } from '../api';
import './announcements.css';

function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = rawTitle.trim();
  // Clean redundant prefixes like "Anunț: Anunt " or "Anunut Nr."
  title = title.replace(/^Anunț:\s*Anunt\s+/i, 'Anunț: ');
  title = title.replace(/^Anunut\s+/i, 'Anunț ');
  return title;
}

function detectType(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('rezultat') || t.includes('contestat') || t.includes('selectie') || t.includes('interviu')) {
    return { label: 'Rezultat / Selecție', class: 'rezultat', key: 'rezultat' };
  }
  if (t.includes('concurs') || t.includes('ocupare') || t.includes('angajare') || t.includes('vacanta')) {
    return { label: 'Concurs Ocupare Post', class: 'concurs', key: 'concurs' };
  }
  if (t.includes('examen') || t.includes('promovare')) {
    return { label: 'Examen Promovare', class: 'examen', key: 'examen' };
  }
  return { label: 'Anunț Public', class: 'anunt', key: 'anunt' };
}

export default function AnnouncementsView({ page }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [year, setYear] = useState('all');
  const [visibleCount, setVisibleCount] = useState(4);

  // Fetch announcements associated with 'anunturi'
  const documentsQuery = useApi(`${siteApi}/documents/?page_slug=anunturi&page_size=100&ordering=-year,-id`);
  const documents = documentsQuery.data?.results || [];

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set();
    documents.forEach(d => {
      if (d.year) years.add(String(d.year));
    });
    return Array.from(years).sort().reverse();
  }, [documents]);

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: documents.length, concurs: 0, examen: 0, rezultat: 0 };
    documents.forEach(doc => {
      const type = detectType(doc.title);
      if (type.key === 'concurs') c.concurs++;
      else if (type.key === 'examen') c.examen++;
      else if (type.key === 'rezultat') c.rezultat++;
    });
    return c;
  }, [documents]);

  // Filtered documents
  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const type = detectType(doc.title);
      // Tab filter
      if (tab !== 'all' && type.key !== tab) {
        return false;
      }
      // Year filter
      if (year !== 'all' && String(doc.year) !== year) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const t = (doc.title || '').toLowerCase();
        const d = (doc.description || '').toLowerCase();
        if (!t.includes(q) && !d.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [documents, tab, year, search]);

  const visibleDocuments = filtered.slice(0, visibleCount);

  return (
    <div className="announcements-view">
      <div className="announcements-header">
        <span className="announcements-eyebrow">
          <Bell size={13} />
          COMUNICĂRI &amp; ANUNȚURI OFICIALE
        </span>
        <h1>Anunțuri Publice &amp; Concursuri</h1>
        <p className="announcements-intro">
          {page?.summary || 'Toate anunțurile oficiale ale Primăriei Comunei Corcova privind concursurile de angajare, examenele de promovare, rezultatele probelor scrise și comunicatele de interes cetățenesc.'}
        </p>
      </div>

      <div className="announcements-controls">
        <div className="announcements-search-row">
          <div className="announcements-search-box">
            <Search size={18} />
            <input
              className="!text-[20px] !leading-tight"
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(4); }}
              placeholder="Filtrează după cuvânt-cheie (ex: promovare, ITL, asistență, rezultat)…"
              aria-label="Caută în anunțuri"
            />
          </div>

          <select
            className="announcements-year-select !text-[20px] !leading-tight"
            value={year}
            onChange={e => { setYear(e.target.value); setVisibleCount(4); }}
            aria-label="Filtrează după an"
          >
            <option value="all">Toți anii</option>
            {availableYears.map(y => (
              <option key={y} value={y}>Anul {y}</option>
            ))}
          </select>

          <button
            type="button"
            className="announcements-search-submit"
            onClick={() => setVisibleCount(4)}
            aria-label="Aplică filtrarea"
          >
            <Search size={18} aria-hidden="true" />
            Caută
          </button>
        </div>

        <div className="announcements-tabs">
          <button
            type="button"
            className={`announcements-tab-btn !text-[17px] ${tab === 'all' ? 'is-active' : ''}`}
            onClick={() => { setTab('all'); setVisibleCount(4); }}
          >
            <span>Toate anunțurile</span>
            <span className="badge-count !text-[14px]">{counts.all}</span>
          </button>

          <button
            type="button"
            className={`announcements-tab-btn !text-[17px] ${tab === 'concurs' ? 'is-active' : ''}`}
            onClick={() => { setTab('concurs'); setVisibleCount(4); }}
          >
            <Briefcase size={14} />
            <span>Concursuri ocupare post</span>
            <span className="badge-count !text-[14px]">{counts.concurs}</span>
          </button>

          <button
            type="button"
            className={`announcements-tab-btn !text-[17px] ${tab === 'examen' ? 'is-active' : ''}`}
            onClick={() => { setTab('examen'); setVisibleCount(4); }}
          >
            <Award size={14} />
            <span>Examene de promovare</span>
            <span className="badge-count !text-[14px]">{counts.examen}</span>
          </button>

          <button
            type="button"
            className={`announcements-tab-btn !text-[17px] ${tab === 'rezultat' ? 'is-active' : ''}`}
            onClick={() => { setTab('rezultat'); setVisibleCount(4); }}
          >
            <CheckCircle size={14} />
            <span>Rezultate &amp; Selecție</span>
            <span className="badge-count !text-[14px]">{counts.rezultat}</span>
          </button>
        </div>
      </div>

      <div className="announcements-count-bar">
        Se afișează {filtered.length} din {documents.length} anunțuri publicate
      </div>

      {documentsQuery.loading ? (
        <p role="status">Se încarcă anunțurile oficiale…</p>
      ) : documentsQuery.error ? (
        <p role="alert">{documentsQuery.error}</p>
      ) : filtered.length > 0 ? (
        <>
        <div className="announcements-list">
          {visibleDocuments.map(doc => {
            const type = detectType(doc.title);
            const title = cleanTitle(doc.title);
            const ext = doc.original_filename?.split('.').pop()?.toUpperCase() || 'PDF';

            return (
              <article key={doc.id} className="announcement-card">
                <div className="announcement-main">
                  <div className="announcement-meta">
                    <span className={`announcement-type-badge text-[14px] ${type.class}`}>
                      {type.label}
                    </span>
                    {doc.year && (
                      <span className="announcement-year-badge text-[14px]">
                        Anul {doc.year}
                      </span>
                    )}
                  </div>
                  <h3 className="announcement-title">{title}</h3>
                  {doc.description && (
                    <p className="announcement-desc">{doc.description}</p>
                  )}
                </div>

                <div className="announcement-action">
                  <a
                    href={doc.download_url}
                    className="announcement-btn !border-indigo-200 !bg-white !text-indigo-950 hover:!bg-indigo-50"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={15} />
                    <span>Descarcă {ext}</span>
                    <ArrowUpRight size={15} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      {visibleCount < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button type="button" className="inline-flex items-center gap-2 rounded-md bg-indigo-950 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-indigo-900" onClick={() => setVisibleCount(count => count + 4)}>
            Continuă <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
        </>
      ) : (
        <div className="announcements-empty">
          <p>Nu a fost găsit niciun anunț conform filtrelor selectate.</p>
          <button
            type="button"
            className="button outline"
            onClick={() => { setSearch(''); setTab('all'); setYear('all'); setVisibleCount(4); }}
          >
            Resetează filtrele
          </button>
        </div>
      )}
    </div>
  );
}
