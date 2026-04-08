import csv
import io
from django.http import StreamingHttpResponse


class Echo:
    """An object that implements just the write method of the file interface."""
    def write(self, value):
        return value


def export_csv(filename, headers, rows):
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    response = StreamingHttpResponse(
        (writer.writerow(row) for row in [headers] + list(rows)),
        content_type='text/csv',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
