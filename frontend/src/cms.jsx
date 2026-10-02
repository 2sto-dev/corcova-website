import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Accessibility, ArrowRight, ArrowUpRight, Baby, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, Clock, Compass, Droplets, FileText, FileType2, Flame, HeartHandshake, Mail, MapPin, Mountain, PawPrint, Phone, Route, Search, ShieldCheck, Sprout, Users, WalletCards, X } from 'lucide-react';
import { apiBase, siteApi, siteSlug, useApi, useDebounce } from './api';
import MonitorLocal from './components/MonitorLocal';
import PageGallery from './components/PageGallery';
import AnnouncementsView from './components/AnnouncementsView';
import { PAGE_GALLERIES, HOMEPAGE_MEDIA } from './mediaData';
import { cleanInternalHref } from './routing';

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
                  <a key={result.href + index} href={cleanInternalHref(result.href)} onClick={close}>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.kind === 'page' ? 'Pagină' : 'Document'}</small>
                    </span>
                    <ArrowUpRight size={18}/>
                  </a>
                ))}
                {(search.data?.previous || search.data?.next) && (
                  <div className="monitor-pagination">
                    <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft size={16} aria-hidden="true" />
                      <span>Anterior</span>
                    </button>
                    <span>Pagina <strong>{page}</strong></span>
                    <button type="button" disabled={!search.data?.next} onClick={() => setPage(page + 1)}>
                      <span>Următor</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
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

function GeographyIntro() {
  const highlights = [
    { icon: Compass, label: 'Așezare', text: 'Nord-estul județului Mehedinți' },
    { icon: Route, label: 'Acces', text: 'DN 67 · 55 km de Drobeta-Turnu Severin' },
    { icon: Mountain, label: 'Relief', text: 'Dealuri, văi și lunci' },
    { icon: Sprout, label: 'Economie', text: 'Agricultură și viticultură' },
  ];

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Date geografice esențiale">
      {highlights.map(({ icon: Icon, label, text }) => (
        <div key={label} className="section-card flex min-h-36 items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
            <Icon className="block" size={25} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div>
            <strong className="block text-base font-bold text-slate-800">{label}</strong>
            <span className="mt-2 block text-base leading-6 text-slate-600">{text}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function FormsIntro() {
  const categories = [
    { icon: HeartHandshake, title: 'Asistență socială', text: 'Cereri, declarații și documente pentru sprijin social.' },
    { icon: Accessibility, title: 'Dizabilități', text: 'Modele pentru anchete, drepturi și servicii sociale.' },
    { icon: Baby, title: 'Familie și copii', text: 'Alocații, indemnizații și formulare pentru părinți.' },
    { icon: Flame, title: 'Ajutoare și încălzire', text: 'Documente pentru sprijinul acordat gospodăriilor.' },
  ];

  return (
    <section className="mb-8 space-y-6" aria-label="Categorii de tipizate">
      <div className="grid gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 sm:p-6">
          <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-indigo-950"><ClipboardList size={34} strokeWidth={2.1} className="text-indigo-950" /> Servicii pentru cetățeni</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-slate-800 sm:text-4xl">Tipizate și formulare</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Descarcă formularele necesare pentru solicitările adresate Primăriei Comunei Corcova. Documentele sunt grupate pe domenii pentru acces rapid.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm text-indigo-950"><FileText size={16} className="text-indigo-950" /> Documente oficiale</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm text-indigo-950"><WalletCards size={16} className="text-indigo-950" /> Acces gratuit</span>
          </div>
        </div>
        <div className="min-h-48 p-3 sm:min-h-56">
          <img className="h-full w-full rounded-xl object-cover" src="/legislatie.webp" alt="Documente administrative oficiale" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(({ icon: Icon, title, text }) => (
          <article key={title} className="forms-category section-card rounded-xl border border-sky-300 !bg-sky-100 p-5 shadow-md transition hover:-translate-y-1 hover:!bg-sky-200 hover:shadow-xl">
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg !bg-sky-200 !text-slate-900"><Icon size={23} strokeWidth={2.1} /></span>
              <h3 className="text-lg font-bold leading-6 !text-slate-900">{title}</h3>
            </div>
            <p className="mt-2 text-base leading-6 !text-slate-800">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}


function SocialAssistanceIntro() {
  const services = [
    {
      icon: HeartHandshake,
      title: 'Venit Minim de Incluziune (VMI)',
      desc: 'Sprijin pentru incluziune și familii cu copii (Legea 196/2016)',
      href: '#/venit-minim-garantat',
    },
    {
      icon: Flame,
      title: 'Ajutor Încălzire Locuință',
      desc: 'Lemne, cărbuni, energie pentru sezonul rece (Legea 226/2021)',
      href: '#/ajutor-incalzire',
    },
    {
      icon: Baby,
      title: 'Alocații & Creștere Copil',
      desc: 'Alocație de stat, indemnizație ICC și stimulent de inserție',
      href: '#/indemnizatie-crestere-copil',
    },
    {
      icon: Accessibility,
      title: 'Protecție Dizabilități / Handicap',
      desc: 'Anchete sociale, dosare DGASPC și drepturi asistent personal',
      href: '#/handicap-adulti',
    },
    {
      icon: Users,
      title: 'Copii cu Părinți în Străinătate',
      desc: 'Notificare legală obligatorie și delegare autoritate (HG 691/2015)',
      href: '#/documente-hg-691-din-2015',
    },
    {
      icon: WalletCards,
      title: 'Tichete Sociale Grădiniță & Școală',
      desc: 'Stimulent educațional preșcolar și sprijin electronic rechizite',
      href: '#/stimulent-educationaltichet-social-de-gradinita',
    },
  ];

  return (
    <section className="mb-8 space-y-6" aria-label="Prezentare Asistență Socială">
      <div className="grid gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <HeartHandshake size={15} /> Servicii Publice &amp; Sprijin Comunitar
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Compartimentul de Asistență Socială
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Asigurăm sprijinul direct pentru familii, copii, persoane vârstnice și persoane cu dizabilități din toate cele 13 sate ale comunei Corcova. Vă oferim consiliere, instrumentarea dosarelor și acces transparent la beneficiile de asistență socială prevăzute de lege.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <ShieldCheck size={16} className="text-emerald-700" /> Drepturi &amp; Prestații Legale
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Users size={16} className="text-sky-700" /> Acoperire 13 Sate
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <FileText size={16} className="text-indigo-700" /> Formulare Tipizate
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-sky-200 bg-white p-5 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
              Echipa &amp; Program cu Publicul
            </span>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Ana ȘERBAN &amp; Victoria VLAD
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Referenți Asistență Socială
            </p>

            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <Clock size={16} className="shrink-0 text-emerald-700" />
                <span><strong>Program:</strong> Luni – Vineri: 08:00 – 16:00</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="shrink-0 text-red-600" />
                <span>Sediul Primăriei Corcova, Județul Mehedinți</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="shrink-0 text-sky-700" />
                <a href="tel:0252383464" className="font-semibold text-sky-800 hover:underline">
                  0252 383 464
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="shrink-0 text-indigo-700" />
                <a href="mailto:primaria.corcova@gmail.com" className="font-semibold text-indigo-800 hover:underline">
                  primaria.corcova@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Audiențe de specialitate: <strong>Luni și Miercuri 09:00 – 12:00</strong>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-bold text-slate-800">
          Ghid Servicii &amp; Prestații Sociale
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, desc, href }) => (
            <a
              key={title}
              href={href}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-800 transition group-hover:bg-sky-100">
                    <Icon size={20} strokeWidth={2.1} />
                  </span>
                  <h4 className="text-base font-bold leading-snug text-slate-900 group-hover:text-sky-900">
                    {title}
                  </h4>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {desc}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-700 group-hover:underline">
                Accesează detalii &amp; formulare <ArrowUpRight size={14} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function GeographySections() {
  const sections = [
    { id: 'cadrul', icon: Mountain, label: 'Cadrul natural' },
    { id: 'clima', icon: Compass, label: 'Clima' },
    { id: 'apa', icon: Droplets, label: 'Apa' },
    { id: 'flora', icon: Sprout, label: 'Flora' },
    { id: 'fauna', icon: PawPrint, label: 'Fauna' },
  ];

  return (
    <nav className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Secțiuni geografice">
      <div className="mb-4 flex items-center gap-2 text-base font-bold uppercase tracking-[0.1em] text-slate-600">
        <Compass size={17} aria-hidden="true" /> Explorează comuna
      </div>
      <div className="flex flex-wrap gap-2">
        {sections.map(({ id, icon: Icon, label }) => (
          <button key={id} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-900">
            <Icon className="block" size={24} strokeWidth={2.2} aria-hidden="true" /> <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

const geographySectionIcons = {
  cadrul: Mountain,
  clima: Compass,
  apa: Droplets,
  solul: Mountain,
  flora: Sprout,
  fauna: PawPrint,
  resurse: Sprout,
};

function GeographyArticleContent({ html }) {
  const parts = html.split(/(<h5\b[\s\S]*?<\/h5>)/gi);

  return parts.map((part, index) => {
    if (!/^<h5\b/i.test(part)) {
      return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
    }

    const headingDocument = new DOMParser().parseFromString(part, 'text/html');
    const heading = headingDocument.querySelector('h5');
    const anchor = heading?.querySelector('[id]');
    const id = anchor?.getAttribute('id') || '';
    const label = heading?.textContent?.trim() || '';
    const Icon = geographySectionIcons[id] || Compass;

    return (
      <h5 key={index} id={id} className="mt-10 flex scroll-mt-8 items-center gap-3 border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 font-serif text-2xl font-semibold leading-tight text-slate-800">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-800 shadow-sm">
          <Icon className="block" size={25} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span>{label}</span>
      </h5>
    );
  });
}

function FormsArticleContent({ html }) {
  const parts = html.split(/(<ul\b[\s\S]*?<\/ul>)/gi);
  const categories = [
    { icon: HeartHandshake, title: 'Asistență socială' },
    { icon: Accessibility, title: 'Handicap adulți' },
    { icon: Baby, title: 'Handicap copii' },
    { icon: Baby, title: 'Indemnizație creștere copil' },
    { icon: ClipboardList, title: 'Stimulent educațional' },
    { icon: Flame, title: 'Ajutor încălzire' },
    { icon: WalletCards, title: 'Alocație de stat' },
  ];
  let listIndex = 0;

  return parts.map((part, index) => {
    if (!/^<ul\b/i.test(part)) {
      return null;
    }

    const listDocument = new DOMParser().parseFromString(part, 'text/html');
    const items = Array.from(listDocument.querySelectorAll('li'));

    const category = categories[listIndex] || { icon: FileText, title: 'Documente disponibile' };
    const CategoryIcon = category.icon;
    const currentListIndex = listIndex;
    listIndex += 1;

    return (
      <details key={index} className="forms-toggle group mb-4 overflow-hidden rounded-2xl border border-slate-200 !bg-white shadow-md" open={currentListIndex === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-3 !bg-white px-5 py-4 text-lg font-bold !text-slate-900 transition hover:!bg-sky-50 [&::-webkit-details-marker]:hidden">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><CategoryIcon size={22} aria-hidden="true" /></span>
          <span className="flex-1">{category.title}</span>
          <ChevronDown className="transition-transform group-open:rotate-180" size={20} aria-hidden="true" />
        </summary>
        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, itemIndex) => {
          const link = item.querySelector('a');
          const href = cleanInternalHref(link?.getAttribute('href') || '/');
          const title = link?.textContent?.trim() || item.textContent?.trim() || 'Document';
          const extension = (href.split('?')[0].split('.').pop() || 'PDF').toUpperCase();
          const isWord = extension === 'DOC' || extension === 'DOCX';
          const Icon = isWord ? FileType2 : FileText;

          return (
            <li key={itemIndex} className="m-0 list-none rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <a className="flex items-start gap-3 font-semibold !no-underline" href={href} target="_blank" rel="noopener noreferrer">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isWord ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base leading-6 text-slate-800">{title}</span>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${isWord ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{extension}</span>
                </span>
                <ArrowUpRight size={17} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
            </li>
          );
        })}
        </ul>
      </details>
    );
  });
}

function DeclarationsArticleContent({ html, title = 'Declarații de avere', documents = [] }) {
  const documentList = new DOMParser().parseFromString(html, 'text/html');
  const items = Array.from(documentList.querySelectorAll('li'));
  const sourceItems = documents.length
    ? documents.map(document => ({ href: cleanInternalHref(document.download_url || document.external_url || '/'), title: document.title, year: document.year || 'Arhiva' }))
    : items.map(item => {
      const link = item.querySelector('a');
      const href = cleanInternalHref(link?.getAttribute('href') || '/');
      const itemTitle = link?.textContent?.trim() || item.textContent?.trim() || '';
      return { href, title: itemTitle, year: href.match(/\/(20\d{2})\//)?.[1] || itemTitle.match(/\b(20\d{2})\b/)?.[1] || 'Arhiva' };
    });
  const groupedItems = sourceItems.reduce((groups, item) => {
    const year = item.year;
    groups[year] = groups[year] || [];
    groups[year].push(item);
    return groups;
  }, {});

  return (
    <section className="declarations-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Declarații publice">
      {Object.entries(groupedItems).map(([year, yearItems]) => <div key={year} className="mb-6 last:mb-0">
        <h2 className="mb-4 border-b border-slate-300 pb-2 text-2xl font-semibold text-slate-800">{title} — {year}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {yearItems.map(({ href, title: documentTitle }, index) => {

        return (
          <article key={`${href}-${index}`} className="declaration-card flex min-h-28 items-center gap-3 rounded-xl border border-slate-300 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
              <FileText size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-semibold leading-6 text-slate-800">{documentTitle}</h3>
              <a className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-indigo-900 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">
                Descarcă PDF <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
          </article>
        );
        })}
        </div>
      </div>)}
    </section>
  );
}

function ExpandableArticle({ html, geography = false, forms = false, declarations = false, declarationsTitle = 'Declarații de avere', declarationDocuments = [] }) {
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
        className={`archive-content text-[17px] leading-8 text-slate-700 [&_a]:text-emerald-800 [&_a]:underline [&_a]:underline-offset-4 [&_h5]:mt-10 [&_h5]:scroll-mt-8 [&_h5]:border-l-4 [&_h5]:border-emerald-600 [&_h5]:bg-emerald-50 [&_h5]:px-4 [&_h5]:py-3 [&_h5]:font-serif [&_h5]:text-2xl [&_h5]:font-semibold [&_h5]:leading-tight [&_p]:mb-5 [&_p]:text-justify ${geography ? 'geography-article' : ''} ${forms ? '[&_h3]:mt-10 [&_h3]:rounded-xl [&_h3]:border-l-4 [&_h3]:border-emerald-600 [&_h3]:bg-emerald-50 [&_h3]:px-5 [&_h3]:py-3 [&_h3]:font-serif [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-slate-800 [&_ul]:grid [&_ul]:gap-3 [&_ul]:sm:grid-cols-2 [&_li]:m-0 [&_li]:list-none [&_li]:rounded-xl [&_li]:border [&_li]:border-slate-200 [&_li]:bg-white [&_li]:p-4 [&_li]:shadow-sm [&_li]:transition [&_li]:hover:border-emerald-200 [&_li]:hover:shadow-md [&_li_a]:flex [&_li_a]:items-center [&_li_a]:gap-2 [&_li_a]:font-semibold [&_li_a]:no-underline' : ''}`}
      >
        {geography ? <GeographyArticleContent html={html} /> : forms ? <FormsArticleContent html={html} /> : declarations ? <DeclarationsArticleContent html={html} title={declarationsTitle} documents={declarationDocuments} /> : <span dangerouslySetInnerHTML={{ __html: html }} />}
      </article>
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
  const isAnnouncements = slug === 'anunturi' || slug === 'anunturi-concursuri-si-examene';
  const isDeclarations = slug === 'declaratii-de-avere' || slug === 'declaratii-de-interese';
  const resource = useApi(monitor ? null : `${siteApi}/pages/${encodeURIComponent(slug)}/`);
  const [documentPage, setDocumentPage] = useState(1);
  const [childrenPage, setChildrenPage] = useState(1);

  useEffect(() => {
    setDocumentPage(1);
    setChildrenPage(1);
  }, [slug]);

  const page = resource.data;
  const documentParams = new URLSearchParams({ page_slug: slug, page: documentPage });
  if (isDeclarations) documentParams.set('page_size', '100');
  const documents = useApi(page ? `${siteApi}/documents/?${documentParams}` : null);
  const children = useApi(page ? `${siteApi}/pages/?parent=${page.id}&page=${childrenPage}` : null);

  const sanitized = useMemo(() => {
    const body = new DOMParser().parseFromString(page?.body || '', 'text/html').body;
    body.querySelectorAll('a[href*="/documents/"][href$="/download/"]').forEach(link => link.remove());
    body.querySelectorAll('a[href^="#/"]').forEach(link => link.setAttribute('href', cleanInternalHref(link.getAttribute('href'))));
    body.querySelectorAll('a[href^="#"]').forEach(link => link.removeAttribute('href'));
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
    <div className={`container page-layout ${monitor ? 'monitor-page-layout' : ''} !w-full !max-w-none !grid-cols-1 !gap-0 px-6 lg:px-10`}>
      <div className={`page-main ${monitor ? 'monitor-page-main mx-auto w-full !max-w-7xl' : 'mx-auto w-full max-w-7xl'}`}>
        <div className="breadcrumb">
          <a href="/">Acasă</a>
          <span>›</span>
          <span>{title || 'Pagină'}</span>
        </div>

        {monitor ? (
          <MonitorLocal apiBase={apiBase} siteSlug={siteSlug} />
        ) : isAnnouncements ? (
          <AnnouncementsView page={page} />
        ) : resource.loading ? (
          <p role="status">Se încarcă pagina…</p>
        ) : resource.error ? (
          <div role="alert">
            <h1>Pagină indisponibilă</h1>
            <p>{resource.error}</p>
            <p><a className="button primary" href="/">Înapoi la pagina principală</a></p>
          </div>
        ) : (
          <>
            <h1>{title}</h1>
            {children.data?.results?.length > 0 && (
              <div className="category-links">
                {children.data.results.map(child => (
                  <a href={`/${child.slug}`} key={child.id}>
                    <FileText size={22}/>
                    <span>{child.title}</span>
                    <ArrowRight size={18}/>
                  </a>
                ))}
              </div>
            )}
            {(children.data?.next || children.data?.previous) && (
              <div className="monitor-pagination">
                <button type="button" disabled={!children.data.previous} onClick={() => setChildrenPage(childrenPage - 1)}>
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span>Anterior</span>
                </button>
                <span>Pagina <strong>{childrenPage}</strong></span>
                <button type="button" disabled={!children.data.next} onClick={() => setChildrenPage(childrenPage + 1)}>
                  <span>Următor</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}

            {slug === 'geografia' && <GeographyIntro />}
            {slug === 'geografia' && <GeographySections />}
            {slug === 'tipizate' && <FormsIntro />}
            {slug === 'compartimentul-de-asistenta-sociala' && <SocialAssistanceIntro />}
            {sanitized.trim() && <ExpandableArticle html={sanitized} geography={slug === 'geografia'} forms={slug === 'tipizate'} declarations={isDeclarations} declarationsTitle={slug === 'declaratii-de-interese' ? 'Declarații de interese' : 'Declarații de avere'} declarationDocuments={documents.data?.results || []} />}

            {PAGE_GALLERIES[slug] && (
              <PageGallery gallery={PAGE_GALLERIES[slug]} />
            )}

            <div className={`local-monitor ${isDeclarations ? 'hidden' : ''}`}>
              {documents.loading ? (
                <p role="status">Se încarcă documentele…</p>
              ) : documents.error ? (
                <p role="alert">{documents.error}</p>
              ) : documents.data?.count > 0 ? (
                <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" open={slug !== 'tipizate'}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 bg-slate-50 px-5 py-4 text-xl font-bold text-slate-800 transition hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><FileText size={22} aria-hidden="true" /></span>
                    <span className="flex-1">Documente ({documents.data.count})</span>
                    <ChevronDown className="transition-transform group-open:rotate-180" size={22} aria-hidden="true" />
                  </summary>
                  <div className="divide-y divide-slate-200">
                    {documents.data.results.map(doc => {
                      const extension = (doc.original_filename?.split('.').pop() || 'PDF').toUpperCase();
                      const isWord = extension === 'DOC' || extension === 'DOCX';
                      const DocumentIcon = isWord ? FileType2 : FileText;

                      const badgeClass = isWord ? 'badge-docx' : extension === 'PDF' ? 'badge-pdf' : 'badge-other';

                      return (
                      <article key={doc.id} className="grid items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                          <h3 className="min-w-0 break-words text-base font-bold leading-6 text-slate-800">{doc.title}</h3>
                          <small className="shrink-0 text-sm text-slate-500">{doc.year ? `Anul ${doc.year}` : ''}</small>
                        </div>
                        <a
                          className="doc-download-button"
                          href={cleanInternalHref(doc.download_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className={`doc-download-badge ${badgeClass}`}>
                            {extension}
                          </span>
                          <span>Descarcă</span>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                      </article>
                      );
                    })}
                  </div>
                  <div className="monitor-pagination">
                    <button type="button" disabled={!documents.data?.previous} onClick={() => setDocumentPage(documentPage - 1)}>
                      <ChevronLeft size={16} aria-hidden="true" />
                      <span>Anterior</span>
                    </button>
                    <span>Pagina <strong>{documentPage}</strong></span>
                    <button type="button" disabled={!documents.data?.next} onClick={() => setDocumentPage(documentPage + 1)}>
                      <span>Următor</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </details>
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
