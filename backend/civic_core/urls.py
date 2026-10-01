from django.urls import path

from . import api

app_name = 'civic_core'
urlpatterns = [
    path('', api.InstitutionDetail.as_view(), name='site'),
    path('navigation/', api.NavigationView.as_view(), name='navigation'),
    path('search/', api.SearchView.as_view(), name='search'),
    path('sections/', api.SectionList.as_view(), name='sections'),
    path('pages/', api.PageList.as_view(), name='pages'),
    path('pages/<slug:page_slug>/', api.PageDetail.as_view(), name='page'),
    path('contact/', api.ContactCreate.as_view(), name='contact'),
    path('chatbot/', api.ChatbotView.as_view(), name='chatbot'),
]
