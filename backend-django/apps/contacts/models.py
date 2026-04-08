from django.db import models


class ContactGroup(models.Model):
    nombre = models.CharField(max_length=200, unique=True)
    color = models.CharField(max_length=20, default='#6b7280')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_groups'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Contact(models.Model):
    nombre = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20, unique=True)
    grupo = models.ForeignKey(
        ContactGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='grupo_id',
        related_name='contacts',
    )
    notas = models.TextField(default='', blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contacts'
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} ({self.telefono})'
