import React, { useEffect, useRef, useState } from 'react';
import {
  Accessibility,
  Eye,
  Link2,
  Minus,
  MoveHorizontal,
  PauseCircle,
  Plus,
  RotateCcw,
  Square,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import './site-utilities.css';

const COOKIE_NOTICE_KEY = 'corcova_cookie_notice_v1';
const ACCESSIBILITY_KEY = 'corcova_accessibility_v1';

const DEFAULT_PREFERENCES = {
  textSize: 100,
  highContrast: false,
  readableFont: false,
  increasedSpacing: false,
  highlightLinks: false,
  readingGuide: false,
  reduceMotion: false,
};

function splitSpeechText(value, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text];
  const chunks = [];
  let current = '';

  const pushCurrent = () => {
    if (current) chunks.push(current.trim());
    current = '';
  };

  sentences.forEach(sentence => {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) return;
    if (`${current} ${cleanSentence}`.trim().length <= maxLength) {
      current = `${current} ${cleanSentence}`.trim();
      return;
    }
    pushCurrent();
    if (cleanSentence.length <= maxLength) {
      current = cleanSentence;
      return;
    }
    const words = cleanSentence.split(' ');
    words.forEach(word => {
      if (`${current} ${word}`.trim().length > maxLength) pushCurrent();
      current = `${current} ${word}`.trim();
    });
  });
  pushCurrent();
  return chunks;
}

function loadPreferences() {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY) || '{}') };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function CookieNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(COOKIE_NOTICE_KEY) !== 'acknowledged';
    } catch {
      return true;
    }
  });
  const bannerRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (!visible) {
      body.classList.remove('cookie-notice-visible');
      root.style.removeProperty('--cookie-notice-height');
      return undefined;
    }

    body.classList.add('cookie-notice-visible');
    const updateHeight = () => {
      const height = Math.ceil(bannerRef.current?.getBoundingClientRect().height || 0);
      root.style.setProperty('--cookie-notice-height', `${height}px`);
    };
    updateHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    if (bannerRef.current && observer) observer.observe(bannerRef.current);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateHeight);
      body.classList.remove('cookie-notice-visible');
      root.style.removeProperty('--cookie-notice-height');
    };
  }, [visible]);

  if (!visible) return null;

  const acknowledge = () => {
    try {
      localStorage.setItem(COOKIE_NOTICE_KEY, 'acknowledged');
    } catch {
      // The notice can still be dismissed when private browsing blocks storage.
    }
    setVisible(false);
  };

  return (
    <section ref={bannerRef} className="cookie-notice" aria-label="Informare despre cookie-uri">
      <div className="cookie-notice-content">
        <p>
          Acest site folosește doar cookie-uri strict necesare funcționării și securității sale.
          Nu urmărim vizitatorii și nu folosim cookie-uri de publicitate.{' '}
          <a href="/politica-cookie-uri">Politica de cookie-uri</a>.
        </p>
        <button type="button" onClick={acknowledge}>Am înțeles</button>
      </div>
    </section>
  );
}

function PreferenceButton({ active, icon, children, onClick }) {
  return (
    <button
      className={`a11y-option${active ? ' is-active' : ''}`}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function AccessibilityTools() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const guideRef = useRef(null);
  const speechRef = useRef({ session: 0, utterance: null });
  const [speechStatus, setSpeechStatus] = useState('idle');
  const [speechMessage, setSpeechMessage] = useState('');
  const [voices, setVoices] = useState([]);

  const updatePreference = (name, value) => {
    setPreferences(current => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(preferences));
    } catch {
      // Accessibility remains functional even when local storage is disabled.
    }

    const root = document.documentElement;
    root.classList.toggle('a11y-high-contrast', preferences.highContrast);
    root.classList.toggle('a11y-readable-font', preferences.readableFont);
    root.classList.toggle('a11y-increased-spacing', preferences.increasedSpacing);
    root.classList.toggle('a11y-highlight-links', preferences.highlightLinks);
    root.classList.toggle('a11y-reduce-motion', preferences.reduceMotion);

    return () => {
      Object.keys(DEFAULT_PREFERENCES)
        .filter(key => key !== 'textSize' && key !== 'readingGuide')
        .forEach(key => root.classList.remove(`a11y-${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`));
    };
  }, [preferences]);

  useEffect(() => {
    const selector = [
      'main h1', 'main h2', 'main h3', 'main h4', 'main h5', 'main h6',
      'main p', 'main li', 'main a', 'main button', 'main label', 'main input', 'main textarea',
      'header a', 'header button', 'nav a', 'nav button',
      'footer h3', 'footer p', 'footer a', 'footer button', 'footer span',
    ].join(',');

    const applyTextSize = () => {
      document.querySelectorAll(selector).forEach(element => {
        if (element.closest('.accessibility-widget, .cookie-notice, .chatbot-window, .ghiseul-floating-link')) return;
        if (!element.dataset.a11yBaseFontSize) {
          element.dataset.a11yBaseFontSize = String(parseFloat(getComputedStyle(element).fontSize) || 16);
          element.dataset.a11yOriginalFontSize = element.style.fontSize || '';
        }
        if (preferences.textSize === 100) {
          element.style.fontSize = element.dataset.a11yOriginalFontSize;
        } else {
          const base = Number(element.dataset.a11yBaseFontSize);
          element.style.fontSize = `${(base * preferences.textSize / 100).toFixed(2)}px`;
        }
      });
    };

    applyTextSize();
    const observer = new MutationObserver(applyTextSize);
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [preferences.textSize]);

  useEffect(() => {
    if (!preferences.readingGuide) return undefined;
    const moveGuide = event => {
      if (guideRef.current) guideRef.current.style.transform = `translateY(${event.clientY}px)`;
    };
    window.addEventListener('pointermove', moveGuide, { passive: true });
    return () => window.removeEventListener('pointermove', moveGuide);
  }, [preferences.readingGuide]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('open-accessibility-tools', openPanel);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('open-accessibility-tools', openPanel);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices?.() || []);
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      speechRef.current.session += 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  const speakPage = () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setSpeechStatus('error');
      setSpeechMessage('Browserul nu oferă citire cu voce. Încercați Chrome, Edge sau Safari actualizat.');
      return;
    }

    const chunks = splitSpeechText(document.querySelector('main')?.innerText);
    if (!chunks.length) {
      setSpeechStatus('error');
      setSpeechMessage('Nu există text disponibil pentru citire pe această pagină.');
      return;
    }

    speechRef.current.session += 1;
    const session = speechRef.current.session;
    window.speechSynthesis.cancel();
    setSpeechStatus('speaking');
    setSpeechMessage('Citirea paginii a început.');

    const speakChunk = index => {
      if (speechRef.current.session !== session) return;
      if (index >= chunks.length) {
        speechRef.current.utterance = null;
        setSpeechStatus('idle');
        setSpeechMessage('Citirea paginii s-a încheiat.');
        return;
      }

      const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
      const availableVoices = window.speechSynthesis.getVoices?.() || voices;
      utterance.voice = availableVoices.find(voice => voice.lang?.toLowerCase().startsWith('ro'))
        || availableVoices.find(voice => voice.default)
        || null;
      utterance.lang = utterance.voice?.lang || 'ro-RO';
      utterance.rate = 0.95;
      utterance.volume = 1;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = event => {
        if (speechRef.current.session !== session || ['canceled', 'interrupted'].includes(event.error)) return;
        speechRef.current.utterance = null;
        setSpeechStatus('error');
        setSpeechMessage('Citirea nu a putut porni. Verificați volumul dispozitivului și setările browserului.');
      };
      speechRef.current.utterance = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Chromium may discard a new utterance when cancel() and speak() run in
    // the same task. Keeping the object in a ref also prevents long reads from
    // being stopped by garbage collection.
    window.setTimeout(() => speakChunk(0), 80);
  };

  const stopSpeaking = (announce = true) => {
    speechRef.current.session += 1;
    speechRef.current.utterance = null;
    window.speechSynthesis?.cancel();
    setSpeechStatus('idle');
    if (announce) setSpeechMessage('Citirea paginii a fost oprită.');
  };

  const resetPreferences = () => {
    stopSpeaking(false);
    setPreferences(DEFAULT_PREFERENCES);
  };

  return (
    <div className="accessibility-widget">
      {preferences.readingGuide && <div ref={guideRef} className="a11y-reading-guide" aria-hidden="true" />}

      {open && (
        <section ref={panelRef} className="a11y-panel" aria-label="Opțiuni de accesibilitate">
          <div className="a11y-panel-header">
            <strong>Opțiuni de accesibilitate</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Închide opțiunile de accesibilitate">
              <X size={20} />
            </button>
          </div>

          <span className="a11y-group-title">Mărimea textului</span>
          <div className="a11y-text-size" aria-label="Mărimea textului">
            <button
              type="button"
              aria-label="Micșorează textul"
              disabled={preferences.textSize <= 80}
              onClick={() => updatePreference('textSize', Math.max(80, preferences.textSize - 10))}
            >
              <Minus size={17} /> A−
            </button>
            <strong aria-live="polite">{preferences.textSize}%</strong>
            <button
              type="button"
              aria-label="Mărește textul"
              disabled={preferences.textSize >= 150}
              onClick={() => updatePreference('textSize', Math.min(150, preferences.textSize + 10))}
            >
              A+ <Plus size={17} />
            </button>
          </div>

          <span className="a11y-group-title">Afișare</span>
          <div className="a11y-options">
            <PreferenceButton active={preferences.highContrast} icon={<Eye size={18}/>} onClick={() => updatePreference('highContrast', !preferences.highContrast)}>Contrast ridicat</PreferenceButton>
            <PreferenceButton active={preferences.readableFont} icon={<Type size={18}/>} onClick={() => updatePreference('readableFont', !preferences.readableFont)}>Font mai lizibil</PreferenceButton>
            <PreferenceButton active={preferences.increasedSpacing} icon={<MoveHorizontal size={18}/>} onClick={() => updatePreference('increasedSpacing', !preferences.increasedSpacing)}>Spațiere mărită</PreferenceButton>
            <PreferenceButton active={preferences.highlightLinks} icon={<Link2 size={18}/>} onClick={() => updatePreference('highlightLinks', !preferences.highlightLinks)}>Evidențiază legăturile</PreferenceButton>
          </div>

          <span className="a11y-group-title">Ajutor la citire</span>
          <div className="a11y-options">
            <PreferenceButton active={preferences.readingGuide} icon={<Square size={18}/>} onClick={() => updatePreference('readingGuide', !preferences.readingGuide)}>Linie de ghidaj</PreferenceButton>
            <PreferenceButton active={preferences.reduceMotion} icon={<PauseCircle size={18}/>} onClick={() => updatePreference('reduceMotion', !preferences.reduceMotion)}>Oprește animațiile</PreferenceButton>
          </div>

          <span className="a11y-group-title">Citire cu voce</span>
          <div className="a11y-speech-controls">
            <button type="button" aria-pressed={speechStatus === 'speaking'} onClick={speakPage}><Volume2 size={18}/> {speechStatus === 'speaking' ? 'Reia citirea' : 'Citește pagina'}</button>
            <button type="button" disabled={speechStatus !== 'speaking'} onClick={() => stopSpeaking()}><Square size={16}/> Oprește</button>
          </div>
          <p className={`a11y-speech-status${speechStatus === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">{speechMessage}</p>

          <button className="a11y-reset" type="button" onClick={resetPreferences}>
            <RotateCcw size={17}/> Revino la setările inițiale
          </button>
        </section>
      )}

      <button
        ref={buttonRef}
        className="a11y-trigger"
        type="button"
        aria-label="Accesibilitate"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <Accessibility size={21} aria-hidden="true" />
        <span>Accesibilitate</span>
      </button>
    </div>
  );
}

export function CookiePolicy({ site }) {
  const institution = site?.name || 'Primăria Comunei Corcova';
  return (
    <div className="container page-layout cookie-policy-page">
      <article className="page-main">
        <div className="breadcrumb">
          <a href="/">Acasă</a><span aria-hidden="true">›</span><span>Politica de cookie-uri</span>
        </div>
        <h1>Politica de cookie-uri</h1>
        <div className="archive-content">
          <h2>Ce sunt cookie-urile</h2>
          <p>Cookie-urile sunt fișiere text de mici dimensiuni pe care un site le poate salva în browserul vizitatorului.</p>

          <h2>Ce cookie-uri folosește acest site</h2>
          <p>
            Site-ul {institution} nu folosește cookie-uri de marketing, publicitate sau analiză a traficului.
            Sunt utilizate numai mecanisme strict necesare pentru funcționare, securitate și pentru memorarea
            preferințelor locale, precum confirmarea acestei informări și opțiunile de accesibilitate.
          </p>
          <p>Zona de administrare poate folosi cookie-uri tehnice de sesiune și protecție CSRF pentru autentificarea în siguranță a editorilor autorizați.</p>

          <h2>Cum puteți controla cookie-urile</h2>
          <p>Puteți șterge sau bloca cookie-urile și datele locale din setările browserului. Blocarea celor strict necesare poate împiedica funcționarea corectă a anumitor opțiuni.</p>

          <h2>Contact</h2>
          <p>Pentru întrebări privind confidențialitatea și datele personale, folosiți datele publicate în <a href="/contact">pagina de contact</a>.</p>
        </div>
      </article>
    </div>
  );
}
