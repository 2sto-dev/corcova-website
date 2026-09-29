import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from civic_core.models import Institution


class Command(BaseCommand):
    help = 'Initialize site presentation from JSON, preserving later admin edits.'

    def add_arguments(self, parser):
        parser.add_argument('json_file')
        parser.add_argument('--site', required=True)
        parser.add_argument('--replace', action='store_true')

    def handle(self, *args, **options):
        try:
            site = Institution.objects.get(slug=options['site'])
        except Institution.DoesNotExist:
            raise CommandError('Site not found.')
        if site.presentation and not options['replace']:
            self.stdout.write('Existing presentation preserved.')
            return
        site.presentation = json.loads(Path(options['json_file']).read_text(encoding='utf-8-sig'))
        site.save()
        self.stdout.write('Presentation saved.')
