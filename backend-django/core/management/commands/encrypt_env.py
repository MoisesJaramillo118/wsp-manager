from pathlib import Path

from cryptography.fernet import Fernet
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Encrypt a .env file into a .env.enc file using Fernet.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--input',
            default='.env',
            help='Path to the plaintext .env file.',
        )
        parser.add_argument(
            '--output',
            default='.env.enc',
            help='Path to the encrypted .env.enc file.',
        )
        parser.add_argument(
            '--key',
            default='',
            help='Existing Fernet key. If omitted, a new key will be generated.',
        )

    def handle(self, *args, **options):
        input_path = Path(options['input']).expanduser().resolve()
        output_path = Path(options['output']).expanduser().resolve()

        if not input_path.exists():
            raise CommandError(f'No existe el archivo: {input_path}')

        raw_key = (options.get('key') or '').strip()
        key = raw_key or Fernet.generate_key().decode()
        fernet = Fernet(key.encode())

        encrypted = fernet.encrypt(input_path.read_bytes())
        output_path.write_bytes(encrypted)

        self.stdout.write(self.style.SUCCESS(f'Archivo cifrado: {output_path}'))
        if not raw_key:
            self.stdout.write('')
            self.stdout.write('Guarda esta clave en una variable segura:')
            self.stdout.write(f'ENV_MASTER_KEY={key}')
