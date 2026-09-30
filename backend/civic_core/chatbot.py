import html
import logging
import os
import re
from django.urls import reverse
from django.utils.html import strip_tags
from .models import Institution, Page
from documents.models import Document

logger = logging.getLogger(__name__)


def normalize_ro(text: str) -> str:
    """Normalize text by converting to lower case and replacing Romanian diacritics."""
    text = (text or '').lower()
    replacements = {
        'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ş': 's', 'ț': 't', 'ţ': 't'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def get_stem(w: str) -> str:
    w = normalize_ro(w)
    suffixes = [
        'urilor', 'iilor', 'elor', 'ilor', 'ului', 'atilor', 'atie', 'atia',
        'ator', 'atori', 'eaza', 'easca', 'esti', 'esc', 'ica', 'ice', 'ici', 'ic',
        'ian', 'iana', 'iene', 'ism', 'ist', 'isti', 'ul', 'le', 'ea', 'ii', 'ei',
        'or', 'ie', 'ia', 'at', 'ata', 'ati', 'ate', 'a', 'e', 'i', 'u'
    ]
    for suffix in suffixes:
        if len(w) > len(suffix) + 3 and w.endswith(suffix):
            return w[:-len(suffix)]
    return w


def clean_html_content(raw_html: str) -> str:
    """Convert HTML content into clean readable plain text."""
    if not raw_html:
        return ''
    text = re.sub(r'<(?:br|/p|/div|/h\d|/li)\s*>', '\n', raw_html, flags=re.I)
    text = strip_tags(text)
    text = html.unescape(text)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '\n'.join(lines)


def get_doc_url(doc: Document) -> str:
    if doc.file:
        try:
            return reverse('documents:download', kwargs={'site_slug': doc.institution.slug, 'pk': doc.pk})
        except Exception:
            pass
    return doc.external_url or '#/documente'


def make_page_summary(page: Page, plain_body: str, stems: list) -> str:
    """Extract or synthesize a short, informative summary (2-3 sentences) from a page."""
    if page.summary and len(page.summary.strip()) >= 35:
        return page.summary.strip()

    paragraphs = [p.strip() for p in plain_body.split('\n') if len(p.strip()) > 25]
    if not paragraphs:
        if plain_body:
            return plain_body[:250] + ('…' if len(plain_body) > 250 else '')
        return f"Pagina oficială conține detalii administrative despre {page.title}."

    scored = []
    for idx, p in enumerate(paragraphs):
        norm_p = normalize_ro(p)
        pos_bonus = max(0, 6 - idx)
        stem_matches = sum(1 for s in stems if s in norm_p)
        score = stem_matches * 10 + pos_bonus
        scored.append((score, idx, p))

    scored.sort(key=lambda x: (x[0], -x[1]), reverse=True)

    picked = [scored[0][2]]
    curr_len = len(picked[0])
    for _, _, p in scored[1:]:
        if curr_len < 180 and p not in picked:
            picked.append(p)
            curr_len += len(p)
        if len(picked) >= 2 or curr_len >= 320:
            break

    summary = ' '.join(picked)
    if len(summary) > 420:
        sentences = re.split(r'(?<=[.!?])\s+', summary)
        shortened = ''
        for s in sentences:
            if len(shortened) + len(s) < 380:
                shortened += (' ' if shortened else '') + s
            else:
                break
        summary = shortened if shortened else summary[:380] + '…'

    return summary


def make_doc_snippet(doc: Document, tokens: list, stems: list) -> str:
    """Extract a concise context excerpt (1-2 sentences) from the document's extracted or OCR text."""
    text = doc.extracted_text or doc.description or ''
    if not text:
        return ''

    # Clean text
    clean_text = ' '.join(text.split())
    if len(clean_text) <= 220:
        return clean_text

    # Search by sentences/clauses
    sentences = re.split(r'(?<=[.!?;\n])\s+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    if not sentences:
        return clean_text[:220] + '…'

    scored_sentences = []
    for idx, s in enumerate(sentences):
        norm_s = normalize_ro(s)
        match_count = sum(1 for stem in stems if stem in norm_s)
        if match_count > 0:
            scored_sentences.append((match_count, idx, s))

    if scored_sentences:
        scored_sentences.sort(key=lambda x: (x[0], -x[1]), reverse=True)
        best_idx = scored_sentences[0][1]
        best_sent = sentences[best_idx]
        
        # Optionally attach next sentence if short
        if len(best_sent) < 140 and best_idx + 1 < len(sentences):
            best_sent += ' ' + sentences[best_idx + 1]

        clean_excerpt = ' '.join(best_sent.split())
        if len(clean_excerpt) > 280:
            return clean_excerpt[:260] + '…'
        return clean_excerpt

    return clean_text[:220] + '…'


def get_contact_response(institution: Institution) -> dict:
    phone = institution.phone or '0252 383 464'
    email = institution.email or 'primaria.corcova@gmail.com'
    address = institution.address or 'Sat Corcova, Comuna Corcova, Județul Mehedinți, Cod Poștal 227125'

    reply = (
        f"📋 **Date oficiale de contact — {institution.name}:**\n"
        f"• **E-mail:** [{email}](mailto:{email})\n"
        f"• **Telefon:** [{phone}](tel:{phone.replace(' ', '')})\n"
        f"• **Adresă:** {address}\n\n"
        f"🔗 **Unde puteți citi mai multe / trimite un mesaj:**\n"
        f"👉 [Formularul de Contact și Locație](#/contact)"
    )
    return {
        'reply': reply,
        'sources': [{'title': 'Contact Primărie', 'url': '#/contact'}]
    }


def get_leadership_response(institution: Institution) -> dict:
    reply = (
        f"🏛️ **Conducerea Executivă și Administrația — {institution.name}:**\n\n"
        f"• 🎖️ **Primar:** Adam DURAC *(Demnitar ales)*\n"
        f"• 🎖️ **Viceprimar:** Gheorghe GOLOGAN *(Protecția mediului)*\n"
        f"• 📜 **Secretar General:** George Marian COARDĂ *(Achiziții publice & Resurse umane)*\n"
        f"• 💼 **Contabil Șef:** Camelia ENESCU *(Contabilitate, Finanțe & Informatică)*\n\n"
        f"👥 **Aparatul de Specialitate & Servicii Publice:**\n"
        f"• **Administrație publică:** Emanoil ROȘU\n"
        f"• **Urbanism & Cadastru:** Aurica MÎNDRUȚ\n"
        f"• **Stare civilă & Evidența persoanelor:** Emil Octavian MOGOȘANU\n"
        f"• **Protecție civilă & Situații de urgență:** Constantin BĂRBULESCU\n"
        f"• **Asistență socială:** Ana ȘERBAN, Victoria VLAD\n\n"
        f"🔗 **Unde puteți citi mai multe:**\n"
        f"👉 [Organigrama Primăriei Corcova](#/organigrama)\n"
        f"👉 [Administrația Locală](#/administratia)"
    )
    return {
        'reply': reply,
        'sources': [
            {'title': 'Organigrama', 'url': '#/organigrama'},
            {'title': 'Administrația Locală', 'url': '#/administratia'}
        ]
    }


def get_greeting_response(institution: Institution) -> dict:
    reply = (
        f"Bună ziua! Sunt asistentul virtual al **{institution.name}**.\n\n"
        f"Vă pot oferi rezumate rapide, documente descărcabile și linkuri utile despre:\n"
        f"• Date de contact, telefon și e-mail primărie\n"
        f"• Prezentarea comunei (istoric, așezare geografică, sate)\n"
        f"• Conducerea Primăriei (Primar, Viceprimar, Organigramă)\n"
        f"• Asistență socială, ajutoare și formulare tipizate\n"
        f"• Hotărâri și acte în Monitorul Oficial Local și Arhiva de Documente\n\n"
        f"🔗 **Unde puteți citi mai multe:**\n"
        f"👉 [Organigrama Primăriei](#/organigrama)\n"
        f"👉 [Informații publice](#/informatii-publice)\n"
        f"👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
        f"👉 [Date de contact](#/contact)"
    )
    return {
        'reply': reply,
        'sources': [
            {'title': 'Organigrama', 'url': '#/organigrama'},
            {'title': 'Contact', 'url': '#/contact'},
            {'title': 'Informații publice', 'url': '#/informatii-publice'},
            {'title': 'Monitorul Oficial', 'url': '#/monitorul-oficial-local'}
        ]
    }


def search_knowledge_base(institution: Institution, question: str) -> dict:
    norm_q = normalize_ro(question)
    tokens = [t for t in re.findall(r'\b\w{3,}\b', norm_q) if t not in {
        'care', 'unde', 'este', 'sunt', 'cum', 'pot', 'face', 'aveti', 'pentru', 'despre', 'acest', 'aceasta', 'prin', 'dintre'
    }]
    stems = [get_stem(t) for t in tokens]

    # 1. Leadership Intent (high priority)
    leadership_keywords = [
        'conducere', 'conducerea', 'conduce', 'primar', 'primarul', 'viceprimar',
        'viceprimarul', 'secretar', 'secretarul', 'consiliu', 'consiliul', 'consilier',
        'consilieri', 'organigrama', 'aparat de specialitate', 'aparatul de specialitate',
        'cine este primar', 'cine e primar', 'cine conduce', 'cine e la conducere',
        'cine este la conducere', 'cine este la carma', 'cum il cheama pe primar',
        'cine este viceprimar', 'cine e viceprimar', 'durac', 'gologan'
    ]
    is_asking_leadership = any(k in norm_q for k in leadership_keywords) or (
        ('cine' in norm_q or 'care' in norm_q) and any(w in norm_q for w in ['conduc', 'primar', 'viceprimar', 'executiv'])
    )
    if is_asking_leadership:
        return get_leadership_response(institution)

    # 2. Contact Intent
    contact_keywords = {'contact', 'telefon', 'mail', 'email', 'numar de telefon', 'adresa de mail', 'adresa primariei', 'sediu', 'programul'}
    is_asking_contact = any(k in norm_q for k in contact_keywords) or (
        ('adresa' in norm_q or 'unde se afla' in norm_q) and ('primaria' in norm_q or 'sediul' in norm_q)
    )
    if is_asking_contact and not any(k in norm_q for k in {'geografia', 'populatia', 'relief', 'comuna corcova'}):
        return get_contact_response(institution)

    # 3. Greeting Intent
    greetings = {'buna', 'salut', 'buna ziua', 'buna dimineata', 'buna seara', 'hello', 'servus'}
    if any(norm_q == g or norm_q.startswith(g + ' ') for g in greetings) and len(tokens) <= 2:
        return get_greeting_response(institution)

    # 4. Search Published Pages
    pages = list(institution.pages.filter(status='published'))
    scored_pages = []

    for page in pages:
        norm_title = normalize_ro(page.title)
        norm_slug = normalize_ro(page.slug)
        plain_body = clean_html_content(page.body)
        norm_body = normalize_ro(plain_body)
        norm_summary = normalize_ro(page.summary)

        score = 0
        matched_tokens = 0

        # Exact title / slug match
        if norm_q in norm_title or norm_title in norm_q:
            score += 50
        if norm_slug in norm_q:
            score += 40

        for t, s in zip(tokens, stems):
            in_title = t in norm_title or s in norm_title
            in_summary = t in norm_summary or s in norm_summary
            in_body = t in norm_body or s in norm_body

            if in_title:
                score += 20
                matched_tokens += 1
            elif in_summary:
                score += 10
                matched_tokens += 1
            elif in_body:
                score += 5
                matched_tokens += 1

        if score > 0:
            scored_pages.append((score, matched_tokens, page, plain_body))

    scored_pages.sort(key=lambda x: (x[0], x[1]), reverse=True)

    # 5. Search Documents (Title, Description, AND Extracted / OCR Text)
    scored_docs = []
    docs = list(Document.objects.filter(institution=institution))
    for doc in docs:
        norm_doc_title = normalize_ro(doc.title)
        norm_doc_desc = normalize_ro(doc.description)
        norm_extracted = normalize_ro(doc.extracted_text)

        d_score = 0
        matched_text_tokens = 0

        # Exact title match
        if norm_q in norm_doc_title:
            d_score += 45

        for t, s in zip(tokens, stems):
            if t in norm_doc_title or s in norm_doc_title:
                d_score += 25
            elif t in norm_doc_desc or s in norm_doc_desc:
                d_score += 15
            elif norm_extracted and (t in norm_extracted or s in norm_extracted):
                d_score += 8
                matched_text_tokens += 1

        if matched_text_tokens >= 2:
            d_score += 18
        if norm_extracted and norm_q in norm_extracted:
            d_score += 35

        if d_score > 0:
            snippet = make_doc_snippet(doc, tokens, stems)
            scored_docs.append((d_score, doc, snippet, matched_text_tokens))

    scored_docs.sort(key=lambda x: x[0], reverse=True)

    # Response Case A: Strongly matching page found
    if scored_pages and scored_pages[0][0] >= 10:
        best_score, _, best_page, plain_body = scored_pages[0]

        summary = make_page_summary(best_page, plain_body, stems)
        reply_sections = [
            f"📋 **Rezumat — {best_page.title}:**\n{summary}"
        ]

        # Associated and Relevant Documents
        page_docs = list(best_page.documents.filter(status='published')[:3])
        extra_docs = []
        seen_doc_ids = {d.id for d in page_docs}
        for _, d, snip, _ in scored_docs[:3]:
            if d.id not in seen_doc_ids:
                extra_docs.append((d, snip))
                seen_doc_ids.add(d.id)

        sources = [{'title': best_page.title, 'url': f"#/{best_page.slug}"}]

        doc_lines = []
        for d in page_docs:
            d_url = get_doc_url(d)
            date_str = f" *(emis la {d.issued_on})*" if d.issued_on else ""
            doc_lines.append(f"• 📄 [{d.title}]({d_url}){date_str}")
            sources.append({'title': d.title, 'url': d_url})

        for d, snip in extra_docs[:2]:
            d_url = get_doc_url(d)
            date_str = f" *(emis la {d.issued_on})*" if d.issued_on else ""
            snip_text = f"\n  > „{snip}”" if snip else ""
            doc_lines.append(f"• 📄 [{d.title}]({d_url}){date_str}{snip_text}")
            sources.append({'title': d.title, 'url': d_url})

        if doc_lines:
            reply_sections.append("📂 **Documente și formulare conexe:**\n" + "\n".join(doc_lines))

        # Where to Read More
        read_more = [
            f"👉 **Pagina completă:** [{best_page.title}](#/{best_page.slug})"
        ]

        siblings = []
        if best_page.section_id:
            siblings = list(best_page.section.pages.filter(status='published').exclude(id=best_page.id)[:2])
        elif len(scored_pages) > 1:
            siblings = [scored_pages[1][2]]

        for s in siblings[:2]:
            read_more.append(f"👉 **Pagină conexă:** [{s.title}](#/{s.slug})")
            sources.append({'title': s.title, 'url': f"#/{s.slug}"})

        reply_sections.append("🔗 **Unde puteți citi mai multe:**\n" + "\n".join(read_more))

        reply = "\n\n".join(reply_sections)
        return {'reply': reply, 'sources': sources}

    # Response Case B: Relevant document(s) found via title, description, or OCR/extracted text
    if scored_docs and scored_docs[0][0] >= 8:
        best_d_score, best_doc, best_snippet, best_matched_text = scored_docs[0]
        sources = []
        best_url = get_doc_url(best_doc)
        sources.append({'title': best_doc.title, 'url': best_url})

        reply_sections = []
        if best_snippet and (best_matched_text > 0 or best_doc.extracted_text):
            reply_sections.append(
                f"📄 **Informație identificată în documentul oficial — {best_doc.title}:**\n"
                f"> „{best_snippet}”\n\n"
                f"👉 **Descarcă documentul complet:** [{best_doc.title}]({best_url})"
            )
        else:
            reply_sections.append(
                f"📄 **Document oficial identificat:**\n"
                f"👉 [{best_doc.title}]({best_url})"
            )

        # Other matching documents
        other_docs = scored_docs[1:4]
        if other_docs:
            other_lines = []
            for _, d, snip, _ in other_docs:
                d_url = get_doc_url(d)
                date_str = f" *(emis la {d.issued_on})*" if d.issued_on else ""
                snip_suffix = f"\n  > „{snip}”" if snip else ""
                other_lines.append(f"• 📄 [{d.title}]({d_url}){date_str}{snip_suffix}")
                sources.append({'title': d.title, 'url': d_url})
            reply_sections.append("📂 **Alte documente conexe:**\n" + "\n".join(other_lines))

        reply_sections.append(
            "🔗 **Unde puteți citi mai multe:**\n"
            "👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
            "👉 [Informații publice](#/informatii-publice)"
        )
        sources.append({'title': 'Monitorul Oficial', 'url': '#/monitorul-oficial-local'})
        sources.append({'title': 'Informații publice', 'url': '#/informatii-publice'})

        return {'reply': "\n\n".join(reply_sections), 'sources': sources}

    # Fallback
    reply = (
        f"Nu am găsit informații exacte despre întrebarea dumneavoastră în paginile sau documentele publicate.\n\n"
        f"🔗 **Unde puteți căuta mai multe informații:**\n"
        f"👉 [Informații publice](#/informatii-publice)\n"
        f"👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
        f"👉 [Formular de Contact direct cu primăria](#/contact) sau telefon **{institution.phone or '0252 383 464'}**"
    )
    return {
        'reply': reply,
        'sources': [
            {'title': 'Contact', 'url': '#/contact'},
            {'title': 'Informații publice', 'url': '#/informatii-publice'}
        ]
    }


def ask_chatbot(institution: Institution, question: str, history: list = None) -> dict:
    """Entry point for the chatbot. Uses LLM if API key is provided, otherwise SQL retrieval engine."""
    question = (question or '').strip()
    if not question:
        return {
            'reply': 'Vă rugăm să introduceți o întrebare.',
            'sources': []
        }

    # Check for optional Gemini API key
    gemini_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            rag = search_knowledge_base(institution, question)
            context = f"Instituție: {institution.name}\nAdresă: {institution.address}\nTelefon: {institution.phone}\nEmail: {institution.email}\nInformații găsite în baza de date:\n{rag['reply']}"
            system_instruction = (
                "Ești asistentul virtual oficial al Primăriei Comunei Corcova, județul Mehedinți. "
                "Răspunde întotdeauna prietenos și structurat în limba română, folosind cu prioritate informațiile din context:\n"
                "1. 📋 Răspuns: prezintă clar informația solicitată.\n"
                "2. 📂 Documente și formulare conexe: documentele oficiale relevante cu linkurile lor markdown.\n"
                "3. 🔗 Unde puteți citi mai multe: linkuri utile către secțiunile site-ului.\n"
                "Păstrează toate linkurile markdown [Text](url) intacte. Dacă contextul indică date specifice (ex: primar actual Adam Durac, program, contact), respectă-le cu strictețe."
            )
            primary_model = os.environ.get('GEMINI_MODEL', 'gemini-3.5-flash')
            candidate_models = list(dict.fromkeys([primary_model, 'gemini-flash-lite-latest', 'gemini-3.8-flash']))
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=f"{system_instruction}\n\nContext:\n{context}\n\nÎntrebare cetățean: {question}"
                    )
                    if response and response.text:
                        return {'reply': response.text, 'sources': rag.get('sources', [])}
                except Exception as model_err:
                    logger.warning(f"Gemini model {model_name} failed: {model_err}")
                    continue
        except Exception as e:
            logger.warning(f"Gemini client setup failed, falling back to local RAG search: {e}")

    return search_knowledge_base(institution, question)

