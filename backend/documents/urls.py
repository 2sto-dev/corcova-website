from django.urls import path
from . import api

app_name = 'documents'
urlpatterns = [path('categories/', api.CategoryList.as_view(), name='categories'),
    path('documents/', api.DocumentList.as_view(), name='list'),
    path('documents/<int:pk>/', api.DocumentDetail.as_view(), name='detail'),
    path('documents/<int:pk>/download/', api.DownloadView.as_view(), name='download')]
