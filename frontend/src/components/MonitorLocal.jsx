import { useEffect, useState } from 'react';
import { useApi, useDebounce } from '../api';
import './monitor.css';

function getHashRegister() {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    const p = new URLSearchParams(hash.slice(qIndex));
    return p.get('register') || '';
  }
  return '';
}

/** Portable public registry. No site-specific names, categories, years or document IDs. */
export default function MonitorLocal({ apiBase, siteSlug, title = 'Monitorul Oficial Local' }) {
  const root = `${apiBase.replace(/\/$/, '')}/sites/${encodeURIComponent(siteSlug)}/monitor`;
  const [register, setRegister] = useState(getHashRegister);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [registerPage, setRegisterPage] = useState(1);

  useEffect(() => {
    const onHashChange = () => {
      setRegister(getHashRegister());
      setPage(1);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const debounced = useDebounce(search);
  const registers = useApi(`${root}/registers/?page_size=100&page=${registerPage}`);
  const entries = useApi(`${root}/entries/?${new URLSearchParams({ register, search: debounced, year, page, page_size: 20 })}`);
  function filter(setter, value) { setter(value); setPage(1); }
  return <section className="local-monitor" aria-label={title}>
    <h1>{title}</h1>
    <p>Registre și documente publicate de administrația locală.</p>
    {registers.error && <p role="alert">{registers.error}</p>}
    <div className="monitor-registers" aria-label="Registre">
      <button type="button" aria-pressed={!register} onClick={() => filter(setRegister, '')}>Toate registrele</button>
      {registers.data?.results.map(item => <button key={item.id} type="button" aria-pressed={register === item.slug} onClick={() => filter(setRegister, item.slug)}>{item.title} <span>({item.entry_count})</span></button>)}
    </div>
    {(registers.data?.previous || registers.data?.next) && <div className="monitor-pagination"><button disabled={!registers.data.previous} onClick={() => setRegisterPage(registerPage - 1)}>Registre anterioare</button><button disabled={!registers.data.next} onClick={() => setRegisterPage(registerPage + 1)}>Mai multe registre</button></div>}
    <form className="monitor-filters" onSubmit={event => event.preventDefault()}>
      <label>Caută documente<input type="search" value={search} onChange={event => filter(setSearch, event.target.value)} placeholder="Titlu sau număr…"/></label>
      <label>An<input type="number" min="1" max="9999" placeholder="Toți anii" value={year} onChange={event => filter(setYear, event.target.value)}/></label>
    </form>
    {entries.loading ? <p role="status">Se încarcă documentele…</p> : entries.error ? <p role="alert">{entries.error}</p> : <>
      <p role="status">{entries.data?.count || 0} documente găsite</p>
      <div className="monitor-documents">{entries.data?.results.map(entry => <article key={entry.id}><div><h3>{entry.title}</h3><small>{[entry.number && `Nr. ${entry.number}`, entry.issued_on && new Date(`${entry.issued_on}T12:00:00`).toLocaleDateString('ro-RO')].filter(Boolean).join(' · ')}</small></div><a href={entry.document.download_url} target="_blank" rel="noreferrer">{entry.document.available_locally ? 'Descarcă' : 'Sursa externă'} ↗</a></article>)}</div>
      {!entries.data?.count && <p>Nu există documente publicate pentru filtrele selectate.</p>}
      <div className="monitor-pagination"><button disabled={!entries.data?.previous} onClick={() => setPage(page - 1)}>Anterior</button><span>Pagina {page}</span><button disabled={!entries.data?.next} onClick={() => setPage(page + 1)}>Următor</button></div>
    </>}
  </section>;
}
