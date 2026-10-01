from django.urls import path

from . import api

app_name = 'local_monitor'
urlpatterns = [path('registers/', api.RegisterList.as_view(), name='registers'), path('entries/', api.EntryList.as_view(), name='entries')]
