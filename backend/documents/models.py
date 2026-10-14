import hashlib
import re
import uuid
import zipfile
from pathlib import Path

import pymupdf
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from civic_core.models import Institution, Page, Publishable, ValidatedModel

ALLOWED_SIGNATURES = {
    ".pdf": (b"%PDF-",),
    ".doc": (b"\xd0\xcf\x11\xe0",),
    ".xls": (b"\xd0\xcf\x11\xe0",),
    ".docx": (b"PK\x03\x04",),
    ".xlsx": (b"PK\x03\x04",),
    ".odt": (b"PK\x03\x04",),
    ".ods": (b"PK\x03\x04",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
}
ACTIVE_PDF_TOKEN = re.compile(rb"/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA)\b")
DANGEROUS_SUFFIXES = {
    ".app",
    ".asp",
    ".aspx",
    ".bat",
    ".cgi",
    ".cmd",
    ".com",
    ".cpl",
    ".dll",
    ".exe",
    ".hta",
    ".htm",
    ".html",
    ".jar",
    ".js",
    ".jsp",
    ".lnk",
    ".msi",
    ".php",
    ".phtml",
    ".ps1",
    ".py",
    ".scr",
    ".sh",
    ".svg",
    ".vbs",
    ".wsf",
}
ZIP_MARKERS = {
    ".docx": {"[Content_Types].xml", "word/document.xml"},
    ".xlsx": {"[Content_Types].xml", "xl/workbook.xml"},
    ".odt": {"mimetype", "content.xml"},
    ".ods": {"mimetype", "content.xml"},
}
ODF_MIME_TYPES = {
    ".odt": b"application/vnd.oasis.opendocument.text",
    ".ods": b"application/vnd.oasis.opendocument.spreadsheet",
}


def _safe_upload_name(name):
    normalized = str(name or "").replace("\\", "/")
    basename = normalized.rsplit("/", 1)[-1]
    if not basename or basename.startswith(".") or "\x00" in normalized or any(ord(char) < 32 for char in normalized):
        raise ValidationError("Numele fișierului este invalid.")
    if len(basename) > 255:
        raise ValidationError("Numele fișierului este prea lung.")
    suffixes = [suffix.lower() for suffix in Path(basename).suffixes]
    if any(suffix in DANGEROUS_SUFFIXES for suffix in suffixes[:-1]):
        raise ValidationError("Numele fișierului conține o extensie executabilă sau activă.")
    return basename


def _validate_zip_document(file, suffix):
    file.seek(0)
    try:
        with zipfile.ZipFile(file) as archive:
            members = archive.infolist()
            if len(members) > 2000:
                raise ValidationError("Arhiva documentului conține prea multe fișiere.")
            names = set()
            total_uncompressed = 0
            for member in members:
                name = member.filename.replace("\\", "/")
                parts = Path(name).parts
                if not name or name.startswith(("/", ".")) or ".." in parts or "\x00" in name:
                    raise ValidationError("Arhiva documentului conține o cale nesigură.")
                if member.flag_bits & 0x1:
                    raise ValidationError("Arhivele criptate nu sunt acceptate.")
                lower_name = name.lower()
                if any(token in lower_name for token in ("vbaproject.bin", "/activex/", "/embeddings/", "oleobject")):
                    raise ValidationError("Documentele cu macrocomenzi sau conținut activ nu sunt acceptate.")
                if Path(lower_name).suffix in DANGEROUS_SUFFIXES:
                    raise ValidationError("Arhiva documentului conține un tip de fișier periculos.")
                total_uncompressed += member.file_size
                if member.file_size > 100 * 1024 * 1024 or total_uncompressed > 200 * 1024 * 1024:
                    raise ValidationError("Arhiva documentului se extinde peste limita permisă.")
                if member.compress_size and member.file_size / member.compress_size > 100:
                    raise ValidationError("Arhiva documentului are un raport de compresie nesigur.")
                names.add(name)
            if not ZIP_MARKERS[suffix].issubset(names):
                raise ValidationError("Structura documentului nu corespunde extensiei.")
            if suffix in ODF_MIME_TYPES:
                try:
                    mime_type = archive.read("mimetype", pwd=None)
                except (KeyError, RuntimeError):
                    raise ValidationError("Documentul OpenDocument nu are un tip valid.") from None
                if mime_type.strip() != ODF_MIME_TYPES[suffix]:
                    raise ValidationError("Tipul intern al documentului nu corespunde extensiei.")
    except (zipfile.BadZipFile, OSError, ValueError):
        raise ValidationError("Arhiva documentului este invalidă sau coruptă.") from None
    finally:
        file.seek(0)


def _validate_pdf(file):
    file.seek(0)
    overlap = b""
    while True:
        chunk = file.read(1024 * 1024)
        if not chunk:
            break
        if ACTIVE_PDF_TOKEN.search(overlap + chunk):
            raise ValidationError("PDF-urile cu scripturi, acțiuni sau fișiere încorporate nu sunt acceptate.")
        overlap = chunk[-64:]
    file.seek(0)
    source = None
    try:
        try:
            temporary_path = file.temporary_file_path()
        except (AttributeError, OSError):
            payload = file.read()
            file.seek(0)
            source = pymupdf.open(stream=payload, filetype="pdf")
        else:
            source = pymupdf.open(temporary_path, filetype="pdf")
        if source.needs_pass or source.page_count > 5000:
            raise ValidationError("PDF-ul este criptat sau depășește numărul maxim de pagini.")
        if source.embfile_count():
            raise ValidationError("PDF-urile cu fișiere încorporate nu sunt acceptate.")
    except ValidationError:
        raise
    except (RuntimeError, ValueError, TypeError):
        raise ValidationError("PDF-ul este invalid sau corupt.") from None
    finally:
        if source is not None:
            source.close()
        file.seek(0)


def _validate_image(file, suffix):
    file.seek(0)
    image = None
    try:
        payload = file.read()
        image = pymupdf.open(stream=payload, filetype="jpeg" if suffix in {".jpg", ".jpeg"} else "png")
        if image.page_count != 1:
            raise ValidationError("Imaginea încărcată este invalidă.")
        page = image[0]
        if page.rect.width * page.rect.height > 40_000_000:
            raise ValidationError("Imaginea depășește rezoluția maximă permisă.")
    except ValidationError:
        raise
    except (RuntimeError, ValueError, TypeError):
        raise ValidationError("Imaginea este invalidă sau coruptă.") from None
    finally:
        if image is not None:
            image.close()
        file.seek(0)


def document_path(instance, filename):
    basename = _safe_upload_name(filename)
    return f"documents/{instance.institution_id}/{uuid.uuid4().hex}{Path(basename).suffix.lower()}"


def validate_file(file):
    if getattr(file, "_committed", False):
        return  # Metadata changes do not re-read immutable stored files.
    basename = _safe_upload_name(file.name)
    suffix = Path(basename).suffix.lower()
    if suffix not in ALLOWED_SIGNATURES:
        raise ValidationError("Tip de fișier neacceptat. Folosiți PDF, documente Office/OpenDocument sau PNG/JPEG.")
    limit = getattr(settings, "DOCUMENT_MAX_BYTES", 50 * 1024 * 1024)
    if file.size > limit:
        raise ValidationError(f"Fișierul depășește limita de {limit // (1024 * 1024)} MB.")
    file.seek(0)
    head = file.read(16)
    file.seek(0)
    if not any(head.startswith(signature) for signature in ALLOWED_SIGNATURES[suffix]):
        raise ValidationError("Conținutul fișierului nu corespunde extensiei.")
    if suffix in ZIP_MARKERS:
        _validate_zip_document(file, suffix)
    elif suffix == ".pdf":
        _validate_pdf(file)
    elif suffix in {".png", ".jpg", ".jpeg"}:
        _validate_image(file, suffix)


class Category(ValidatedModel):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='document_categories')
    title = models.CharField(verbose_name='Titlu', max_length=250)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', max_length=250)
    description = models.TextField(verbose_name='Descriere', blank=True)

    class Meta:
        verbose_name = 'categorie'
        verbose_name_plural = 'categorii'
        ordering = ['title']
        constraints = [models.UniqueConstraint(fields=['institution', 'slug'], name='category_site_slug')]

    def __str__(self):
        return self.title


class Document(Publishable):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='documents')
    category = models.ForeignKey(Category, verbose_name='Categorie', null=True, blank=True, on_delete=models.SET_NULL, related_name='documents')
    title = models.CharField(verbose_name='Titlu', max_length=500)
    description = models.TextField(verbose_name='Descriere', blank=True)
    file = models.FileField(verbose_name='Fișier', upload_to=document_path, validators=[validate_file], blank=True, max_length=500)
    number = models.CharField(verbose_name='Număr', max_length=80, blank=True)
    issued_on = models.DateField(verbose_name='Data emiterii', null=True, blank=True, db_index=True)
    reference_date = models.DateField(verbose_name='Data de referință', null=True, blank=True,
        help_text='Data situației raportate; nu este data emiterii sau publicării.')
    original_filename = models.CharField(verbose_name='Numele original al fișierului', max_length=500, blank=True, editable=False)
    external_url = models.URLField(verbose_name='Adresă externă', max_length=2000, blank=True, help_text='Adresă sursă pentru un document care lipsește local.')
    source_key = models.CharField(verbose_name='Identificator de import', max_length=64, null=True, blank=True, editable=False)
    source_url = models.URLField(verbose_name='Adresă sursă', max_length=2000, blank=True)
    year = models.PositiveSmallIntegerField(verbose_name='An', null=True, blank=True, db_index=True)
    size_bytes = models.PositiveBigIntegerField(verbose_name='Dimensiune în octeți', default=0, editable=False)
    checksum = models.CharField(verbose_name='Amprentă SHA-256', max_length=64, blank=True, editable=False)
    extracted_text = models.TextField(verbose_name='Text extras / OCR', blank=True, help_text='Text extras automat sau prin OCR din fișier.')
    pages = models.ManyToManyField(Page, verbose_name='Pagini asociate', through='PageDocument', related_name='documents')

    class Meta:
        verbose_name = 'document'
        verbose_name_plural = 'documente'
        ordering = ['-published_at', '-id']
        constraints = [models.UniqueConstraint(fields=['institution', 'source_key'], name='document_site_source')]
        indexes = [models.Index(fields=['institution', 'status', 'year']), models.Index(fields=['institution', 'category', 'published_at'])]

    def clean(self):
        super().clean()
        if self.category_id and self.category.institution_id != self.institution_id:
            raise ValidationError({'category': 'Categoria aparține altui site.'})
        if not self.file and not self.external_url:
            raise ValidationError('Încărcați un fișier sau specificați adresa documentului extern.')

    def save(self, *args, **kwargs):
        is_new_file = False
        if self.file and not self.file._committed:
            validate_file(self.file)
            self.original_filename = Path(self.file.name).name
            self.size_bytes = self.file.size
            digest = hashlib.sha256()
            for chunk in self.file.chunks():
                digest.update(chunk)
            self.checksum = digest.hexdigest()
            self.file.seek(0)
            is_new_file = True
        result = super().save(*args, **kwargs)
        if is_new_file and not self.extracted_text and self.file:
            try:
                from .ocr_engine import extract_text_from_pdf
                if Path(self.file.path).suffix.lower() == '.pdf':
                    text = extract_text_from_pdf(self.file.path, max_ocr_pages=6)
                    if text:
                        Document.objects.filter(pk=self.pk).update(extracted_text=text)
            except Exception:
                pass
        return result

    def __str__(self):
        return self.title


class PageDocument(ValidatedModel):
    page = models.ForeignKey(Page, verbose_name='Pagină', on_delete=models.CASCADE)
    document = models.ForeignKey(Document, verbose_name='Document', on_delete=models.CASCADE)
    position = models.PositiveIntegerField(verbose_name='Ordine de afișare', default=0)

    class Meta:
        verbose_name = 'document asociat paginii'
        verbose_name_plural = 'documente asociate paginilor'
        ordering = ['position', 'id']
        constraints = [models.UniqueConstraint(fields=['page', 'document'], name='page_document_unique')]

    def clean(self):
        super().clean()
        if self.page_id and self.document_id and self.page.institution_id != self.document.institution_id:
            raise ValidationError('Pagina și documentul trebuie să aparțină aceluiași site.')
