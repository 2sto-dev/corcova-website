from django.core.exceptions import ValidationError
from django.test import TestCase
from civic_core.models import Institution
from documents.models import Document
from .models import Register, Entry


class MonitorTests(TestCase):
    def setUp(self):
        self.site = Institution.objects.create(name='Any council', slug='any-council')
        self.register = Register.objects.create(institution=self.site, title='Custom register', slug='custom')
        self.document = Document.objects.create(institution=self.site, title='Act', status='published', year=2024, external_url='https://example.com/act.pdf')

    def test_reusable_registers_dynamic_entries_and_filters(self):
        Entry.objects.create(register=self.register, document=self.document, title='Decision', number='17', status='published')
        root = '/api/v1/sites/any-council/monitor/'
        self.assertEqual(self.client.get(root+'registers/').json()['results'][0]['entry_count'], 1)
        self.assertEqual(self.client.get(root+'entries/?register=custom&year=2024&search=17').json()['count'], 1)
        self.assertEqual(self.client.get(root+'entries/?year=2025').json()['count'], 0)
        self.assertEqual(self.client.get(root+'entries/?year=no').status_code, 400)

    def test_draft_document_and_inactive_register_do_not_leak(self):
        Entry.objects.create(register=self.register, document=self.document, title='Act', status='published')
        self.document.status = 'draft'
        self.document.save()
        root = '/api/v1/sites/any-council/monitor/'
        self.assertEqual(self.client.get(root+'entries/').json()['count'], 0)
        self.assertEqual(self.client.get(root+'registers/').json()['results'][0]['entry_count'], 0)
        self.register.is_active = False
        self.register.save()
        self.assertEqual(self.client.get(root+'registers/').json()['count'], 0)

    def test_cross_site_entry_rejected(self):
        other = Institution.objects.create(name='Other', slug='other')
        register = Register.objects.create(institution=other, title='Other', slug='other')
        with self.assertRaises(ValidationError):
            Entry.objects.create(register=register, document=self.document, title='Invalid')
