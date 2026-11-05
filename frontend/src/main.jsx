import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Search, Landmark, FileText, UsersRound, MapPin, ChevronRight, X, Mail, Phone, BookOpen, Sprout, Check } from 'lucide-react';
import Menu from './menu';
import { prefetchApi, siteApi, useApi } from './api';
import { ApiSearch, CmsPage } from './cms';
import countyLogo from './logo_mehedinti.png';
import './styles.css';
import './gallery.css';
import Home, { safeHref } from './home';
import Chatbot from './components/Chatbot';
import { AccessibilityTools, CookieNotice, CookiePolicy } from './components/SiteUtilities';
import HeroShowcase from './components/HeroShowcase';
import PageGallery from './components/PageGallery';
import { PAGE_GALLERIES } from './mediaData';
import { cleanInternalHref, clientRouteForAnchor, currentSlug, replaceLegacyHashRoute } from './routing';
import './typography.css';
import './tailwind.css';
import './institutional.css';
import './responsive.css';

function Brand({ footer = false, site }) {
  const name = (site?.name || 'Primăria Comunei Corcova').toLocaleUpperCase('ro-RO');
  const county = site?.county ? `JUDEȚUL ${site.county.toLocaleUpperCase('ro-RO')}` : 'JUDEȚUL MEHEDINȚI';

  if (footer) {
    return (
      <a className="brand brand-footer !text-white" href="/" aria-label={`${name} — Acasă`}>
        <img className="footer-county-logo" src={countyLogo} alt="Stema județului Mehedinți" width="404" height="448"/>
        <span>
          <strong>{name}</strong>
          <span className="brand-rule"/>
          <small>{county}</small>
        </span>
      </a>
    );
  }

  return (
    <a className="masthead-brand" href="/" aria-label={`${name} — Acasă`}>
      <span className="masthead-identity">
        <span className="masthead-lettering">
          <strong>{name}</strong>
          <span className="masthead-tricolor" aria-hidden="true"/>
          <span className="masthead-county">{county}</span>
        </span>
        <img className="masthead-crest" src={countyLogo} alt="Stema județului Mehedinți" width="404" height="448"/>
      </span>
      <span className="masthead-welcome">
        {(site?.welcome_text || 'Bine ați venit!').toLocaleUpperCase('ro-RO')}
      </span>
    </a>
  );
}

function MastheadContact({ site, doar }) {
  const email = site?.email?.trim();
  const phone = site?.phone?.trim();
  if (!email && !phone) return null;

  // `doar` separa cele doua randuri in blocuri distincte: telefonul se aseaza in
  // stanga headerului, adresa de e-mail ramane in dreapta, langa cautare.
  const arataEmail = email && doar !== 'telefon';
  const arataTelefon = phone && doar !== 'email';
  if (!arataEmail && !arataTelefon) return null;

  return (
    <div className={`masthead-contact${doar ? ` masthead-contact--${doar}` : ''}`}
         aria-label="Contact primărie">
      {arataEmail && (
        <a href={`mailto:${email}`}>
          <Mail size={17} aria-hidden="true"/>
          <span>{email}</span>
        </a>
      )}
      {arataTelefon && (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
          <Phone size={17} aria-hidden="true"/>
          <span>{phone}</span>
        </a>
      )}
    </div>
  );
}

function CommunityIllustration() {
  return (
    <svg className="community-art" viewBox="0 0 560 350" fill="none" role="img" aria-label="Ilustrație decorativă a comunei Corcova">
      <circle cx="328" cy="161" r="133" fill="#e9e9da"/>
      <circle cx="418" cy="87" r="27" fill="#e0bd70"/>
      <path d="M0 247C89 160 183 211 272 239C369 270 477 190 560 205V350H0Z" fill="#dbe4d8"/>
      <path d="M0 278C108 242 207 259 299 295C390 329 460 255 560 258V350H0Z" fill="#b9cdbe"/>
      <path d="M0 322C115 281 151 295 243 328M361 343C430 304 509 302 560 308" stroke="#8ba794" strokeWidth="2"/>
      <path d="M85 255V181M70 206L85 181L100 206M67 219L85 192L103 219M62 236L85 205L108 236" stroke="#668574" strokeWidth="5" strokeLinecap="round"/>
      <path d="M468 263V202M452 225L468 201L484 225M446 246L468 217L490 246" stroke="#668574" strokeWidth="5" strokeLinecap="round"/>
      <path d="M154 189H399V286H154Z" fill="#f6f2e5" stroke="#6b7b7e" strokeWidth="2"/>
      <path d="M139 190L178 148H373L413 190H139Z" fill="#7f9394"/>
      <path d="M235 170V132H319V170" fill="#f6f2e5"/>
      <path d="M225 137L277 104L330 137H225Z" fill="#f8f5ea" stroke="#6b7b7e" strokeWidth="2"/>
      <path d="M277 104V70" stroke="#64747a" strokeWidth="2"/>
      <path d="M278 70H285V88H278Z" fill="#254e80"/><path d="M285 70H292V88H285Z" fill="#e2bd57"/><path d="M292 70H299V88H292Z" fill="#ba6b57"/>
      <path d="M235 178H319V286H235Z" fill="#fbf9f0" stroke="#6b7b7e" strokeWidth="2"/>
      <path d="M245 191H253V279H245ZM301 191H309V279H301Z" fill="#d6d8cb"/>
      <path d="M264 245C264 228 290 228 290 245V286H264Z" fill="#36586e"/>
      {[171,204,337,370].map(x => (
        <g key={x}>
          <path d={`M${x} 211h13v26h-13zM${x} 251h13v20h-13z`} fill="#6e8991"/>
          <path d={`M${x+6.5} 211v26M${x} 223h13`} stroke="#dce2d9"/>
        </g>
      ))}
      <circle cx="277" cy="153" r="9" stroke="#7f9394" strokeWidth="2"/>
      <path d="M277 147V153L281 156" stroke="#7f9394" strokeWidth="2"/>
      <path d="M226 286H328M217 293H337M207 300H347" stroke="#84958f" strokeWidth="4"/>
      <path d="M260 301L237 350H343L297 301" fill="#e7e4d3"/>
      <path d="M121 112Q131 102 141 112M152 91Q162 81 172 91" stroke="#879b99" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function Contact({ site }) {
  const [status, setStatus] = useState({ type: null, title: '', detail: '' });
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSending(true);
    setStatus({ type: null, title: '', detail: '' });

    try {
      const response = await fetch(`${siteApi}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          website: data.website,
        }),
      });

      if (!response.ok) {
        throw new Error(response.status === 429
          ? 'Ați trimis prea multe mesaje într-un interval scurt. Vă rugăm să încercați mai târziu sau să ne contactați telefonic.'
          : 'Serverul nu a confirmat înregistrarea mesajului. Vă rugăm să încercați din nou sau să ne contactați prin e-mail ori telefon.');
      }
      form.reset();
      setStatus({
        type: 'ok',
        title: 'Mesajul a fost trimis.',
        detail: 'Vă mulțumim. Mesajul a fost înregistrat în sistemul primăriei.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        title: 'Mesajul nu a fost trimis.',
        detail: error.message || 'Vă rugăm să ne contactați direct prin e-mail sau telefon.'
      });
    } finally {
      setSending(false);
    }
  }

  const name = site?.name || 'Primăria Comunei Corcova';
  const address = site?.address || 'Sat Corcova, Comuna Corcova, Județul Mehedinți';
  const email = site?.email || 'primaria.corcova@gmail.com';
  const phone = site?.phone || '0252 383 464';
  const phoneClean = phone.replace(/[\s.]/g, '');

  return (
    <>
      <p className="page-intro">
        Aveți o întrebare, o solicitare sau o sesizare pentru administrația locală? Trimiteți un mesaj către {name}.
      </p>

      <div className="contact-location">
        <div className="contact-location-main">
          <MapPin size={26}/>
          <div>
            <strong>{name}</strong>
            <p>{address}</p>
          </div>
        </div>
        <div className="contact-location-details">
          <a className="contact-badge-link" href={`mailto:${email}`}>
            <Mail size={19}/>
            <span>{email}</span>
          </a>
          <a className="contact-badge-link" href={`tel:${phoneClean}`}>
            <Phone size={19}/>
            <span>{phone}</span>
          </a>
        </div>
      </div>

      <form className="contact-form" onSubmit={submit}>
        <div className="contact-hp" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        </div>
        <div className="form-grid">
          <label>
            Nume și prenume
            <input name="name" required minLength={2} maxLength={200} autoComplete="name"/>
          </label>
          <label>
            Adresă de e-mail
            <input name="email" type="email" required autoComplete="email"/>
          </label>
        </div>
        <label>
          Subiect
          <input name="subject" required minLength={3} maxLength={200}/>
        </label>
        <label>
          Mesaj
          <textarea name="message" rows="6" required minLength={10} maxLength={5000}></textarea>
        </label>
        <p className="form-note">
          Mesajul este înregistrat numai după ce primiți confirmarea de trimitere. Pentru solicitări urgente, sunați la numărul afișat mai sus.
        </p>
        <button className="button primary" type="submit" disabled={sending}>
          {sending ? 'Se trimite…' : 'Trimite mesajul'} <ArrowRight size={18}/>
        </button>
      </form>

      {status.type && (
        <div className={status.type === 'ok' ? 'message-preview' : 'message-preview message-error'} role={status.type === 'ok' ? 'status' : 'alert'}>
          <h3><Check size={20}/> {status.title}</h3>
          <p>{status.detail}</p>
        </div>
      )}

      {PAGE_GALLERIES.contact && (
        <PageGallery gallery={PAGE_GALLERIES.contact} />
      )}
    </>
  );
}

function App() {
  const site = useApi(`${siteApi}/`);
  const navigation = useApi(`${siteApi}/navigation/`);

  function normalizeMenu(items) {
    return items.map(item => ({
      ...item,
      label: String(item.label || ''),
      href: cleanInternalHref(item.href),
      children: item.children?.length ? normalizeMenu(item.children) : undefined
    }));
  }

  const [slug, setSlug] = useState(() => currentSlug());
  const [searchOpen, setSearchOpen] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const searchButton = useRef(null);
  const main = useRef(null);

  const pageReady = useCallback(title => {
    setRouteAnnouncement(`${title} — pagină încărcată`);
  }, []);

  useEffect(() => {
    const route = (moveFocus = true) => {
      replaceLegacyHashRoute();
      setSlug(currentSlug());
      setSearchOpen(false);
      if (moveFocus) {
        setRouteAnnouncement('Se încarcă pagina…');
        window.scrollTo(0, 0);
        requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
      }
    };
    const onClick = event => {
      const anchor = event.target.closest?.('a[href]');
      const destination = clientRouteForAnchor(anchor, event);
      if (!destination) return;
      event.preventDefault();
      window.history.pushState(null, '', destination);
      route();
    };
    const onPotentialNavigation = event => {
      const anchor = event.target.closest?.('a[href]');
      const destination = clientRouteForAnchor(anchor);
      if (!destination) return;
      const nextSlug = new URL(destination, window.location.href).pathname.replace(/^\/+|\/+$/g, '');
      if (nextSlug && nextSlug !== 'contact' && nextSlug !== 'front-page' && nextSlug !== 'monitorul-oficial-local') {
        prefetchApi(`${siteApi}/pages/${encodeURIComponent(nextSlug)}/`).catch(() => {});
      }
    };
    const onPopState = () => route();
    route(false);
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onPotentialNavigation);
    document.addEventListener('focusin', onPotentialNavigation);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onPotentialNavigation);
      document.removeEventListener('focusin', onPotentialNavigation);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    searchButton.current?.focus();
  };

  const activeSlug = slug.replace(/\/$/, '');

  useEffect(() => {
    if (!activeSlug || activeSlug === 'front-page' || activeSlug === 'contact' || activeSlug === 'politica-cookie-uri') {
      const title = activeSlug === 'contact'
        ? 'Contact'
        : activeSlug === 'politica-cookie-uri'
          ? 'Politica de cookie-uri'
          : (site.data?.name || 'Primăria Comunei Corcova');
      document.title = `${title} • Mehedinți`;
      pageReady(title);
    }
  }, [activeSlug, site.data?.name, pageReady]);

  return (
    <>
      <button className="skip-link" type="button" onClick={() => main.current?.focus()}>
        Sari la conținut
      </button>

      <header className="masthead">
        {/* Telefonul si cautarea in coloana din stanga a grilei, e-mailul in cea
            din dreapta; titlul ramane in cea din mijloc. Cautarea a trecut la
            stanga fiindca in dreapta cadea exact peste ciorchine, iar o
            pictograma alba peste desenul deschis la culoare nu se mai vede.
            Sub 900 px invelisurile sunt `display: contents`, deci nu schimba
            asezarea de pe telefon. */}
        <div className="masthead-aside masthead-aside--stanga">
          <MastheadContact site={site.data} doar="telefon"/>
          <div className="masthead-search">
            <button
              ref={searchButton}
              className="search-button"
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={searchOpen ? 'Închide căutarea' : 'Deschide căutarea'}
              aria-expanded={searchOpen}
            >
              <Search size={25}/>
              <span>Caută pe site</span>
            </button>
          </div>
        </div>
        <Brand site={site.data}/>
        <div className="masthead-aside">
          <MastheadContact site={site.data} doar="email"/>
        </div>
      </header>

      <Menu items={normalizeMenu(navigation.data?.items || [])} activeHref={`/${activeSlug}`}/>

      {searchOpen && <ApiSearch close={closeSearch}/>}

      <div className="sr-only" aria-live="polite" aria-atomic="true">{routeAnnouncement}</div>

      <main id="main-content" tabIndex={-1} ref={main}>
        {navigation.error && <p className="container" role="alert">{navigation.error}</p>}
        {!activeSlug || activeSlug === 'front-page' ? (
          <Home
            presentation={site.data?.presentation}
            site={site.data}
            illustration={<HeroShowcase/>}
          />
        ) : activeSlug === 'contact' ? (
          <div className="contact-page container page-layout !w-full !max-w-none !grid-cols-1 !gap-0 px-6 lg:px-10">
            <div className="page-main mx-auto w-full max-w-7xl">
              <div className="breadcrumb">
                <a href="/">Acasă</a>
                <span aria-hidden="true">›</span>
                <span>Contact</span>
              </div>
              <h1>Contact</h1>
              <Contact site={site.data}/>
            </div>
          </div>
        ) : activeSlug === 'politica-cookie-uri' ? (
          <CookiePolicy site={site.data}/>
        ) : (
          <CmsPage key={activeSlug} slug={activeSlug} onReady={pageReady}/>
        )}
      </main>

      <footer className="!bg-[#12447d] !text-white">
        <div className="container footer-main">
          <div>
            <Brand footer site={site.data}/>
            <p>{site.data?.presentation?.footer?.description || 'Comuna Corcova, Județul Mehedinți.'}</p>
          </div>

          {site.data?.presentation?.footer?.groups?.map((group, index) => (
            <div key={index}>
              <h3 className="!text-white">{group.title}</h3>
              {group.links?.map((link, i) => (
                <a className="!text-white/80 hover:!text-white" key={i} href={safeHref(link.href)}>{link.label}</a>
              ))}
            </div>
          ))}

          <div className="footer-contact">
              <h3 className="!text-white">Contact</h3>
            <div className="footer-contact-item">
              <MapPin className="!text-white" size={18}/>
              <span>
                {site.data?.presentation?.footer?.location || 'Comuna Corcova'}<br/>
                <small>{site.data?.address || 'Județul Mehedinți'}</small>
              </span>
            </div>
            <a className="footer-contact-item footer-contact-link" href={`mailto:${site.data?.email || 'primaria.corcova@gmail.com'}`}>
              <Mail className="!text-white" size={18}/>
              <span>{site.data?.email || 'primaria.corcova@gmail.com'}</span>
            </a>
            <a className="footer-contact-item footer-contact-link" href={`tel:${(site.data?.phone || '0252 383 464').replace(/[\s.]/g, '')}`}>
              <Phone className="!text-white" size={18}/>
              <span>{site.data?.phone || '0252 383 464'}</span>
            </a>
          </div>
        </div>

        <div className="container footer-bottom !border-indigo-800 !text-white/75">
          <span>© {new Date().getFullYear()} {site.data?.name || 'Primăria Comunei Corcova'}</span>
          <div className="footer-legal">
            <a href="/politica-cookie-uri">Politica de cookie-uri</a>
            <button type="button" onClick={() => window.dispatchEvent(new Event('open-accessibility-tools'))}>Accesibilitate</button>
            <span>{site.data?.presentation?.footer?.caption || 'În serviciul comunității.'}</span>
          </div>
        </div>
      </footer>

      <CookieNotice/>
      <AccessibilityTools/>
      <Chatbot site={site.data}/>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
