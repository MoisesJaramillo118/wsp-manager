from urllib.parse import urlsplit

from django.conf import settings


def get_public_base_url():
    webhook_url = (settings.WEBHOOK_URL or '').strip()
    if not webhook_url:
        return ''

    parts = urlsplit(webhook_url)
    if not parts.scheme or not parts.netloc:
        return ''

    return f'{parts.scheme}://{parts.netloc}'


def build_upload_url(filename):
    base_url = get_public_base_url()
    if not base_url:
        return ''
    return f'{base_url}{settings.MEDIA_URL}{filename}'
