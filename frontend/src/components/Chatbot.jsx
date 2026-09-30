import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, X, Send, Bot, FileText, ArrowUpRight } from 'lucide-react';
import { siteApi } from '../api';
import countyLogo from '../logo_mehedinti.png';
import './chatbot.css';

const INITIAL_GREETING = 'Bună ziua! Sunt asistentul virtual al Primăriei Comunei Corcova. Cu ce vă putem ajuta astăzi?';

const SUGGESTIONS = [
  '📞 Care sunt datele de contact?',
  '📍 Unde se află comuna Corcova?',
  '📄 Ce formulare și tipizate există?',
  '🏛️ Cine face parte din conducerea primăriei?'
];

// Local knowledge base for standalone mode
function answerLocally(query) {
  const q = query.toLowerCase();

  if (q.includes('contact') || q.includes('telefon') || q.includes('email') || q.includes('mail') || q.includes('numar') || q.includes('adresa') || q.includes('fax')) {
    return {
      text: '**Datele de contact ale Primăriei Comunei Corcova:**\n\n' +
        '• **Adresă:** Sat Corcova, Comuna Corcova, Județul Mehedinți, Cod Poștal 227125\n' +
        '• **Telefon:** 0252 383 464\n' +
        '• **Fax:** 0252 383 465\n' +
        '• **E-mail:** primaria.corcova@gmail.com\n\n' +
        'Puteți de asemenea să ne trimiteți un mesaj direct din [Formularul de Contact](#/contact).',
      sources: [{ title: 'Pagina de Contact', url: '#/contact' }]
    };
  }

  if (q.includes('primar') || q.includes('viceprimar') || q.includes('conducere') || q.includes('organigrama') || q.includes('secretar') || q.includes('echipa')) {
    return {
      text: '**Conducerea Primăriei Comunei Corcova:**\n\n' +
        '• **Primar:** DURAC Adam\n' +
        '• **Viceprimar:** GOLOGAN Gheorghe\n' +
        '• **Secretar:** COARDĂ George Marian\n' +
        '• **Contabil:** ENESCU Camelia\n\n' +
        'Pentru detalii complete privind aparatul administrativ și compartimentele de specialitate, consultați [Organigrama Primăriei](#/organigrama).',
      sources: [
        { title: 'Organigrama', url: '#/organigrama' },
        { title: 'Administrația', url: '#/administratia' }
      ]
    };
  }

  if (q.includes('unde') || q.includes('localiz') || q.includes('sate') || q.includes('sat') || q.includes('geograf') || q.includes('istor')) {
    return {
      text: '**Despre Comuna Corcova:**\n\n' +
        'Comuna Corcova este situată în județul Mehedinți, pe drumul național DN 67, între văile râurilor Motru și Coșuștea, la circa 55 km de municipiul Drobeta Turnu Severin.\n\n' +
        'Comuna are în componență 13 sate: **Corcova** (reședință), Breța, Cernaia, Cordun, Croica, Gârbovățu de Jos, Imoasa, Jirov, Măru Roșu, Pîrvulești, Stejaru și Vlădăsești.\n\n' +
        'Zona este de asemenea renumită pentru tradiția seculară viticolă și podgoriile de la Corcova.',
      sources: [
        { title: 'Geografia comunei', url: '#/geografia' },
        { title: 'Istoria comunei', url: '#/istoria' }
      ]
    };
  }

  if (q.includes('tipizat') || q.includes('formular') || q.includes('asistent') || q.includes('social') || q.includes('alocatie') || q.includes('incalzire') || q.includes('cerere')) {
    return {
      text: '**Formulare și Asistență Socială:**\n\n' +
        'Primăria Corcova pune la dispoziția cetățenilor formulare descărcabile pentru:\n' +
        '• Venit Minim Garantat (VMG / VMI)\n' +
        '• Ajutor pentru încălzirea locuinței\n' +
        '• Alocație de stat și de susținere a familiei\n' +
        '• Indemnizație creștere copil și stimulent de inserție\n' +
        '• Dosare handicap copii și adulți\n\n' +
        'Găsiți toate cererile și modelele descărcabile în secțiunea dedicată.',
      sources: [
        { title: 'Tipizate & Formulare', url: '#/tipizate' },
        { title: 'Asistență Socială', url: '#/compartimentul-de-asistenta-sociala' }
      ]
    };
  }

  if (q.includes('monitor') || q.includes('hotarar') || q.includes('hcl') || q.includes('dispoziti') || q.includes('dsp') || q.includes('buget') || q.includes('finant')) {
    return {
      text: '**Monitorul Oficial Local:**\n\n' +
        'Toate actele normative, hotărârile Consiliului Local Corcova (HCL), dispozițiile primarului (DSP) și situațiile financiare/bugetare sunt publicate în format electronic în [Monitorul Oficial Local](#/monitorul-oficial-local).\n\n' +
        'Puteți filtra documentele după registru, an sau cuvânt-cheie.',
      sources: [
        { title: 'Monitorul Oficial Local', url: '#/monitorul-oficial-local' },
        { title: 'Documente 2022', url: '#/2022-2' }
      ]
    };
  }

  if (q.includes('concurs') || q.includes('angaj') || q.includes('examen') || q.includes('anunt')) {
    return {
      text: '**Anunțuri și Concursuri de Angajare:**\n\n' +
        'Anunțurile privind posturile vacante, organizarea examenelor de promovare și concursurilor publice sunt actualizate periodic pe site.',
      sources: [
        { title: 'Anunțuri și examene', url: '#/anunturi-concursuri-si-examene' }
      ]
    };
  }

  return {
    text: `Am înregistrat întrebarea dumneavoastră legată de „${query}”.\n\n` +
      'Puteți căuta informația în [Căutarea pe site](#/) sau consulta direct secțiunile:\n' +
      '• [Despre Comună](#/geografia)\n' +
      '• [Tipizate & Formulare](#/tipizate)\n' +
      '• [Monitorul Oficial Local](#/monitorul-oficial-local)\n' +
      '• [Contact Primărie](#/contact)',
    sources: [
      { title: 'Monitorul Oficial Local', url: '#/monitorul-oficial-local' },
      { title: 'Contact', url: '#/contact' }
    ]
  };
}

function FormattedText({ text }) {
  if (!text) return null;
  const paragraphs = text.split('\n\n');

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        const isBulletList = lines.every(l => l.trim().startsWith('•') || l.trim().startsWith('-'));

        if (isBulletList) {
          return (
            <ul key={pIdx}>
              {lines.map((l, lIdx) => {
                const clean = l.replace(/^[•-]\s*/, '');
                return <li key={lIdx}>{renderInline(clean)}</li>;
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx}>
            {lines.map((l, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(l)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function renderInline(str) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('[') && token.includes('](')) {
      const label = token.substring(1, token.indexOf(']('));
      const url = token.substring(token.indexOf('](') + 2, token.length - 1);
      parts.push(
        <a key={match.index} href={url} target={url.startsWith('http') || url.includes('/download/') ? '_blank' : undefined} rel="noreferrer">
          {label}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}

export default function Chatbot({ site }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: INITIAL_GREETING,
      sources: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, loading]);

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({
        role: m.sender,
        text: m.text
      }));

      // Try calling backend API first (allow enough time for LLM generation)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(`${siteApi}/chatbot/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'Nu am găsit informații specifice.',
        sources: data.sources || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      // Intelligent local fallback
      const localAnswer = answerLocally(text);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: localAnswer.text,
        sources: localAnswer.sources
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="chatbot-bubble-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Închide asistentul virtual' : 'Deschide asistentul virtual'}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={30} /> : <MessageCircle size={28} />}
      </button>

      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="Asistent Virtual Primăria Corcova">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-wrap">
                <img src={countyLogo} alt="Stema" width="26" height="28" />
                <span className="chatbot-status-dot" aria-label="Online" />
              </div>
              <div className="chatbot-title">
                <strong>Asistent Virtual</strong>
                <span>{site?.name || 'Primăria Comunei Corcova'} • Online</span>
              </div>
            </div>
            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Închide fereastra de chat"
            >
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="chat-msg-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div className="chat-msg-bubble">
                  <FormattedText text={msg.text} />
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                      {msg.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          className="chat-source-chip"
                          target={s.url.startsWith('http') || s.url.includes('/download/') || s.url.includes('/uploads/') ? '_blank' : undefined}
                          rel="noreferrer"
                        >
                          <FileText size={12} />
                          <span>{s.title}</span>
                          <ArrowUpRight size={11} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="chat-quick-suggestions">
                <span className="chat-suggestions-title">Întrebări frecvente:</span>
                <div className="chat-suggestions-list">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      className="chat-suggestion-chip"
                      onClick={() => handleSend(s.replace(/^[^\w\s]+/, '').trim())}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="chat-msg bot">
                <div className="chat-msg-avatar"><Bot size={16}/></div>
                <div className="chat-msg-bubble chat-typing-bubble" aria-label="Se generează răspunsul...">
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <form className="chatbot-input-form" onSubmit={e => { e.preventDefault(); handleSend(); }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Scrieți o întrebare…"
                aria-label="Mesaj pentru asistent"
                disabled={loading}
              />
              <button
                type="submit"
                className="chatbot-send-btn"
                disabled={!input.trim() || loading}
                aria-label="Trimite mesajul"
              >
                <Send size={18} />
              </button>
            </form>
            <small className="chatbot-footer-caption">
              Răspunsuri generate pe baza bazei de date oficiale a primăriei
            </small>
          </div>
        </div>
      )}
    </>
  );
}
