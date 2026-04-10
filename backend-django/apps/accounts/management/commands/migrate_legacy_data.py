"""
Migrate data from the old Express.js SQLite database to the new Django SQLite database.
Preserves all IDs and relationships.
"""
import sqlite3
import logging
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import connection

logger = logging.getLogger(__name__)

OLD_DB_PATH = '/home/ec2-user/wsp-manager-prod/backend/data/whatsapp.db'


class Command(BaseCommand):
    help = 'Migrate legacy data from Express.js SQLite to Django SQLite'

    def add_arguments(self, parser):
        parser.add_argument('--old-db', type=str, default=OLD_DB_PATH, help='Path to old database')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without actually doing it')

    def handle(self, *args, **options):
        old_db_path = options['old_db']
        dry_run = options['dry_run']

        if not Path(old_db_path).exists():
            self.stderr.write(f'Old database not found: {old_db_path}')
            return

        self.stdout.write(f'Opening old database: {old_db_path}')
        old_conn = sqlite3.connect(old_db_path)
        old_conn.row_factory = sqlite3.Row
        old_cur = old_conn.cursor()

        tables = [
            ('advisors', self._migrate_advisors),
            ('contact_groups', self._migrate_groups),
            ('contacts', self._migrate_contacts),
            ('conversations', self._migrate_conversations),
            ('chats', self._migrate_chats),
            ('templates', self._migrate_templates),
            ('messages', self._migrate_messages),
            ('catalogs', self._migrate_catalogs),
            ('ai_settings', self._migrate_ai_settings),
            ('tags', self._migrate_tags),
            ('conversation_tags', self._migrate_conversation_tags),
            ('contact_tags', self._migrate_contact_tags),
            ('internal_notes', self._migrate_internal_notes),
            ('reminders', self._migrate_reminders),
            ('ventas_cerradas', self._migrate_ventas),
            ('alertas_config', self._migrate_alertas_config),
            ('conversation_origen', self._migrate_origen),
        ]

        for table_name, migrate_fn in tables:
            try:
                old_cur.execute(f'SELECT COUNT(*) FROM {table_name}')
                count = old_cur.fetchone()[0]
                self.stdout.write(f'  {table_name}: {count} rows')
                if not dry_run and count > 0:
                    migrate_fn(old_cur)
                    self.stdout.write(self.style.SUCCESS(f'    -> Migrated {table_name}'))
            except sqlite3.OperationalError as e:
                self.stdout.write(self.style.WARNING(f'  {table_name}: table not found ({e})'))

        old_conn.close()

        if not dry_run:
            self._reset_sequences()
            self.stdout.write(self.style.SUCCESS('\nMigration complete!'))
        else:
            self.stdout.write('\nDry run complete. No data was migrated.')

    def _to_dicts(self, cursor):
        """Convert sqlite3.Row results to list of dicts with .get() support."""
        cols = [desc[0] for desc in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def _exec_many(self, sql, rows):
        with connection.cursor() as cur:
            for row in rows:
                try:
                    cur.execute(sql, row)
                except Exception as e:
                    logger.warning(f'Row insert failed: {e}')

    def _migrate_advisors(self, old_cur):
        old_cur.execute('SELECT * FROM advisors')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO advisors (id, nombre, email, password_hash, rol, color, especialidad, local_tienda, max_chats, activo, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r['nombre'], r.get('email'), r.get('password_hash', ''),
             r.get('rol', 'asesor'), r.get('color', '#ec4899'),
             r.get('especialidad', ''), r.get('local_tienda', ''),
             r.get('max_chats', 10), r.get('activo', 1), r['created_at'])
            for r in rows
        ])

    def _migrate_groups(self, old_cur):
        old_cur.execute('SELECT * FROM contact_groups')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO contact_groups (id, nombre, color, created_at) VALUES (%s, %s, %s, %s)'
        self._exec_many(sql, [(r['id'], r['nombre'], r['color'], r['created_at']) for r in rows])

    def _migrate_contacts(self, old_cur):
        old_cur.execute('SELECT * FROM contacts')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO contacts (id, nombre, telefono, grupo_id, notas, activo, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)'
        self._exec_many(sql, [
            (r['id'], r['nombre'], r['telefono'], r['grupo_id'],
             r.get('notas', ''), r.get('activo', 1), r['created_at'])
            for r in rows
        ])

    def _migrate_conversations(self, old_cur):
        old_cur.execute('SELECT * FROM conversations')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO conversations (id, remote_phone, remote_name, status, outcome, advisor_id, needs_human, first_response_seconds, origen, last_message_at, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r['remote_phone'], r.get('remote_name', ''),
             r.get('status', 'sin_responder'), r.get('outcome', 'pendiente'),
             r.get('advisor_id'), bool(r.get('needs_human', 0)),
             r.get('first_response_seconds'), r.get('origen', 'directo'),
             r.get('last_message_at', r['created_at']), r['created_at'])
            for r in rows
        ])

    def _migrate_chats(self, old_cur):
        old_cur.execute('SELECT * FROM chats')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO chats (id, remote_phone, remote_name, message, direction, is_ai_response, sent_via, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r['remote_phone'], r.get('remote_name', ''), r['message'],
             r['direction'], bool(r.get('is_ai_response', 0)),
             r.get('sent_via', 'evolution'), r['created_at'])
            for r in rows
        ])

    def _migrate_templates(self, old_cur):
        old_cur.execute('SELECT * FROM templates')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO templates (id, nombre, categoria, contenido, activo, created_at) VALUES (%s, %s, %s, %s, %s, %s)'
        self._exec_many(sql, [
            (r['id'], r['nombre'], r['categoria'], r['contenido'],
             r.get('activo', 1), r['created_at'])
            for r in rows
        ])

    def _migrate_messages(self, old_cur):
        old_cur.execute('SELECT * FROM messages')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO messages (id, contact_id, template_id, contenido, tipo, estado, scheduled_at, sent_at, batch_id, error_msg, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r.get('contact_id'), r.get('template_id'), r['contenido'],
             r['tipo'], r['estado'], r.get('scheduled_at'), r.get('sent_at'),
             r.get('batch_id', ''), r.get('error_msg', ''), r['created_at'])
            for r in rows
        ])

    def _migrate_catalogs(self, old_cur):
        old_cur.execute('SELECT * FROM catalogs')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO catalogs (id, nombre, categoria, descripcion, keywords, filename, filepath, filesize, activo, downloads, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r['nombre'], r.get('categoria', 'general'),
             r.get('descripcion', ''), r.get('keywords', ''),
             r['filename'], r['filepath'], r.get('filesize', 0),
             r.get('activo', 1), r.get('downloads', 0), r['created_at'])
            for r in rows
        ])

    def _migrate_ai_settings(self, old_cur):
        old_cur.execute('SELECT * FROM ai_settings WHERE id = 1')
        rows = self._to_dicts(old_cur)
        r = rows[0] if rows else None
        if r:
            with connection.cursor() as cur:
                cur.execute(
                    '''INSERT OR REPLACE INTO ai_settings (id, enabled, provider, api_key, model, system_prompt, max_tokens, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
                    (1, bool(r.get('enabled', 0)), r.get('provider', 'openai'),
                     r.get('api_key', ''), r.get('model', 'gpt-4o-mini'),
                     r.get('system_prompt', ''), r.get('max_tokens', 300),
                     r.get('updated_at', ''))
                )

    def _migrate_tags(self, old_cur):
        old_cur.execute('SELECT * FROM tags')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO tags (id, nombre, color, created_at) VALUES (%s, %s, %s, %s)'
        self._exec_many(sql, [(r['id'], r['nombre'], r['color'], r['created_at']) for r in rows])

    def _migrate_conversation_tags(self, old_cur):
        old_cur.execute('SELECT * FROM conversation_tags')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO conversation_tags (id, conversation_phone, tag_id) VALUES (%s, %s, %s)'
        self._exec_many(sql, [(i+1, r['conversation_phone'], r['tag_id']) for i, r in enumerate(rows)])

    def _migrate_contact_tags(self, old_cur):
        old_cur.execute('SELECT * FROM contact_tags')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO contact_tags (id, contact_id, tag_id) VALUES (%s, %s, %s)'
        self._exec_many(sql, [(i+1, r['contact_id'], r['tag_id']) for i, r in enumerate(rows)])

    def _migrate_internal_notes(self, old_cur):
        old_cur.execute('SELECT * FROM internal_notes')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO internal_notes (id, remote_phone, advisor_id, advisor_nombre, note, created_at) VALUES (%s, %s, %s, %s, %s, %s)'
        self._exec_many(sql, [
            (r['id'], r['remote_phone'], r.get('advisor_id'),
             r.get('advisor_nombre', ''), r['note'], r['created_at'])
            for r in rows
        ])

    def _migrate_reminders(self, old_cur):
        old_cur.execute('SELECT * FROM reminders')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO reminders (id, remote_phone, advisor_id, note, remind_at, status, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)'
        self._exec_many(sql, [
            (r['id'], r['remote_phone'], r.get('advisor_id'), r['note'],
             r['remind_at'], r.get('status', 'pending'), r['created_at'])
            for r in rows
        ])

    def _migrate_ventas(self, old_cur):
        old_cur.execute('SELECT * FROM ventas_cerradas')
        rows = self._to_dicts(old_cur)
        sql = '''INSERT OR IGNORE INTO ventas_cerradas (id, remote_phone, remote_name, advisor_id, advisor_nombre, monto, metodo_pago, productos_descripcion, comprobante_url, notas, origen, created_at)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        self._exec_many(sql, [
            (r['id'], r['remote_phone'], r.get('remote_name', ''),
             r.get('advisor_id'), r.get('advisor_nombre', ''),
             r.get('monto', 0), r.get('metodo_pago', ''),
             r.get('productos_descripcion', ''), r.get('comprobante_url', ''),
             r.get('notas', ''), r.get('origen', ''), r['created_at'])
            for r in rows
        ])

    def _migrate_alertas_config(self, old_cur):
        old_cur.execute('SELECT * FROM alertas_config WHERE id = 1')
        rows = self._to_dicts(old_cur)
        r = rows[0] if rows else None
        if r:
            with connection.cursor() as cur:
                cur.execute(
                    '''INSERT OR REPLACE INTO alertas_config (id, minutos_sin_responder, activo, notificar_admin, updated_at)
                       VALUES (%s, %s, %s, %s, %s)''',
                    (1, r.get('minutos_sin_responder', 15), bool(r.get('activo', 1)),
                     bool(r.get('notificar_admin', 1)), r.get('updated_at', ''))
                )

    def _migrate_origen(self, old_cur):
        old_cur.execute('SELECT * FROM conversation_origen')
        rows = self._to_dicts(old_cur)
        sql = 'INSERT OR IGNORE INTO conversation_origen (remote_phone, origen, detalle, detectado_at) VALUES (%s, %s, %s, %s)'
        self._exec_many(sql, [
            (r['remote_phone'], r.get('origen', 'directo'),
             r.get('detalle', ''), r.get('detectado_at', ''))
            for r in rows
        ])

    def _reset_sequences(self):
        """Reset SQLite autoincrement sequences after import."""
        tables = ['advisors', 'contact_groups', 'contacts', 'conversations', 'chats',
                  'templates', 'messages', 'catalogs', 'tags',
                  'internal_notes', 'reminders', 'ventas_cerradas']
        with connection.cursor() as cur:
            for table in tables:
                try:
                    cur.execute(f'SELECT MAX(id) FROM {table}')
                    max_id = cur.fetchone()[0]
                    if max_id:
                        cur.execute(
                            'UPDATE sqlite_sequence SET seq = %s WHERE name = %s',
                            [max_id, table]
                        )
                except Exception:
                    pass
