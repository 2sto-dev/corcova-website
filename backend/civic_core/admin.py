from django.contrib import admin
from .models import ContactMessage, Institution, Menu, MenuItem, Page, Section
from documents.models import PageDocument


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'county', 'is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ['name']}


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution', 'parent', 'position', 'is_active']
    list_filter = ['institution', 'is_active']
    search_fields = ['title']
    autocomplete_fields = ['institution', 'parent']
    prepopulated_fields = {'slug': ['title']}


class PageDocumentInline(admin.TabularInline):
    model = PageDocument
    autocomplete_fields = ['document']
    extra = 0


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution', 'section', 'status', 'published_at']
    list_filter = ['institution', 'status', 'section']
    search_fields = ['title', 'body']
    autocomplete_fields = ['institution', 'section']
    readonly_fields = ['source_id', 'created_at', 'updated_at']
    prepopulated_fields = {'slug': ['title']}
    inlines = [PageDocumentInline]


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    autocomplete_fields = ['parent', 'page']
    extra = 0


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution', 'is_primary']
    list_filter = ['institution']
    search_fields = ['title']
    prepopulated_fields = {'slug': ['title']}
    inlines = [MenuItemInline]


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['label', 'menu', 'parent', 'position', 'is_active']
    list_filter = ['menu', 'is_active']
    search_fields = ['label']
    autocomplete_fields = ['menu', 'parent', 'page']
    readonly_fields = ['source_id']


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['subject', 'name', 'email', 'institution', 'status', 'created_at']
    list_filter = ['status', 'institution', 'created_at']
    search_fields = ['name', 'email', 'subject', 'body']
    autocomplete_fields = ['institution']
    date_hierarchy = 'created_at'
    change_list_template = 'admin/civic_core/contactmessage/change_list.html'
    list_per_page = 25
    ordering = ['-created_at']
    readonly_fields = ['institution', 'name', 'email', 'subject', 'body', 'created_at', 'updated_at']
    fields = ['status', 'institution', 'name', 'email', 'subject', 'body', 'created_at']
    actions = ['mark_read', 'mark_new', 'mark_archived']

    def has_add_permission(self, request):
        return False

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['contact_counts'] = {
            'new': ContactMessage.objects.filter(status=ContactMessage.Status.NEW).count(),
            'total': ContactMessage.objects.count(),
        }
        return super().changelist_view(request, extra_context)

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        if object_id and request.method == 'GET':
            ContactMessage.objects.filter(pk=object_id, status=ContactMessage.Status.NEW).update(status=ContactMessage.Status.READ)
        return super().changeform_view(request, object_id, form_url, extra_context)

    @admin.action(description='Marchează ca citite')
    def mark_read(self, request, queryset):
        queryset.update(status=ContactMessage.Status.READ)

    @admin.action(description='Marchează ca necitite')
    def mark_new(self, request, queryset):
        queryset.update(status=ContactMessage.Status.NEW)

    @admin.action(description='Arhivează')
    def mark_archived(self, request, queryset):
        queryset.update(status=ContactMessage.Status.ARCHIVED)


def attach_contact_dashboard(site):
    if getattr(site, '_contact_dashboard', False):
        return
    site._contact_dashboard = True
    original = site.index

    def index(request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['unread_contact_count'] = ContactMessage.objects.filter(status=ContactMessage.Status.NEW).count()
        extra_context['recent_contact_messages'] = list(
            ContactMessage.objects.select_related('institution').order_by('-created_at', '-id')[:8]
        )
        return original(request, extra_context)

    site.index = index
    site.index_template = 'civic_core/admin_dashboard.html'
