from django.apps import AppConfig


class CivicCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'civic_core'
    verbose_name = 'Site și conținut'

    def ready(self):
        from django.contrib import admin

        from .admin import attach_contact_dashboard
        attach_contact_dashboard(admin.site)
