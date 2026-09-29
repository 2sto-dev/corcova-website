import io
import json
import tempfile
from pathlib import Path
from django.core.management import call_command
from django.test import TestCase, override_settings
from civic_core.models import Page
from documents.models import Document
from .sql_reader import read_tables


class ImportTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.sql = self.root / 'source.sql'
        self.uploads = self.root / 'uploads'
        (self.uploads / '2024').mkdir(parents=True)
        (self.uploads / '2024' / 'one.pdf').write_bytes(b'%PDF-1.4\n%%EOF')
        self.sql.write_text('''-- ignored comment
INSERT INTO `wp_posts` (`ID`,`post_type`,`post_status`,`post_password`,`post_name`,`post_title`,`post_content`,`post_excerpt`,`post_date`,`guid`,`menu_order`) VALUES
(1,'page','publish','','one','Titlu; test','<p>Text</p><a href="https://old.test/wp-content/uploads/2024/one.pdf">One</a><a href="https://old.test/wp-content/uploads/2024/missing.pdf">Missing</a>','','2024-01-01 00:00:00','https://old.test/one',0),
(2,'page','publish','secret','private','Private','','','2024-01-01 00:00:00','https://old.test/private',0);
INSERT INTO `wp_users` VALUES (1,'do-not-import');
''', encoding='utf-8')

    def test_parser_handles_multiline_semicolons_and_ignores_users(self):
        data = read_tables(self.sql)
        self.assertEqual(data['posts'][0]['post_title'], 'Titlu; test')
        self.assertNotIn('users', data)

    def test_repeatable_import_keeps_edits_and_reports_missing_files(self):
        with override_settings(MEDIA_ROOT=self.root/'media'):
            arguments = [str(self.sql), '--uploads', str(self.uploads), '--site', 'sample', '--name', 'Sample', '--report', str(self.root/'report.json')]
            call_command('import_wordpress', *arguments, stdout=io.StringIO())
            page = Page.objects.get()
            page.title = 'Administrator edit'
            page.save()
            first_file = Document.objects.exclude(file='').get().file.name
            call_command('import_wordpress', *arguments, stdout=io.StringIO())
            self.assertEqual(Page.objects.get().title, 'Administrator edit')
            self.assertEqual(Document.objects.count(), 2)
            self.assertEqual(Document.objects.exclude(file='').get().file.name, first_file)
            self.assertEqual(json.loads((self.root/'report.json').read_text())['missing_files'], ['2024/missing.pdf'])
