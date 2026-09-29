import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a local development admin using credentials from backend/.env.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default=os.getenv('DJANGO_ADMIN_USERNAME'))

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Use createsuperuser in production.')
        password = os.getenv('DJANGO_ADMIN_PASSWORD')
        if not options['username'] or not password:
            raise CommandError('Set DJANGO_ADMIN_USERNAME and DJANGO_ADMIN_PASSWORD in backend/.env.')
        user_model = get_user_model()
        if user_model.objects.filter(username=options['username']).exists():
            self.stdout.write('Account already exists; no password was changed.')
            return
        user_model.objects.create_superuser(username=options['username'], password=password, email='')
        self.stdout.write('Local admin created using environment credentials.')
