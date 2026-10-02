import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, FileText, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useApi, useDebounce } from '../api';
import './monitor-layout.css';

function getRegister() {
  return new URLSearchParams(window.location.search).get('register') || '';
}

export default function MonitorLocal({ apiBase, siteSlug, title = 'Monitorul Oficial Local' }) {
  const root = `${apiBase.replace(/\/$/, '')}/sites/${encodeURIComponent(siteSlug)}/monitor`;
  const [register, setRegister] = useState(getRegister);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [registerPage, setRegisterPage] = useState(1);

  useEffect(() => {
    const onPopState = () => {
      setRegister(getRegister());
      setPage(1);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const debounced = useDebounce(search);
  const registers = useApi(`${root}/registers/?page_size=100&page=${registerPage}`);
  const entries = useApi(`${root}/entries/?${new URLSearchParams({ register, search: debounced, year, page, page_size: 20 })}`);
  const hasFilters = Boolean(register || search || year);
  const resultItems = entries.data?.results || [];
  const visibleEntries = resultItems;

  function filter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setRegister('');
    setSearch('');
    setYear('');
    setPage(1);
  }

  return (
    <section className="w-full space-y-6 text-[18px] leading-7 text-slate-700" aria-label={title}>
      <header className="monitor-hero flex flex-col items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-6 py-10 text-center shadow-md sm:px-12 sm:py-12">
        <span className="!mx-auto inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"><FileText size={15} /> Registru public digital</span>
        <h1 className="!mx-auto !mt-3 !mb-0 w-full max-w-4xl text-center font-serif !text-4xl leading-tight font-semibold text-slate-800 sm:!text-5xl">{title}</h1>
        <p className="!mx-auto mt-4 max-w-2xl text-center text-lg leading-8 text-slate-600">Accesați hotărâri, dispoziții și documente oficiale publicate de administrația locală.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-base text-slate-600" aria-label="Rezumat documente">
          <span><strong className="mr-2 text-2xl font-bold text-blue-900">{entries.data?.count ?? '—'}</strong> documente găsite</span>
          <span><strong className="mr-2 text-2xl font-bold text-blue-900">{registers.data?.count ?? '—'}</strong> registre disponibile</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-5" aria-label="Categorii informații publice">
        <article className="flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-7 text-slate-800 shadow-sm sm:p-8">
          <div>
            <div className="!flex !w-max !max-w-full !flex-row !flex-nowrap items-center gap-3 overflow-x-auto whitespace-nowrap">
              <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"><FileText size={15} /> Acces rapid</span>
              <span className="text-xs font-bold text-slate-300">•</span>
              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Registru public digital</span>
            </div>
            <h2 className="!m-0 !mt-5 font-serif !text-3xl font-semibold leading-tight text-slate-800 sm:!text-4xl">Documente oficiale</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">Consultați actele publice ale administrației locale, organizate pe registre și ani de emitere.</p>
          </div>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-5">
            <span className="text-sm text-slate-500">Documente disponibile</span>
            <strong className="text-3xl font-bold text-slate-800">{entries.data?.count ?? '—'}</strong>
          </div>
        </article>

          <article className="grid min-h-[220px] items-center gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)]">
            <img className="h-28 w-full rounded-lg bg-slate-50 object-contain" src="/legislatie.webp" alt="Documente legislative și proceduri administrative" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Legalitate și transparență</span>
              <h2 className="!m-0 !mt-1 font-serif !text-2xl font-semibold leading-tight text-slate-800">Acte normative</h2>
              <p className="mt-2 text-base leading-7 text-slate-600">Hotărâri, dispoziții și regulamente publicate pentru consultare.</p>
            </div>
          </article>
          <article className="grid min-h-[220px] items-center gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)]">
            <img className="h-28 w-full rounded-lg bg-slate-50 object-contain" src="/rapoarte.webp" alt="Rapoarte și date publice" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Informare publică</span>
              <h2 className="!m-0 !mt-1 font-serif !text-2xl font-semibold leading-tight text-slate-800">Rapoarte și finanțe</h2>
              <p className="mt-2 text-base leading-7 text-slate-600">Documente financiar-bugetare și rapoarte de activitate ale instituției.</p>
            </div>
          </article>
      </section>

      {registers.error && <p className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-base text-red-800" role="alert">{registers.error}</p>}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-7" aria-label="Filtre documente">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 text-lg font-bold text-slate-700"><SlidersHorizontal size={18} /> Filtrează documentele</span>
          {hasFilters && <button type="button" className="text-base font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950" onClick={clearFilters}>Resetează filtrele</button>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Registre">
          <button className={`rounded-md border px-3 py-2 text-base font-semibold transition ${!register ? 'border-blue-900 bg-blue-900 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:bg-blue-50'}`} type="button" aria-pressed={!register} onClick={() => filter(setRegister, '')}>Toate registrele</button>
          {registers.data?.results.map(item => (
            <button className={`rounded-md border px-3 py-2 text-base font-semibold transition ${register === item.slug ? 'border-blue-900 bg-blue-900 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:bg-blue-50'}`} key={item.id} type="button" aria-pressed={register === item.slug} onClick={() => filter(setRegister, item.slug)}>
              {item.title} <span className={`ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${register === item.slug ? 'bg-white text-blue-900' : 'bg-slate-100 text-slate-600'}`}>{item.entry_count}</span>
            </button>
          ))}
        </div>
        {(registers.data?.previous || registers.data?.next) && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-700 transition hover:border-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={!registers.data.previous} onClick={() => setRegisterPage(registerPage - 1)}>Registre anterioare</button>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-700 transition hover:border-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={!registers.data.next} onClick={() => setRegisterPage(registerPage + 1)}>Mai multe registre</button>
          </div>
        )}
        <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]" onSubmit={event => event.preventDefault()}>
          <label className="grid gap-2 text-base font-bold text-slate-700">
            <span className="inline-flex items-center gap-2"><Search size={16} /> Caută documente</span>
            <input className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-lg font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" type="search" value={search} onChange={event => filter(setSearch, event.target.value)} placeholder="Titlu, număr sau cuvânt-cheie" />
          </label>
          <label className="grid gap-2 text-base font-bold text-slate-700">
            <span className="inline-flex items-center gap-2"><Filter size={16} /> Anul emiterii</span>
            <input className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-lg font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100" type="number" min="1" max="9999" placeholder="Toți anii" value={year} onChange={event => filter(setYear, event.target.value)} />
          </label>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Documente oficiale</span>
            <h2 className="!m-0 !mt-1 font-serif !text-3xl font-semibold leading-tight text-slate-800">{entries.loading ? 'Se încarcă documentele…' : `${entries.data?.count || 0} documente găsite`}</h2>
          </div>
          {hasFilters && <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">Rezultate filtrate</span>}
        </div>

        {entries.error ? <p className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-base text-red-800" role="alert">{entries.error}</p> : (
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {visibleEntries.map(entry => (
              <article className="grid items-center gap-4 px-1 py-5 transition hover:bg-slate-50 md:grid-cols-[44px_minmax(0,1fr)_auto]" key={entry.id}>
                <span className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-800"><FileText size={22} /></span>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold leading-7 text-slate-800">{entry.title}</h3>
                  <p className="mt-1 text-base text-slate-500">{[entry.number && `Nr. ${entry.number}`, entry.issued_on && new Date(`${entry.issued_on}T12:00:00`).toLocaleDateString('ro-RO')].filter(Boolean).join(' · ') || 'Document public'}</p>
                </div>
                <a className="doc-download-button md:justify-self-end" href={entry.document.download_url} target="_blank" rel="noreferrer">
                  <span className="doc-download-badge badge-pdf">
                    {entry.document.original_filename?.split('.').pop()?.toUpperCase() || 'PDF'}
                  </span>
                  <span>{entry.document.available_locally ? 'Descarcă' : 'Deschide'}</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        )}

        {!entries.loading && !entries.error && !entries.data?.count && (
          <div className="flex flex-col items-center gap-2 px-5 py-11 text-center text-slate-500"><FileText size={28} /><p className="text-lg">Nu există documente pentru filtrele selectate.</p><button className="font-bold text-blue-900 underline underline-offset-2" type="button" onClick={clearFilters}>Arată toate documentele</button></div>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 text-base font-semibold text-slate-500">
          <div className="monitor-pagination">
            <button type="button" disabled={!entries.data?.previous} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Anterior</span>
            </button>
            <span>Pagina <strong>{page}</strong></span>
            <button type="button" disabled={!entries.data?.next} onClick={() => setPage(page + 1)}>
              <span>Următor</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
