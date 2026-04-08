from django.db import models


class AlertasConfig(models.Model):
    id = models.IntegerField(primary_key=True, default=1)
    minutos_sin_responder = models.IntegerField(default=15)
    activo = models.BooleanField(default=True)
    notificar_admin = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alertas_config'
