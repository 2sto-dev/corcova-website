from django.core.exceptions import ValidationError
from django.db import models
from civic_core.models import Institution, Page, Publishable, ValidatedModel
from documents.models import Document


class Register(ValidatedModel):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='registers')
    title = models.CharField(verbose_name='Titlu', max_length=300)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', max_length=250)
    description = models.TextField(verbose_name='Descriere', blank=True)
    position = models.PositiveIntegerField(verbose_name='Ordine de afișare', default=0)
    is_active = models.BooleanField(verbose_name='Activ', default=True)
    source_page = models.ForeignKey(Page, verbose_name='Pagină sursă', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'registru'
        verbose_name_plural = 'registre'
        ordering = ['position', 'id']
        constraints = [models.UniqueConstraint(fields=['institution', 'slug'], name='register_site_slug')]

    def clean(self):
        super().clean()
        if self.source_page_id and self.source_page.institution_id != self.institution_id:
            raise ValidationError({'source_page': 'Pagina aparține altui site.'})

    def __str__(self):
        return self.title


class Entry(Publishable):
    register = models.ForeignKey(Register, verbose_name='Registru', on_delete=models.PROTECT, related_name='entries')
    document = models.ForeignKey(Document, verbose_name='Document', on_delete=models.PROTECT, related_name='monitor_entries')
    title = models.CharField(verbose_name='Titlu', max_length=500)
    number = models.CharField(verbose_name='Număr', max_length=80, blank=True)
    issued_on = models.DateField(verbose_name='Data emiterii', null=True, blank=True, db_index=True)

    class Meta:
        verbose_name = 'act'
        verbose_name_plural = 'acte'
        ordering = ['-issued_on', '-id']
        constraints = [models.UniqueConstraint(fields=['register', 'document'], name='register_document_unique')]
        indexes = [models.Index(fields=['register', 'status', 'issued_on'])]

    def clean(self):
        super().clean()
        if self.register_id and self.document_id and self.register.institution_id != self.document.institution_id:
            raise ValidationError('Registrul și documentul trebuie să aparțină aceluiași site.')

    def __str__(self):
        return self.title
