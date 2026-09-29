"""Conservative extraction from public document titles, never from legal citations."""
import re
import unicodedata
from datetime import date


def title_metadata(title):
    text = ''.join(c for c in unicodedata.normalize('NFKD', title) if not unicodedata.combining(c)).lower()
    values = {}
    # Only a document's own opening identifier, not a law mentioned in its subject.
    match = re.match(
        r'^(?:dispoziti[ae]|hotarare|anunt(?: public)?|oferta de vanzare teren|proces[ -]verbal)'
        r'\s+(?:nr\.?\s*)?(\d+[a-z]?)\s+din\s+(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b', text)
    if match:
        values['number'] = match[1]
        try:
            values['issued_on'] = date(int(match[4]), int(match[3]), int(match[2]))
        except ValueError:
            pass
    reference = re.search(r'\bla data de\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b', text)
    if reference:
        try:
            values['reference_date'] = date(int(reference[3]), int(reference[2]), int(reference[1]))
        except ValueError:
            pass
    return values


def fill_title_metadata(document):
    """Fill blanks only; suspicious future issue dates are left for source review."""
    values = title_metadata(document.title)
    if document.published_at and values.get('issued_on') and values['issued_on'] > document.published_at.date():
        values.pop('issued_on')
    changed = []
    for field, value in values.items():
        if not getattr(document, field):
            setattr(document, field, value)
            changed.append(field)
    if changed:
        document.save()
    return changed
