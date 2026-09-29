import bleach
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


def sanitize_html(value):
    return bleach.clean(value, tags=['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr'],
        attributes={'a': ['href', 'title'], 'td': ['colspan', 'rowspan'], 'th': ['colspan', 'rowspan']}, protocols=['http', 'https', 'mailto', 'tel'], strip=True)


class ValidatedModel(models.Model):
    created_at = models.DateTimeField(verbose_name='Creat la', auto_now_add=True)
    updated_at = models.DateTimeField(verbose_name='Actualizat la', auto_now=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class PublicQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status='published').filter(Q(published_at__isnull=True) | Q(published_at__lte=timezone.now()))


class Publishable(ValidatedModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Ciornă'
        PUBLISHED = 'published', 'Publicat'
        ARCHIVED = 'archived', 'Arhivat'

    status = models.CharField(verbose_name='Stare', max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(verbose_name='Data publicării', null=True, blank=True, db_index=True)
    objects = PublicQuerySet.as_manager()

    class Meta:
        abstract = True


class Institution(ValidatedModel):
    name = models.CharField(verbose_name='Denumire', max_length=200)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', unique=True)
    county = models.CharField(verbose_name='Județ', max_length=100, blank=True)
    welcome_text = models.CharField(verbose_name='Mesaj de întâmpinare', max_length=200, blank=True)
    address = models.TextField(verbose_name='Adresă', blank=True)
    email = models.EmailField(verbose_name='Adresă de e-mail', blank=True)
    phone = models.CharField(verbose_name='Telefon', max_length=60, blank=True)
    website = models.URLField(verbose_name='Site web', blank=True)
    presentation = models.JSONField(verbose_name='Conținutul paginii principale', default=dict, blank=True, help_text='Texte și legături pentru componentele paginii principale (JSON).')
    is_active = models.BooleanField(verbose_name='Activ', default=True)

    class Meta:
        verbose_name = 'instituție'
        verbose_name_plural = 'instituții'

    def clean(self):
        super().clean()
        if not isinstance(self.presentation, dict):
            raise ValidationError({'presentation': 'Configurația trebuie să fie un obiect JSON.'})

    def __str__(self):
        return self.name


def validate_parent(instance):
    current = instance.parent
    seen = {instance.pk} if instance.pk else set()
    while current:
        if current.pk in seen:
            raise ValidationError({'parent': 'Ierarhia nu poate conține cicluri.'})
        if current.institution_id != instance.institution_id:
            raise ValidationError({'parent': 'Părintele trebuie să aparțină aceluiași site.'})
        seen.add(current.pk)
        current = current.parent


class Section(ValidatedModel):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(verbose_name='Titlu', max_length=250)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', max_length=250)
    parent = models.ForeignKey('self', verbose_name='Părinte', null=True, blank=True, on_delete=models.PROTECT, related_name='children')
    description = models.TextField(verbose_name='Descriere', blank=True)
    position = models.PositiveIntegerField(verbose_name='Ordine de afișare', default=0)
    is_active = models.BooleanField(verbose_name='Activ', default=True)

    class Meta:
        verbose_name = 'secțiune'
        verbose_name_plural = 'secțiuni'
        ordering = ['position', 'id']
        constraints = [models.UniqueConstraint(fields=['institution', 'slug'], name='section_site_slug')]

    def clean(self):
        super().clean()
        validate_parent(self)

    def __str__(self):
        return self.title


class Page(Publishable):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='pages')
    section = models.ForeignKey(Section, verbose_name='Secțiune', null=True, blank=True, on_delete=models.SET_NULL, related_name='pages')
    title = models.CharField(verbose_name='Titlu', max_length=300)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', max_length=250)
    body = models.TextField(verbose_name='Conținut', blank=True)
    summary = models.TextField(verbose_name='Rezumat', blank=True)
    source_id = models.PositiveBigIntegerField(verbose_name='Identificator în sursa originală', null=True, blank=True)

    class Meta:
        verbose_name = 'pagină'
        verbose_name_plural = 'pagini'
        ordering = ['title', 'id']
        constraints = [models.UniqueConstraint(fields=['institution', 'slug'], name='page_site_slug'), models.UniqueConstraint(fields=['institution', 'source_id'], name='page_site_source')]
        indexes = [models.Index(fields=['institution', 'status', 'published_at'])]

    def clean(self):
        super().clean()
        if self.section_id and self.section.institution_id != self.institution_id:
            raise ValidationError({'section': 'Secțiunea aparține altui site.'})
        self.body = sanitize_html(self.body)

    def __str__(self):
        return self.title


class Menu(ValidatedModel):
    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='menus')
    title = models.CharField(verbose_name='Titlu', max_length=200)
    slug = models.SlugField(verbose_name='Identificator pentru adresă', max_length=200)
    is_primary = models.BooleanField(verbose_name='Meniu principal', default=False)

    class Meta:
        verbose_name = 'meniu'
        verbose_name_plural = 'meniuri'
        constraints = [models.UniqueConstraint(fields=['institution', 'slug'], name='menu_site_slug')]

    def __str__(self):
        return f'{self.institution} / {self.title}'


class MenuItem(ValidatedModel):
    menu = models.ForeignKey(Menu, verbose_name='Meniu', on_delete=models.CASCADE, related_name='items')
    parent = models.ForeignKey('self', verbose_name='Părinte', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    label = models.CharField(verbose_name='Denumire afișată', max_length=300)
    page = models.ForeignKey(Page, verbose_name='Pagină', null=True, blank=True, on_delete=models.SET_NULL)
    url = models.CharField(verbose_name='Adresă de destinație', max_length=1000, blank=True, help_text='Adresă relativă (#/...) sau URL https://...')
    position = models.PositiveIntegerField(verbose_name='Ordine de afișare', default=0)
    is_active = models.BooleanField(verbose_name='Activ', default=True)
    source_id = models.PositiveBigIntegerField(verbose_name='Identificator în sursa originală', null=True, blank=True)

    class Meta:
        verbose_name = 'element de meniu'
        verbose_name_plural = 'elemente de meniu'
        ordering = ['position', 'id']
        constraints = [models.UniqueConstraint(fields=['menu', 'source_id'], name='menu_item_source')]

    def clean(self):
        super().clean()
        if self.url and not self.url.startswith(('#/', '/', 'https://', 'http://', 'mailto:', 'tel:')):
            raise ValidationError({'url': 'Adresă neacceptată.'})
        if self.url.startswith('//'):
            raise ValidationError({'url': 'Folosiți o adresă completă https://.'})
        if self.page_id and self.page.institution_id != self.menu.institution_id:
            raise ValidationError({'page': 'Pagina aparține altui site.'})
        parent, seen = self.parent, {self.pk} if self.pk else set()
        while parent:
            if parent.pk in seen or parent.menu_id != self.menu_id:
                raise ValidationError({'parent': 'Părinte invalid sau ierarhie circulară.'})
            seen.add(parent.pk)
            parent = parent.parent

    def __str__(self):
        return self.label


class ContactMessage(ValidatedModel):
    class Status(models.TextChoices):
        NEW = 'new', 'Necitit'
        READ = 'read', 'Citit'
        ARCHIVED = 'archived', 'Arhivat'

    institution = models.ForeignKey(Institution, verbose_name='Instituție', on_delete=models.CASCADE, related_name='contact_messages')
    name = models.CharField(verbose_name='Nume', max_length=200)
    email = models.EmailField(verbose_name='Adresă de e-mail')
    subject = models.CharField(verbose_name='Subiect', max_length=200)
    body = models.TextField(verbose_name='Mesaj')
    status = models.CharField(verbose_name='Stare', max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)

    class Meta:
        verbose_name = 'mesaj de contact'
        verbose_name_plural = 'mesaje de contact'
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['institution', 'status', 'created_at'])]

    def clean(self):
        super().clean()
        self.name = self.name.strip()
        self.email = self.email.strip()
        self.subject = self.subject.strip()
        self.body = self.body.strip()
        if len(self.name) < 2:
            raise ValidationError({'name': 'Introduceți numele.'})
        if len(self.subject) < 3:
            raise ValidationError({'subject': 'Introduceți un subiect.'})
        if len(self.body) < 10:
            raise ValidationError({'body': 'Mesajul este prea scurt.'})
        if len(self.body) > 5000:
            raise ValidationError({'body': 'Mesajul depășește 5000 de caractere.'})

    def __str__(self):
        return f'{self.subject} — {self.name}'
