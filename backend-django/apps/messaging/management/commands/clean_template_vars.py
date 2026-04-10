import re

from django.core.management.base import BaseCommand

from apps.messaging.models import Template


class Command(BaseCommand):
    help = "Remove {{nombre}} variable references from all Template.contenido and strip extra spaces."

    def handle(self, *args, **options):
        updated = 0
        total = Template.objects.count()
        for template in Template.objects.all():
            original = template.contenido or ''
            cleaned = original.replace('{{nombre}}', '')
            # Collapse runs of 2+ spaces into one
            cleaned = re.sub(r' {2,}', ' ', cleaned)
            # Clean up orphan spaces before punctuation
            cleaned = re.sub(r' +([,.!?;:])', r'\1', cleaned)
            # Strip extra whitespace on each line, and the whole string
            cleaned = '\n'.join(line.strip() for line in cleaned.splitlines())
            cleaned = cleaned.strip()

            if cleaned != original:
                template.contenido = cleaned
                template.save(update_fields=['contenido'])
                updated += 1
                self.stdout.write(f"Updated template #{template.pk} - {template.nombre}")

        self.stdout.write(self.style.SUCCESS(
            f"Done. Updated {updated}/{total} templates."
        ))
