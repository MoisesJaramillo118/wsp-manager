from django.http import HttpResponseNotFound
from django.urls import resolve, Resolver404


class SlashMiddleware:
    """If a URL without trailing slash 404s, try with trailing slash."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code == 404 and not request.path.endswith('/'):
            try:
                resolve(request.path + '/')
                request.path_info = request.path + '/'
                response = self.get_response(request)
            except Resolver404:
                pass
        return response
