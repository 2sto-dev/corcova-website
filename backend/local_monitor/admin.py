from django.contrib import admin

from .models import Entry, Register


@admin.register(Register)
class RegisterAdmin(admin.ModelAdmin):
    list_display = ['title', 'institution', 'position', 'is_active']
    list_filter = ['institution', 'is_active']
    search_fields = ['title']
    prepopulated_fields = {'slug': ['title']}
    autocomplete_fields = ['institution', 'source_page']


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = ['title', 'register', 'number', 'issued_on', 'status']
    list_filter = ['register__institution', 'register', 'status']
    search_fields = ['title', 'number']
    autocomplete_fields = ['register', 'document']
