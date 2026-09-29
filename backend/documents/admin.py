from django.contrib import admin
from .models import Category, Document, PageDocument


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution']
    list_filter = ['institution']
    search_fields = ['title']
    prepopulated_fields = {'slug': ['title']}


class DocumentPageInline(admin.TabularInline):
    model = PageDocument
    autocomplete_fields = ['page']
    extra = 0


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution', 'category', 'year', 'status', 'size_bytes']
    list_filter = ['institution', 'status', 'category', 'year']
    search_fields = ['title', 'description', 'number', 'original_filename']
    autocomplete_fields = ['institution', 'category']
    readonly_fields = ['original_filename', 'checksum', 'size_bytes', 'source_key', 'created_at', 'updated_at']
    inlines = [DocumentPageInline]

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        field = super().formfield_for_dbfield(db_field, request, **kwargs)
        if db_field.name == 'file' and field:
            # Do not link directly to private storage; downloads go through the API.
            from django.forms import FileInput
            field.widget = FileInput()
        return field
