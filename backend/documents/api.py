from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import filters, generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from civic_core.api import SiteScoped
from civic_core.models import Page

from .models import Category, Document


class DocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    available_locally = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'description', 'category', 'year', 'number', 'issued_on', 'reference_date', 'published_at', 'updated_at', 'size_bytes',
                  'original_filename', 'download_url', 'external_url', 'available_locally']

    def get_available_locally(self, obj):
        return bool(obj.file)

    def get_download_url(self, obj):
        if not obj.file:
            return obj.external_url
        path = reverse('documents:download', kwargs={'site_slug': obj.institution.slug, 'pk': obj.pk})
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'title', 'slug', 'description']


class CategoryList(SiteScoped, generics.ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(institution=self.get_institution())


class DocumentList(SiteScoped, generics.ListAPIView):
    serializer_class = DocumentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'number']
    ordering_fields = ['published_at', 'title', 'year']

    def get_queryset(self):
        qs = Document.objects.published().filter(institution=self.get_institution()).select_related('institution', 'category')
        params = self.request.query_params
        if params.get('category'):
            qs = qs.filter(category__slug=params['category'])
        if params.get('year'):
            try:
                year = int(params['year'])
                if not 1 <= year <= 9999:
                    raise ValueError
            except ValueError:
                raise ValidationError({'year': 'Anul trebuie să fie între 1 și 9999.'}) from None
            qs = qs.filter(year=year)
        if params.get('page_slug'):
            page = get_object_or_404(Page.objects.published(), institution=self.get_institution(), slug=params['page_slug'])
            qs = qs.filter(pages=page)
        return qs


class DocumentDetail(SiteScoped, generics.RetrieveAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.published().filter(institution=self.get_institution()).select_related('institution', 'category')


class DownloadView(SiteScoped, APIView):
    def get(self, request, pk, **kwargs):
        document = get_object_or_404(Document.objects.published(), institution=self.get_institution(), pk=pk)
        if not document.file:
            raise Http404('Fișierul nu este disponibil local. Consultați adresa sursă din metadate.')
        try:
            stream = document.file.open('rb')
        except FileNotFoundError:
            raise Http404('Fișierul nu este disponibil.') from None
        response = FileResponse(stream, as_attachment=True, filename=document.original_filename or document.file.name.rsplit('/', 1)[-1])
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, no-store'
        return response
