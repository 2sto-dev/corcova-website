from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import filters, generics, serializers
from rest_framework.exceptions import ValidationError

from civic_core.api import SiteScoped
from documents.api import DocumentSerializer
from documents.models import Document

from .models import Entry, Register


class RegisterSerializer(serializers.ModelSerializer):
    entry_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Register
        fields = ['id', 'title', 'slug', 'description', 'position', 'entry_count']


class RegisterList(SiteScoped, generics.ListAPIView):
    serializer_class = RegisterSerializer

    def get_queryset(self):
        visible = Q(entries__status='published') & (Q(entries__published_at__isnull=True) | Q(entries__published_at__lte=timezone.now())) & Q(entries__document__in=Document.objects.published())
        return Register.objects.filter(institution=self.get_institution(), is_active=True).annotate(entry_count=Count('entries', filter=visible)).order_by('position', 'id')


class EntrySerializer(serializers.ModelSerializer):
    document = DocumentSerializer(read_only=True)
    register = serializers.SlugRelatedField(slug_field='slug', read_only=True)

    class Meta:
        model = Entry
        fields = ['id', 'title', 'register', 'number', 'issued_on', 'published_at', 'document']


class EntryList(SiteScoped, generics.ListAPIView):
    serializer_class = EntrySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'number', 'document__title']

    def get_queryset(self):
        qs = Entry.objects.published().filter(register__institution=self.get_institution(), register__is_active=True,
            document__in=Document.objects.published()).select_related('register', 'document__institution', 'document__category')
        if self.request.query_params.get('register'):
            qs = qs.filter(register__slug=self.request.query_params['register'])
        if self.request.query_params.get('year'):
            try:
                year = int(self.request.query_params['year'])
                if not 1 <= year <= 9999:
                    raise ValueError
            except ValueError:
                raise ValidationError({'year': 'An invalid.'}) from None
            qs = qs.filter(Q(issued_on__year=year) | Q(issued_on__isnull=True, document__year=year))
        return qs
