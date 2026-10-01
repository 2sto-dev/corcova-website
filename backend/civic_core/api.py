from django.db.models import CharField, Q, Value
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import filters, generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .chatbot import ask_chatbot
from .models import ContactMessage, Institution, Menu, Page, Section
from .pagination import StandardPagination


class SiteScoped:
    pagination_class = StandardPagination

    def get_institution(self):
        if not hasattr(self, '_institution'):
            self._institution = get_object_or_404(Institution, slug=self.kwargs['site_slug'], is_active=True)
        return self._institution


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['name', 'slug', 'county', 'welcome_text', 'address', 'email', 'phone', 'website', 'presentation']


class InstitutionDetail(SiteScoped, generics.RetrieveAPIView):
    serializer_class = InstitutionSerializer

    def get_object(self):
        return self.get_institution()


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ['id', 'title', 'slug', 'description', 'parent', 'position']


class SectionList(SiteScoped, generics.ListAPIView):
    serializer_class = SectionSerializer

    def get_queryset(self):
        return Section.objects.filter(institution=self.get_institution(), is_active=True)


class PageSerializer(serializers.ModelSerializer):
    section = SectionSerializer(read_only=True)

    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'summary', 'body', 'section', 'published_at', 'updated_at']


class PageList(SiteScoped, generics.ListAPIView):
    serializer_class = PageSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'summary', 'body']

    def get_queryset(self):
        qs = Page.objects.published().filter(institution=self.get_institution()).select_related('section')
        if self.request.query_params.get('section'):
            qs = qs.filter(section__slug=self.request.query_params['section'])
        if self.request.query_params.get('parent'):
            parent = self.request.query_params['parent']
            if not parent.isdigit():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'parent': 'Identificator invalid.'})
            qs = qs.filter(section__parent_id=int(parent))
        return qs


class PageDetail(SiteScoped, generics.RetrieveAPIView):
    serializer_class = PageSerializer
    lookup_field = 'slug'
    lookup_url_kwarg = 'page_slug'

    def get_queryset(self):
        return Page.objects.published().filter(institution=self.get_institution()).select_related('section')


class NavigationView(SiteScoped, APIView):
    def get(self, request, **kwargs):
        menus = Menu.objects.filter(institution=self.get_institution())
        slug = request.query_params.get('menu')
        menu = get_object_or_404(menus, slug=slug) if slug else menus.order_by('-is_primary', 'id').first()
        if not menu:
            return Response({'menu': None, 'items': []})
        public_pages = set(Page.objects.published().filter(institution=self.get_institution()).values_list('id', flat=True))
        by_parent = {}
        for item in menu.items.filter(is_active=True).select_related('page'):
            if item.page_id and item.page_id not in public_pages:
                continue
            by_parent.setdefault(item.parent_id, []).append(item)
        def href(item):
            destination = f'/{item.page.slug}' if item.page_id else item.url
            return destination[1:] if destination.startswith('#/') else destination

        def tree(parent=None):
            return [{'id': item.id, 'label': item.label, 'href': href(item),
                     'children': tree(item.id)} for item in by_parent.get(parent, [])]
        return Response({'menu': menu.slug, 'items': tree()})


class SearchView(SiteScoped, generics.GenericAPIView):
    def get(self, request, **kwargs):
        from documents.models import Document
        site = self.get_institution()
        query = request.query_params.get('search', '').strip()[:200]
        pages = Page.objects.published().filter(institution=site)
        documents = Document.objects.published().filter(institution=site)
        if not query:
            pages, documents = pages.none(), documents.none()
        else:
            pages = pages.filter(Q(title__icontains=query) | Q(body__icontains=query))
            documents = documents.filter(Q(title__icontains=query) | Q(description__icontains=query))
        fields = ['id', 'title', 'slug', 'kind', 'external_url', 'file']
        pages = pages.order_by().annotate(kind=Value('page'), external_url=Value('', output_field=CharField()), file=Value('', output_field=CharField())).values(*fields)
        documents = documents.order_by().annotate(kind=Value('document'), slug=Value('', output_field=CharField())).values(*fields)
        results = pages.union(documents).order_by('title', 'kind', 'id')
        entries = self.paginate_queryset(results)
        response = []
        for item in entries:
            href = '/' + item['slug'] if item['kind'] == 'page' else request.build_absolute_uri(reverse('documents:download', kwargs={'site_slug': site.slug, 'pk': item['id']})) if item['file'] else item['external_url']
            response.append({'title': item['title'], 'href': href, 'kind': item['kind']})
        return self.get_paginated_response(response)


class ContactThrottle(AnonRateThrottle):
    rate = '8/hour'


class ContactMessageSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=200)
    email = serializers.EmailField()
    subject = serializers.CharField(min_length=3, max_length=200)
    message = serializers.CharField(min_length=10, max_length=5000)
    website = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=200)

    def validate(self, attrs):
        for field in ('name', 'subject', 'message', 'email'):
            attrs[field] = attrs[field].strip()
        attrs['email'] = attrs['email'].lower()
        return attrs


class ContactCreate(SiteScoped, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle]

    def post(self, request, **kwargs):
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data.get('website'):
            return Response({'ok': True}, status=201)
        ContactMessage.objects.create(
            institution=self.get_institution(),
            name=data['name'],
            email=data['email'],
            subject=data['subject'],
            body=data['message'],
        )
        return Response({'ok': True}, status=201)


class ChatbotView(SiteScoped, APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request, **kwargs):
        institution = self.get_institution()
        message = str(request.data.get('message', '')).strip()
        if not message:
            return Response({'error': 'Vă rugăm să introduceți un mesaj.'}, status=400)
        history = request.data.get('history', [])
        result = ask_chatbot(institution, message, history=history)
        result['reply'] = result.get('reply', '').replace('](#/', '](/')
        for source in result.get('sources', []):
            if source.get('url', '').startswith('#/'):
                source['url'] = source['url'][1:]
        return Response(result)
