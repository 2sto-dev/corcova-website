import html
import os
import re
from django.urls import reverse
from django.utils.html import strip_tags
from .models import Institution, Page
from documents.models import Document


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
    # 1. Use page summary if already clean and informative
    if page.summary and len(page.summary.strip()) >= 35:
        return page.summary.strip()

    paragraphs = [p.strip() for p in plain_body.split('\n') if len(p.strip()) > 25]
    if not paragraphs:
        if plain_body:
            return plain_body[:250] + ('…' if len(plain_body) > 250 else '')
        return f"Pagina oficială conține detalii administrative despre {page.title}."

    # Score paragraphs based on stem matches + early position bonus
    scored = []
    for idx, p in enumerate(paragraphs):
        norm_p = normalize_ro(p)
        pos_bonus = max(0, 6 - idx)
        stem_matches = sum(1 for s in stems if s in norm_p)
        score = stem_matches * 10 + pos_bonus
        scored.append((score, idx, p))

    scored.sort(key=lambda x: (x[0], -x[1]), reverse=True)

    # Combine top 1-2 coherent paragraphs
    picked = [scored[0][2]]
    curr_len = len(picked[0])
    for _, _, p in scored[1:]:
        if curr_len < 180 and p not in picked:
            picked.append(p)
            curr_len += len(p)
        if len(picked) >= 2 or curr_len >= 320:
            break

    summary = ' '.join(picked)
    # Truncate cleanly at sentence boundary if too long
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


def get_contact_response(institution: Institution) -> dict:
    phone = institution.phone or '0252 391 049'
    email = institution.email or 'clvinatori@pejmh.ro'
    address = institution.address or 'Comuna Vânători, Județul Mehedinți'

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


def get_greeting_response(institution: Institution) -> dict:
    reply = (
        f"Bună ziua! Sunt asistentul virtual al **{institution.name}**.\n\n"
        f"Vă pot oferi rezumate rapide, documente descărcabile și linkuri utile despre:\n"
        f"• Date de contact, telefon și e-mail primărie\n"
        f"• Prezentarea comunei (istoric, așezare geografică, sate)\n"
        f"• Conducere (Primar, Consiliul Local)\n"
        f"• Asistență socială, ajutoare și formulare tipizate\n"
        f"• Hotărâri și acte în Monitorul Oficial Local\n\n"
        f"🔗 **Unde puteți citi mai multe:**\n"
        f"👉 [Informații publice](#/informatii-publice)\n"
        f"👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
        f"👉 [Date de contact](#/contact)"
    )
    return {
        'reply': reply,
        'sources': [
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

    # 1. Contact Intent
    contact_keywords = {'contact', 'telefon', 'mail', 'email', 'numar de telefon', 'adresa de mail', 'adresa primariei', 'sediu', 'programul'}
    is_asking_contact = any(k in norm_q for k in contact_keywords) or (
        ('adresa' in norm_q or 'unde se afla' in norm_q) and ('primaria' in norm_q or 'sediul' in norm_q)
    )
    if is_asking_contact and not any(k in norm_q for k in {'geografia', 'populatia', 'relief', 'comuna vanatori'}):
        return get_contact_response(institution)

    # 2. Greeting Intent
    greetings = {'buna', 'salut', 'buna ziua', 'buna dimineata', 'buna seara', 'hello', 'servus'}
    if any(norm_q == g or norm_q.startswith(g + ' ') for g in greetings) and len(tokens) <= 2:
        return get_greeting_response(institution)

    # 3. Search Published Pages
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

    # 4. Search Documents
    scored_docs = []
    docs = list(Document.objects.filter(institution=institution))
    for doc in docs:
        norm_doc_title = normalize_ro(doc.title)
        d_score = 0
        for t, s in zip(tokens, stems):
            if t in norm_doc_title or s in norm_doc_title:
                d_score += 15
        if d_score > 0:
            scored_docs.append((d_score, doc))
    scored_docs.sort(key=lambda x: x[0], reverse=True)

    # Structure response when a page is found
    if scored_pages and scored_pages[0][0] >= 10:
        best_score, _, best_page, plain_body = scored_pages[0]

        # 1. Concise Summary from page
        summary = make_page_summary(best_page, plain_body, stems)

        reply_sections = [
            f"📋 **Rezumat — {best_page.title}:**\n{summary}"
        ]

        # 2. Associated and Relevant Documents
        # Attached directly to this page or matched by search
        page_docs = list(best_page.documents.filter(status='published')[:4])
        extra_docs = []
        seen_doc_ids = {d.id for d in page_docs}
        for _, d in scored_docs[:4]:
            if d.id not in seen_doc_ids:
                extra_docs.append(d)
                seen_doc_ids.add(d.id)

        all_docs = page_docs + extra_docs[:2]
        sources = [{'title': best_page.title, 'url': f"#/{best_page.slug}"}]

        if all_docs:
            doc_lines = []
            for d in all_docs[:3]:
                d_url = get_doc_url(d)
                date_str = f" *(emis la {d.issued_on})*" if d.issued_on else ""
                doc_lines.append(f"• 📄 [{d.title}]({d_url}){date_str}")
                sources.append({'title': d.title, 'url': d_url})
            reply_sections.append("📂 **Documente și formulare conexe:**\n" + "\n".join(doc_lines))

        # 3. Where to Read More / Related Suggestions
        read_more = [
            f"👉 **Pagina completă:** [{best_page.title}](#/{best_page.slug})"
        ]

        # Sibling pages in the same section or next scored page
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

    # If only documents matched
    if scored_docs:
        top_docs = [d for _, d in scored_docs[:4]]
        doc_lines = []
        sources = []
        for d in top_docs:
            d_url = get_doc_url(d)
            date_str = f" *(emis la {d.issued_on})*" if d.issued_on else ""
            doc_lines.append(f"• 📄 [{d.title}]({d_url}){date_str}")
            sources.append({'title': d.title, 'url': d_url})

        reply_sections = [
            "📂 **Documente oficiale găsite în baza de date:**\n" + "\n".join(doc_lines),
            "🔗 **Unde puteți căuta și citi mai multe:**\n"
            "👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
            "👉 [Informații publice](#/informatii-publice)"
        ]
        sources.append({'title': 'Monitorul Oficial', 'url': '#/monitorul-oficial-local'})
        sources.append({'title': 'Informații publice', 'url': '#/informatii-publice'})

        return {'reply': "\n\n".join(reply_sections), 'sources': sources}

    # Fallback
    reply = (
        f"Nu am găsit informații exacte despre întrebarea dumneavoastră în paginile sau documentele publicate.\n\n"
        f"🔗 **Unde puteți căuta mai multe informații:**\n"
        f"👉 [Informații publice](#/informatii-publice)\n"
        f"👉 [Monitorul Oficial Local](#/monitorul-oficial-local)\n"
        f"👉 [Formular de Contact direct cu primăria](#/contact) sau telefon **{institution.phone or '0252 391 049'}**"
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
                "Ești asistentul virtual oficial al Primăriei Vânători, județul Mehedinți. "
                "Răspunde întotdeauna structurat în 3 secțiuni clare în limba română:\n"
                "1. 📋 Rezumat: un rezumat concis (2-3 propoziții) al informațiilor din pagina/baza de date.\n"
                "2. 📂 Documente și formulare conexe: documentele oficiale menționate cu linkurile lor.\n"
                "3. 🔗 Unde puteți citi mai multe: link către pagina completă din site și pagini conexe.\n"
                "Păstrează toate linkurile markdown [Text](url) exact așa cum sunt."
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"{system_instruction}\n\nContext:\n{context}\n\nÎntrebare cetățean: {question}"
            )
            if response and response.text:
                return {'reply': response.text, 'sources': rag.get('sources', [])}
        except Exception:
            pass

    return search_knowledge_base(institution, question)
