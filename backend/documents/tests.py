import tempfile
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from civic_core.models import Institution, Page
from .models import Document, PageDocument


def pdf(name='document.pdf'):
    return SimpleUploadedFile(name, b'%PDF-1.4\nTest document\n%%EOF', content_type='application/pdf')


class DocumentTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.override = override_settings(MEDIA_ROOT=self.directory.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.site = Institution.objects.create(name='Test', slug='test')
        self.other = Institution.objects.create(name='Other', slug='other')

    def document(self, **kwargs):
        return Document.objects.create(institution=self.site, title='Document', file=pdf(), **kwargs)

    def test_upload_unique_storage_metadata_and_download(self):
        one = self.document(status='published', year=2026)
        two = self.document(status='published')
        self.assertNotEqual(one.file.name, two.file.name)
        self.assertEqual(one.original_filename, 'document.pdf')
        self.assertEqual(len(one.checksum), 64)
        url = f'/api/v1/sites/test/documents/{one.pk}/download/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF'))
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertEqual(self.client.get(url.replace('/test/', '/other/')).status_code, 404)

    def test_draft_future_and_inactive_site_downloads_are_private(self):
        draft = self.document()
        self.assertEqual(self.client.get(f'/api/v1/sites/test/documents/{draft.pk}/download/').status_code, 404)
        future = self.document(status='published', published_at=timezone.now()+timedelta(days=1))
        self.assertEqual(self.client.get(f'/api/v1/sites/test/documents/{future.pk}/download/').status_code, 404)
        self.assertEqual(self.client.get('/private-media/' + draft.file.name).status_code, 404)
        self.site.is_active = False
        self.site.save()
        self.assertEqual(self.client.get('/api/v1/sites/test/documents/').status_code, 404)

    def test_invalid_file_type_magic_and_size(self):
        for file in [SimpleUploadedFile('bad.html', b'<script/>'), SimpleUploadedFile('bad.pdf', b'not a pdf')]:
            with self.assertRaises(ValidationError):
                Document.objects.create(institution=self.site, title='Bad', file=file)
        with override_settings(DOCUMENT_MAX_BYTES=3), self.assertRaises(ValidationError):
            self.document()

    def test_cross_site_page_relation_is_rejected(self):
        document = self.document()
        page = Page.objects.create(institution=self.other, title='Other', slug='other')
        with self.assertRaises(ValidationError):
            PageDocument.objects.create(page=page, document=document)

    def test_filter_search_pagination_and_external_files(self):
        document = self.document(status='published', year=2026)
        self.assertEqual(self.client.get('/api/v1/sites/test/documents/?year=2026&search=Document').json()['count'], 1)
        self.assertEqual(self.client.get('/api/v1/sites/test/documents/?year=bad').status_code, 400)
        external = Document.objects.create(institution=self.site, title='Missing', external_url='https://example.com/file.pdf', status='published')
        self.assertFalse(self.client.get(f'/api/v1/sites/test/documents/{external.pk}/').json()['available_locally'])
        self.assertEqual(self.client.get(f'/api/v1/sites/test/documents/{external.pk}/download/').status_code, 404)

    def test_admin_can_upload_and_publish_without_code_changes(self):
        user = get_user_model().objects.create_superuser('tester', password='test-password')
        self.client.force_login(user)
        response = self.client.post('/administrare-primarie/documents/document/add/', {'institution': self.site.pk, 'title': 'Uploaded from admin',
            'status': 'published', 'year': 2026, 'file': pdf(), 'pagedocument_set-TOTAL_FORMS': '0',
            'pagedocument_set-INITIAL_FORMS': '0', 'pagedocument_set-MIN_NUM_FORMS': '0', 'pagedocument_set-MAX_NUM_FORMS': '1000', '_save': 'Save'})
        self.assertEqual(response.status_code, 302, response.content.decode()[:1000])
        self.assertEqual(self.client.get('/api/v1/sites/test/documents/?search=Uploaded').json()['count'], 1)
