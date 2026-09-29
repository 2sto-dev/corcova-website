import hashlib
import html
import json
import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from civic_core.models import Institution, Menu, MenuItem, Page, Section
from documents.models import Category, Document, PageDocument
from local_monitor.models import Register, Entry
from wordpress_import.sql_reader import read_tables
from wordpress_import.metadata import fill_title_metadata


class Links(HTMLParser):
    def __init__(self, value):
        super().__init__(convert_charrefs=True)
        self.links, self.href, self.text = [], None, []
        self.feed(value)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.href = dict(attrs).get('href')
            self.text = []

    def handle_data(self, data):
        if self.href:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == 'a' and self.href:
            self.links.append((self.href, ''.join(self.text).strip()))
            self.href = None


def post_date(value):
    try:
        return timezone.make_aware(datetime.strptime(value, '%Y-%m-%d %H:%M:%S'))
    except (ValueError, TypeError):
        return None


def relative_upload(url):
    path = unquote(urlparse(url).path)
    return path.split('/wp-content/uploads/', 1)[1] if '/wp-content/uploads/' in path else None


class Command(BaseCommand):
    help = 'Import public WordPress content without executing the SQL. Repeatable; existing edits are preserved by default.'

    def add_arguments(self, parser):
        parser.add_argument('sql_file')
        parser.add_argument('--uploads', required=True, help='Original wp-content/uploads directory')
        parser.add_argument('--site', required=True)
        parser.add_argument('--name', required=True)
        parser.add_argument('--county', default='')
        parser.add_argument('--prefix', default='wp_')
        parser.add_argument('--monitor-menu-id', type=int, help='WP menu item whose children define the registers')
        parser.add_argument('--navigation', help='Optional JSON configuration to initialize a new primary menu')
        parser.add_argument('--update-existing', action='store_true')
        parser.add_argument('--report', default='import-reports/wordpress.json')

    def handle(self, *args, **options):
        source, uploads = Path(options['sql_file']), Path(options['uploads']).resolve()
        if not source.is_file() or not uploads.is_dir():
            raise CommandError('SQL file or uploads directory does not exist.')
        tables = read_tables(source, options['prefix'])
        self.report = {'missing_files': [], 'rejected_files': [], 'skipped_private_pages': 0}
        self.saved_files = []
        self.update = options['update_existing']
        try:
            with transaction.atomic():
                self.import_data(tables, uploads, options)
        except Exception:
            # Files do not participate in DB transactions; clean up this failed import.
            for storage, name in self.saved_files:
                storage.delete(name)
            raise
        report = Path(options['report'])
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(json.dumps(self.report, ensure_ascii=False, indent=2), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(json.dumps({k:v for k,v in self.report.items() if not isinstance(v, list)})))
        self.stdout.write(f'Report: {report}')

    def upsert(self, model, lookup, values):
        obj, created = model.objects.get_or_create(**lookup, defaults=values)
        if not created and self.update:
            for key, value in values.items():
                setattr(obj, key, value)
            obj.save()
        return obj, created

    def import_data(self, tables, uploads, options):
        site, _ = Institution.objects.get_or_create(slug=options['site'], defaults={'name': options['name'], 'county': options['county'], 'welcome_text': 'Bine ați venit!'})
        posts = {p['ID']: p for p in tables['posts']}
        meta = {}
        for item in tables['postmeta']:
            meta.setdefault(item['post_id'], {})[item['meta_key']] = item['meta_value']
        public = [p for p in posts.values() if p['post_type'] in ('page', 'post') and p['post_status'] == 'publish' and not p['post_password']]
        self.report['skipped_private_pages'] = sum(1 for p in posts.values() if p['post_type'] in ('page', 'post') and p not in public)
        pages, sections, editable = {}, {}, set()
        for post in public:
            slug = post['post_name'] or slugify(post['post_title']) or f'page-{post["ID"]}'
            section, _ = self.upsert(Section, {'institution': site, 'slug': slug}, {'title': post['post_title'] or slug})
            page, created = self.upsert(Page, {'institution': site, 'source_id': post['ID']}, {'title': post['post_title'] or slug, 'slug': slug,
                'summary': post['post_excerpt'], 'section': section, 'status': 'published', 'published_at': post_date(post['post_date'])})
            pages[post['ID']], sections[post['ID']] = page, section
            if created or self.update:
                editable.add(page.pk)
        attachments = {}
        for post in posts.values():
            if post['post_type'] == 'attachment':
                relative = meta.get(post['ID'], {}).get('_wp_attached_file') or relative_upload(post['guid'])
                if relative:
                    attachments[relative] = post

        document_cache = {}
        def document_for(url, label, category=None):
            relative = relative_upload(url)
            if not relative:
                return None
            # Normalize only URL encoding, never case: preserve exact filenames.
            key = hashlib.sha256(relative.encode()).hexdigest()
            if key in document_cache:
                return document_cache[key]
            attachment = attachments.get(relative, {})
            year_match = re.match(r'(\d{4})/', relative)
            document, created = self.upsert(Document, {'institution': site, 'source_key': key}, {
                'title': (label or attachment.get('post_title') or Path(relative).stem)[:500],
                'external_url': url, 'source_url': url, 'category': category, 'status': 'published',
                'published_at': post_date(attachment.get('post_date')), 'year': int(year_match[1]) if year_match else None})
            path = (uploads / relative).resolve()
            if not path.is_relative_to(uploads):
                self.report['rejected_files'].append({'source': relative, 'reason': 'Path outside uploads'})
            elif path.is_file() and not document.file:
                try:
                    with path.open('rb') as stream:
                        document.file = File(stream, name=path.name)
                        document.save()
                        self.saved_files.append((document.file.storage, document.file.name))
                except ValidationError as error:
                    document.file = ''
                    self.report['rejected_files'].append({'source': relative, 'reason': str(error)})
            elif not path.is_file():
                self.report['missing_files'].append(relative)
            document_cache[key] = document
            fill_title_metadata(document)
            return document

        # Link documents to every page that references them, reusing the same file record.
        for post in public:
            page = pages[post['ID']]
            links = Links(post['post_content']).links
            file_links = [(url, label) for url, label in links if relative_upload(url)]
            category = None
            if file_links:
                category, _ = self.upsert(Category, {'institution': site, 'slug': page.slug}, {'title': page.title[:250]})
            replacements = {}
            for position, (url, label) in enumerate(file_links):
                document = document_for(url, label, category)
                PageDocument.objects.get_or_create(page=page, document=document, defaults={'position': position})
                replacements[url] = reverse('documents:download', kwargs={'site_slug': site.slug, 'pk': document.pk}) if document.file else document.external_url
            if page.pk in editable:
                body = re.sub(r'<(script|style|iframe)\b[^>]*>.*?</\1>', '', post['post_content'], flags=re.S|re.I)
                body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
                source_hosts = {urlparse(p['guid']).hostname for p in public}
                source_hosts |= {h[4:] if h.startswith('www.') else 'www.' + h for h in list(source_hosts) if h}
                by_slug = {p.slug: p for p in pages.values()}
                def rewrite(match):
                    url = html.unescape(match[2])
                    parsed = urlparse(url)
                    if url in replacements:
                        url = replacements[url]
                    elif parsed.hostname in source_hosts and parsed.path.strip('/') in by_slug:
                        url = '#/' + parsed.path.strip('/')
                    elif url.startswith('#'):
                        return ''
                    return 'href="' + html.escape(url, quote=True) + '"'
                page.body = re.sub(r'href\s*=\s*([\'"])(.*?)\1', rewrite, body, flags=re.I)
                page.save()

        # Preserve public attachments even if no current page links to them.
        for relative, post in attachments.items():
            if Path(relative).suffix.lower() in ('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.odt', '.ods'):
                document_for(post['guid'], post['post_title'])

        taxonomies = {t['term_taxonomy_id']: t for t in tables['term_taxonomy']}
        terms = {t['term_id']: t for t in tables['terms']}
        menus = {}
        for taxonomy in taxonomies.values():
            if taxonomy['taxonomy'] == 'nav_menu':
                term = terms[taxonomy['term_id']]
                menu, _ = self.upsert(Menu, {'institution': site, 'slug': term['slug']}, {'title': term['name']})
                menus[taxonomy['term_taxonomy_id']] = menu
        memberships = {r['object_id']: menus[r['term_taxonomy_id']] for r in tables['term_relationships'] if r['term_taxonomy_id'] in menus}
        items = {}
        nav_posts = [p for p in posts.values() if p['post_type'] == 'nav_menu_item' and p['post_status'] == 'publish']
        for post in nav_posts:
            menu = memberships.get(post['ID'])
            if not menu:
                continue
            info = meta.get(post['ID'], {})
            page = pages.get(int(info.get('_menu_item_object_id', '0'))) if info.get('_menu_item_object') == 'page' else None
            url = info.get('_menu_item_url', '')
            if url == '#':
                url = ''
            elif url and not urlparse(url).path.strip('/'):
                url = '#/'
            item, _ = self.upsert(MenuItem, {'menu': menu, 'source_id': post['ID']}, {'label': post['post_title'] or (page.title if page else post['post_name']),
                'page': page, 'url': '' if page else url, 'position': max(0, post['menu_order'])})
            items[post['ID']] = item
        for post in nav_posts:
            item = items.get(post['ID'])
            parent = items.get(int(meta.get(post['ID'], {}).get('_menu_item_menu_item_parent', '0')))
            if item and parent and item.menu_id == parent.menu_id and (self.update or not item.parent_id):
                item.parent = parent
                item.save()
                if item.page_id and parent.page_id and item.page.section_id != parent.page.section_id:
                    section = item.page.section
                    if section and (self.update or not section.parent_id):
                        section.parent = parent.page.section
                        section.save()
        if options['monitor_menu_id']:
            root = items.get(options['monitor_menu_id'])
            if not root:
                raise CommandError('The selected monitor menu item is not present in the SQL.')
            for item in root.children.select_related('page'):
                if not item.page:
                    continue
                register, _ = self.upsert(Register, {'institution': site, 'slug': item.page.slug}, {'title': item.label, 'position': item.position, 'source_page': item.page})
                for document in item.page.documents.all():
                    entry, _ = self.upsert(Entry, {'register': register, 'document': document}, {'title': document.title, 'status': 'published', 'published_at': document.published_at})
                    changed = False
                    for field in ('number', 'issued_on'):
                        if not getattr(entry, field) and getattr(document, field):
                            setattr(entry, field, getattr(document, field))
                            changed = True
                    if changed:
                        entry.save()
        if options['navigation']:
            self.import_navigation(site, options['navigation'])
        elif not Menu.objects.filter(institution=site, is_primary=True).exists() and menus:
            primary = max(menus.values(), key=lambda menu: menu.items.count())
            primary.is_primary = True
            primary.save()
        self.report.update(site=site.slug, pages=site.pages.count(), documents=site.documents.count(), local_files=site.documents.exclude(file='').count(),
            menus=site.menus.count(), registers=site.registers.count(), entries=Entry.objects.filter(register__institution=site).count())

    def import_navigation(self, site, path):
        data = json.loads(Path(path).read_text(encoding='utf-8-sig'))
        menu, created = Menu.objects.get_or_create(institution=site, slug=data['slug'], defaults={'title': data['title'], 'is_primary': True})
        if not created:
            return  # Never overwrite an administrator's menu when repeating the import.
        Menu.objects.filter(institution=site).exclude(pk=menu.pk).update(is_primary=False)
        def create_nodes(nodes, parent=None):
            for position, node in enumerate(nodes):
                href = node.get('href', '')
                page = Page.objects.filter(institution=site, slug=href.removeprefix('#/')).first() if href.startswith('#/') else None
                item = MenuItem.objects.create(menu=menu, parent=parent, label=node['label'], page=page, url='' if page else href, position=position)
                create_nodes(node.get('children', []), item)
        create_nodes(data['items'])
