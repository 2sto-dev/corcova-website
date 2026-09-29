"""Apply reviewed archive evidence and conservative title extraction, preserving edits."""
import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from civic_core.models import Institution
from documents.models import Document
from local_monitor.models import Entry, Register
from wordpress_import.metadata import fill_title_metadata


class Command(BaseCommand):
    help = 'Fill missing metadata from titles and an optional reviewed evidence manifest. Dry-run by default.'

    def add_arguments(self, parser):
        parser.add_argument('--site', required=True)
        parser.add_argument('--manifest')
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--report', default='import-reports/metadata.json')

    def handle(self, *args, **options):
        site = Institution.objects.get(slug=options['site'])
        manifest = json.loads(Path(options['manifest']).read_text(encoding='utf-8')) if options['manifest'] else {}
        if manifest and manifest.get('site') != site.slug:
            raise CommandError('Manifest institution does not match --site.')
        report = {'applied': options['apply'], 'changes': [], 'conflicts': [], 'unresolved': manifest.get('unresolved', [])}

        def edit(obj, values, evidence, expected=None):
            expected = expected or {}
            changes = {}
            for field, value in values.items():
                if field in ('issued_on', 'reference_date') and value:
                    value = date.fromisoformat(value)
                before = getattr(obj, field)
                if before == value:
                    continue
                if before and (field not in expected or str(before) != str(expected[field])):
                    report['conflicts'].append({'model': obj._meta.label, 'id': obj.pk, 'field': field,
                                                'existing': str(before), 'proposed': str(value)})
                    continue
                changes[field] = {'before': before, 'after': value}
                setattr(obj, field, value)
            if changes:
                obj.save()
                report['changes'].append({'model': obj._meta.label, 'id': obj.pk, 'fields': changes, 'evidence': evidence})

        with transaction.atomic():
            for item in manifest.get('institution', []):
                if not set(item['values']) <= {'address', 'phone', 'email', 'website'} or not item.get('evidence'):
                    raise CommandError('Invalid institution evidence.')
                edit(site, item['values'], item['evidence'])
            for item in manifest.get('documents', []):
                if not set(item['values']) <= {'number', 'issued_on', 'reference_date', 'title', 'description'} or not item.get('evidence'):
                    raise CommandError('Invalid document evidence.')
                doc = Document.objects.get(institution=site, source_key=item['source_key'])
                if doc.checksum != item['checksum']:
                    raise CommandError(f'Document checksum changed: {doc.pk}')
                edit(doc, item['values'], item['evidence'], item.get('expected'))
                for slug in item.get('registers', []):
                    register = Register.objects.get(institution=site, slug=slug)
                    entry, created = Entry.objects.get_or_create(register=register, document=doc,
                        defaults={'title': doc.title, 'status': doc.status, 'published_at': doc.published_at})
                    if created:
                        report['changes'].append({'model': 'local_monitor.Entry', 'id': entry.pk,
                            'document': doc.pk, 'register': slug, 'created': True, 'evidence': item['evidence']})
            for doc in Document.objects.filter(institution=site, source_key__isnull=False):
                changed = fill_title_metadata(doc)
                if changed:
                    report['changes'].append({'model': 'documents.Document', 'id': doc.pk,
                        'fields': {field: {'before': None if field != 'number' else '', 'after': getattr(doc, field)} for field in changed},
                        'evidence': {'kind': 'source_title', 'text': doc.title}})
            for entry in Entry.objects.filter(register__institution=site).select_related('document'):
                values = {field: str(getattr(entry.document, field)) for field in ('number', 'issued_on') if getattr(entry.document, field)}
                edit(entry, values, {'kind': 'document_metadata', 'document': entry.document_id})
            if not options['apply']:
                transaction.set_rollback(True)
        path = Path(options['report'])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
        self.stdout.write(f"{'Applied' if options['apply'] else 'Dry run'}: {len(report['changes'])} changed records; {len(report['conflicts'])} preserved conflicts. Report: {path}")
