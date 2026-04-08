from django.db import models


class AISettings(models.Model):
    id = models.IntegerField(primary_key=True, default=1)
    enabled = models.BooleanField(default=False)
    provider = models.CharField(
        max_length=20,
        default='openai',
        choices=[('openai', 'OpenAI'), ('groq', 'Groq'), ('gemini', 'Gemini')],
    )
    api_key = models.CharField(max_length=500, default='', blank=True)
    model = models.CharField(max_length=100, default='gpt-4o-mini')
    system_prompt = models.TextField(
        default='Eres la asistente virtual de Clemencia Brand, una tienda de ropa femenina. '
                'Responde de forma amable, breve y profesional. Ayuda con consultas sobre productos, '
                'precios, horarios y pedidos. Si no sabes algo, indica que un asesor se comunicara pronto. '
                'Responde en espanol.'
    )
    max_tokens = models.IntegerField(default=300)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_settings'
