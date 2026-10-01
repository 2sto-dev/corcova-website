import os

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.generic import RedirectView

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:5173/')

admin.site.site_header = 'Administrarea site-ului'
admin.site.site_title = 'Administrare'
admin.site.index_title = 'Panou de administrare'
admin.site.site_url = FRONTEND_URL

urlpatterns = [
    path('', RedirectView.as_view(url=FRONTEND_URL, permanent=False)),
    path('gestionare-primarie/', admin.site.urls),
    re_path(r'^admin/(?P<path>.*)$', RedirectView.as_view(url='/gestionare-primarie/%(path)s', permanent=False)),
    re_path(r'^administrare-primarie/(?P<path>.*)$', RedirectView.as_view(url='/gestionare-primarie/%(path)s', permanent=False)),
    path('api/health/', lambda request: JsonResponse({'status': 'ok'})),
    path('api/v1/sites/<slug:site_slug>/', include('civic_core.urls')),
    path('api/v1/sites/<slug:site_slug>/', include('documents.urls')),
    path('api/v1/sites/<slug:site_slug>/monitor/', include('local_monitor.urls')),
]
