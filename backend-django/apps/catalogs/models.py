from django.db import models


class Catalog(models.Model):
    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=50, default='general')
    descripcion = models.TextField(default='', blank=True)
    keywords = models.TextField(default='', blank=True)
    filename = models.CharField(max_length=255)
    filepath = models.CharField(max_length=255)
    filesize = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    downloads = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'catalogs'
        ordering = ['-created_at']

    def __str__(self):
        return self.nombre
