from django.db import models


class Template(models.Model):
    CATEGORIA_CHOICES = [
        ('promocion', 'Promocion'),
        ('nueva_coleccion', 'Nueva Coleccion'),
        ('estado_pedido', 'Estado de Pedido'),
        ('bienvenida', 'Bienvenida'),
        ('descuento', 'Descuento'),
        ('personalizado', 'Personalizado'),
    ]
    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=30, choices=CATEGORIA_CHOICES)
    contenido = models.TextField()
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'templates'
        ordering = ['-created_at']

    def __str__(self):
        return self.nombre


class Message(models.Model):
    TIPO_CHOICES = [
        ('individual', 'Individual'),
        ('masivo', 'Masivo'),
    ]
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('enviado', 'Enviado'),
        ('fallido', 'Fallido'),
        ('programado', 'Programado'),
        ('cancelado', 'Cancelado'),
    ]
    contact_id = models.IntegerField(null=True, blank=True)
    template_id = models.IntegerField(null=True, blank=True)
    contenido = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    batch_id = models.CharField(max_length=36, default='', blank=True, db_index=True)
    error_msg = models.TextField(default='', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']

    def __str__(self):
        return f'Message {self.pk} - {self.estado}'


class QuickReply(models.Model):
    titulo = models.CharField(max_length=200)
    categoria = models.CharField(max_length=50, default='general')
    contenido = models.TextField()
    advisor_id = models.IntegerField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quick_replies'
        ordering = ['-created_at']

    def __str__(self):
        return self.titulo
