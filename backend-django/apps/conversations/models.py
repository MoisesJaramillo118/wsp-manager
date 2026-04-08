from django.db import models


class Conversation(models.Model):
    STATUS_CHOICES = [
        ('sin_responder', 'Sin responder'),
        ('ia_atendido', 'IA Atendido'),
        ('necesita_asesor', 'Necesita Asesor'),
        ('asignado', 'Asignado'),
        ('resuelto', 'Resuelto'),
    ]
    OUTCOME_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('venta_cerrada', 'Venta cerrada'),
        ('venta_perdida', 'Venta perdida'),
    ]

    remote_phone = models.CharField(max_length=20, unique=True, db_index=True)
    remote_name = models.CharField(max_length=200, default='', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sin_responder', db_index=True)
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default='pendiente')
    advisor = models.ForeignKey(
        'accounts.Advisor', null=True, blank=True,
        on_delete=models.SET_NULL, db_column='advisor_id',
    )
    needs_human = models.BooleanField(default=False)
    first_response_seconds = models.IntegerField(null=True, blank=True)
    origen = models.CharField(max_length=50, default='directo', blank=True)
    last_message_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversations'

    def __str__(self):
        return f'{self.remote_phone} ({self.status})'


class Chat(models.Model):
    remote_phone = models.CharField(max_length=20, db_index=True)
    remote_name = models.CharField(max_length=200, default='', blank=True)
    message = models.TextField()
    direction = models.CharField(
        max_length=10,
        choices=[('incoming', 'Incoming'), ('outgoing', 'Outgoing')],
    )
    is_ai_response = models.BooleanField(default=False)
    sent_via = models.CharField(max_length=20, default='evolution', blank=True)
    delivery_status = models.CharField(max_length=20, default='sent', blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'chats'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.remote_phone} [{self.direction}] {self.message[:40]}'


class InternalNote(models.Model):
    remote_phone = models.CharField(max_length=20, db_index=True)
    advisor = models.ForeignKey(
        'accounts.Advisor', null=True, blank=True,
        on_delete=models.SET_NULL, db_column='advisor_id',
    )
    advisor_nombre = models.CharField(max_length=200, default='', blank=True)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'internal_notes'

    def __str__(self):
        return f'Note {self.pk} - {self.remote_phone}'


class ConversationOrigen(models.Model):
    remote_phone = models.CharField(max_length=20, primary_key=True)
    origen = models.CharField(max_length=50, default='directo')
    detalle = models.CharField(max_length=500, default='', blank=True)
    detectado_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversation_origen'

    def __str__(self):
        return f'{self.remote_phone} - {self.origen}'
