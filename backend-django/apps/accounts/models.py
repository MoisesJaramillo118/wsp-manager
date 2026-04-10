from django.db import models


class Advisor(models.Model):
    nombre = models.CharField(max_length=200)
    email = models.EmailField(unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255, default='', blank=True)
    rol = models.CharField(
        max_length=20,
        choices=[('admin', 'Admin'), ('asesor', 'Asesor')],
        default='asesor',
    )
    color = models.CharField(max_length=20, default='#ec4899')
    especialidad = models.CharField(max_length=200, default='', blank=True)
    local_tienda = models.CharField(max_length=200, default='', blank=True)
    max_chats = models.IntegerField(default=10)
    activo = models.BooleanField(default=True)
    en_turno = models.BooleanField(default=False)
    ultimo_check_in = models.DateTimeField(null=True, blank=True)
    ultimo_check_out = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advisors'
        ordering = ['nombre']

    # Required by DRF authentication
    is_authenticated = True
    is_active = True

    def __str__(self):
        return self.nombre


class AdvisorTurno(models.Model):
    advisor = models.ForeignKey(Advisor, on_delete=models.CASCADE, related_name='turnos')
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    duracion_minutos = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advisor_turnos'
        ordering = ['-check_in']
