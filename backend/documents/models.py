import hashlib
import uuid
from pathlib import Path
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from civic_core.models import Institution, Page, Publishable, Section, ValidatedModel


def document_path(instance, filename):
    return f'documents/{instance.institution_id}/{uuid.uuid4().hex}{Path(filename).suffix.lower()}'


def validate_file(file):
    if getattr(file, '_committed', False):
        return  # Metadata changes do not re-read immutable stored files.
    suffix = Path(file.name).suffix.lower()
    signatures = {'.pdf': [b'%PDF-'], '.doc': [b'\xd0\xcf\x11\xe0'], '.xls': [b'\xd0\xcf\x11\xe0'],
        '.docx': [b'PK\x03\x04'], '.xlsx': [b'PK\x03\x04'], '.odt': [b'PK\x03\x04'], '.ods': [b'PK\x03\x04'],
        '.png': [b'\x89PNG\r\n\x1a\n'], '.jpg': [b'\xff\xd8\xff'], '.jpeg': [b'\xff\xd8\xff']}
    if suffix not in signatures:
        raise ValidationError('Tip de fișier neacceptat. Folosiți PDF, documente Office/OpenDocument sau PNG/JPEG.')
    limit = getattr(settings, 'DOCUMENT_MAX_BYTES', 50 * 1024 * 1024)
    if file.size > limit:
        raise ValidationError(f'Fișierul depășește limita de {limit // (1024*1024)} MB.')
    file.seek(0)
    head = file.read(16)
    file.seek(0)
    if not any(head.startswith(signature) for signature in signatures[suffix]):
        raise ValidationError('Conținutul fișierului nu corespunde extensiei.')


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
