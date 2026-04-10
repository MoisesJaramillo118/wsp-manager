from django.db import models


class VentaCerrada(models.Model):
    remote_phone = models.CharField(max_length=20, db_index=True)
    remote_name = models.CharField(max_length=200, default='', blank=True)
    advisor_id = models.IntegerField(null=True, blank=True)
    advisor_nombre = models.CharField(max_length=200, default='', blank=True)
    monto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    metodo_pago = models.CharField(max_length=50, default='', blank=True)
    productos_descripcion = models.TextField(default='', blank=True)
    comprobante_url = models.CharField(max_length=500, default='', blank=True)
    notas = models.TextField(default='', blank=True)
    origen = models.CharField(max_length=50, default='', blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ventas_cerradas'


class VentaItem(models.Model):
    venta = models.ForeignKey(VentaCerrada, on_delete=models.CASCADE, related_name='items')
    descripcion = models.CharField(max_length=300)
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'venta_items'
        ordering = ['id']
